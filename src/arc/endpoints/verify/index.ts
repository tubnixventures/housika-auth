import { Hono } from 'hono';
import { VerifySchema } from './schema.ts';
import { validateAndConsumeChallenge } from './service.ts';
import { execute, queryOne } from '../../../utils/d1.ts';
import { nowUtc } from '../../../utils/time.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import { normalizeEmail, normalizePhone, isEmail } from '../../../utils/normalization.ts';
import { verifyAccessToken } from '../../../utils/jwt.ts';
import type { Bindings } from '../../../types/env.ts';

export const verifyRoute = new Hono<{ Bindings: Bindings }>();

verifyRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) {
    return sendError(c, 'Invalid verification request', 422, 'VALIDATION_ERROR');
  }

  const { otp, purpose, identifier } = parsed.data;
  const { DB_ACCOUNTS, DB_CHALLENGES, DB_AUDIT } = c.env;
  if (!DB_ACCOUNTS || !DB_CHALLENGES) {
    return sendError(c, 'Service configuration error', 500, 'SERVER_ERROR');
  }

  let accountId: string | undefined;

  // Resolve accountId either from Bearer token or identifier
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const secret = c.env.JWT_ACCESS_SECRET || 'housika_default_access_secret_min16';
    try {
      const payload = await verifyAccessToken(token, secret);
      accountId = payload.sub;
    } catch {
      // Ignore token error and fallback to identifier
    }
  }

  if (!accountId && identifier) {
    const norm = isEmail(identifier) ? normalizeEmail(identifier) : normalizePhone(identifier);
    const col = isEmail(identifier) ? 'email_normalized' : 'phone_normalized';
    const acc = await queryOne<{ id: string }>(DB_ACCOUNTS, `SELECT id FROM accounts WHERE ${col} = ?`, [norm]);
    if (acc) accountId = acc.id;
  }

  if (!accountId) {
    return sendError(c, 'Cannot determine account to verify', 400, 'ACCOUNT_REQUIRED');
  }

  const hmacSecret = c.env.CHALLENGE_HMAC_SECRET || 'housika_default_hmac_secret_min16';
  const result = await validateAndConsumeChallenge(DB_CHALLENGES, accountId, purpose, otp, hmacSecret);

  if (!result.success) {
    return sendError(c, result.error || 'Verification failed', 400, 'VERIFICATION_FAILED');
  }

  const now = nowUtc();
  const updateCol = purpose === 'phone_verification' ? 'phone_verified_at' : 'email_verified_at';
  await execute(
    DB_ACCOUNTS,
    `UPDATE accounts SET ${updateCol} = ?, status = 'active', updated_at = ? WHERE id = ?`,
    [now, now, accountId]
  );

  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  await logAuditEvent(DB_AUDIT, {
    actorId: accountId,
    targetId: accountId,
    eventType: 'ACCOUNT_VERIFIED',
    ipAddress: ip,
    metadata: { purpose },
  });

  return sendSuccess(c, {
    message: 'Verification completed successfully',
    status: 'active',
    verified: true,
  });
});
