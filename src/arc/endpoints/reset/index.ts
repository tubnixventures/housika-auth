import { Hono } from 'hono';
import { ResetPasswordSchema } from './schema.ts';
import { findAccountByIdentifier } from '../login/service.ts';
import { validateAndConsumeChallenge } from '../verify/service.ts';
import { execute } from '../../../utils/d1.ts';
import { hashPassword, validatePasswordStrength } from '../../../utils/password.ts';
import { nowUtc } from '../../../utils/time.ts';
import { getRequiredSecret } from '../../../utils/secrets.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import { rateLimit } from '../../../middleware/rate-limit.ts';
import type { Bindings } from '../../../types/env.ts';

export const resetRoute = new Hono<{ Bindings: Bindings }>();

// Priority 3: 5 reset attempts per 60s
resetRoute.post('/', rateLimit(5, 60, 'reset-pw'), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = ResetPasswordSchema.safeParse(body);
  if (!parsed.success) return sendError(c, 'Validation failed', 422, 'VALIDATION_ERROR');

  const { identifier, otp, newPassword } = parsed.data;
  const pwCheck = validatePasswordStrength(newPassword);
  if (!pwCheck.valid) return sendError(c, pwCheck.reason || 'Password too weak', 400, 'WEAK_PASSWORD');

  const { DB_ACCOUNTS, DB_CHALLENGES, DB_SESSIONS, DB_AUDIT } = c.env;
  if (!DB_ACCOUNTS || !DB_CHALLENGES || !DB_SESSIONS) return sendError(c, 'Service configuration error', 500, 'SERVER_ERROR');

  const account = await findAccountByIdentifier(DB_ACCOUNTS, identifier);
  if (!account) return sendError(c, 'Invalid or expired reset code', 400, 'RESET_FAILED');

  const hmacSecret = getRequiredSecret(c.env, 'CHALLENGE_HMAC_SECRET');
  const valResult = await validateAndConsumeChallenge(DB_CHALLENGES, account.id, 'password_reset', otp, hmacSecret);
  if (!valResult.success) return sendError(c, valResult.error || 'Invalid or expired reset code', 400, 'RESET_FAILED');

  const now = nowUtc();
  const newHash = await hashPassword(newPassword, c.env.BCRYPT_ROUNDS);

  await execute(
    DB_ACCOUNTS,
    'UPDATE accounts SET password_hash = ?, password_changed_at = ?, auth_version = auth_version + 1, updated_at = ? WHERE id = ?',
    [newHash, now, now, account.id]
  );

  await execute(
    DB_SESSIONS,
    'UPDATE sessions SET revoked_at = ?, revoke_reason = ?, updated_at = ? WHERE account_id = ? AND revoked_at IS NULL',
    [now, 'password_reset', now, account.id]
  );

  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  await logAuditEvent(DB_AUDIT, {
    actorId: account.id, targetId: account.id, eventType: 'PASSWORD_RESET_SUCCESS', ipAddress: ip,
  });

  return sendSuccess(c, { message: 'Password reset successfully. Please log in with your new password.', success: true });
});
