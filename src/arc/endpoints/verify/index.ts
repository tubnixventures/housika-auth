import { Hono } from 'hono';
import { VerifySchema } from './schema.ts';
import { validateAndConsumeChallenge } from './service.ts';
import { execute, queryOne } from '../../../utils/d1.ts';
import { nowUtc } from '../../../utils/time.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import { normalizeEmail, normalizePhone, isEmail } from '../../../utils/normalization.ts';
import { verifyAccessToken } from '../../../utils/jwt.ts';
import { getRequiredSecret } from '../../../utils/secrets.ts';
import { rateLimit } from '../../../middleware/rate-limit.ts';
import type { Bindings } from '../../../types/env.ts';

export const verifyRoute = new Hono<{ Bindings: Bindings }>();

// Priority 3: 5 OTP verification attempts per 60s
verifyRoute.post('/', rateLimit(5, 60, 'verify-otp'), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) return sendError(c, 'Invalid verification request', 422, 'VALIDATION_ERROR');

  const { otp, purpose, identifier } = parsed.data;
  const { DB_ACCOUNTS, DB_CHALLENGES, DB_AUDIT } = c.env;
  if (!DB_ACCOUNTS || !DB_CHALLENGES) return sendError(c, 'Service configuration error', 500, 'SERVER_ERROR');

  let accountId: string | undefined;
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (c.env?.JWT_ACCESS_SECRET) {
      try {
        const secret = getRequiredSecret(c.env, 'JWT_ACCESS_SECRET');
        const payload = await verifyAccessToken(token, secret);
        accountId = payload.sub;
      } catch { /* Fallback to identifier */ }
    }
  }

  if (!accountId && identifier) {
    const norm = isEmail(identifier) ? normalizeEmail(identifier) : normalizePhone(identifier);
    const col = isEmail(identifier) ? 'email_normalized' : 'phone_normalized';
    const acc = await queryOne<{ id: string }>(DB_ACCOUNTS, `SELECT id FROM accounts WHERE ${col} = ?`, [norm]);
    if (acc) accountId = acc.id;
  }

  if (!accountId) return sendError(c, 'Cannot determine account to verify', 400, 'ACCOUNT_REQUIRED');

  const hmacSecret = getRequiredSecret(c.env, 'CHALLENGE_HMAC_SECRET');
  const result = await validateAndConsumeChallenge(DB_CHALLENGES, accountId, purpose, otp, hmacSecret);
  if (!result.success) return sendError(c, result.error || 'Verification failed', 400, 'VERIFICATION_FAILED');

  const now = nowUtc();
  const updateCol = purpose === 'phone_verification' ? 'phone_verified_at' : 'email_verified_at';
  await execute(
    DB_ACCOUNTS,
    `UPDATE accounts SET ${updateCol} = ?, status = 'active', updated_at = ? WHERE id = ?`,
    [now, now, accountId]
  );

  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  await logAuditEvent(DB_AUDIT, {
    actorId: accountId, targetId: accountId, eventType: 'ACCOUNT_VERIFIED', ipAddress: ip, metadata: { purpose },
  });

  return sendSuccess(c, { message: 'Verification completed successfully', status: 'active', verified: true });
});
