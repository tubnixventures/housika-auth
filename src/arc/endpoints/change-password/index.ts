import { Hono } from 'hono';
import { ChangePasswordSchema } from './schema.ts';
import { authMiddleware } from '../../../middleware/auth.ts';
import { queryOne, execute } from '../../../utils/d1.ts';
import { validatePasswordStrength, verifyPassword, hashPassword } from '../../../utils/password.ts';
import { nowUtc } from '../../../utils/time.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import { sendZeptoEmail } from '../../../utils/zeptomail.ts';
import type { Bindings } from '../../../types/env.ts';

export const changePasswordRoute = new Hono<{ Bindings: Bindings }>();

changePasswordRoute.post('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => null);
  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return sendError(c, 'Invalid password change payload', 400, 'VALIDATION_ERROR');
  }

  const { currentPassword, newPassword, revokeOtherSessions } = parsed.data;
  const pwCheck = validatePasswordStrength(newPassword);
  if (!pwCheck.valid) {
    return sendError(c, pwCheck.reason || 'Weak password', 400, 'WEAK_PASSWORD');
  }

  const { DB_ACCOUNTS, DB_SESSIONS, DB_AUDIT } = c.env;
  if (!DB_ACCOUNTS || !DB_SESSIONS) {
    return sendError(c, 'Service configuration error', 500, 'SERVER_ERROR');
  }

  const account = await queryOne<{ id: string; email: string; password_hash: string }>(
    DB_ACCOUNTS,
    'SELECT id, email, password_hash FROM accounts WHERE id = ?',
    [user.sub]
  );
  if (!account) {
    return sendError(c, 'Account not found', 404, 'ACCOUNT_NOT_FOUND');
  }

  const isCurrentValid = await verifyPassword(currentPassword, account.password_hash);
  if (!isCurrentValid) {
    return sendError(c, 'Incorrect current password', 401, 'INVALID_CURRENT_PASSWORD');
  }

  const now = nowUtc();
  const newHash = await hashPassword(newPassword, c.env.BCRYPT_ROUNDS);

  // Update password and increment auth_version
  await execute(
    DB_ACCOUNTS,
    'UPDATE accounts SET password_hash = ?, password_changed_at = ?, auth_version = auth_version + 1, updated_at = ? WHERE id = ?',
    [newHash, now, now, account.id]
  );

  // Revoke other sessions if requested
  if (revokeOtherSessions) {
    await execute(
      DB_SESSIONS,
      'UPDATE sessions SET revoked_at = ?, revoke_reason = ?, updated_at = ? WHERE account_id = ? AND id != ? AND revoked_at IS NULL',
      [now, 'password_change_revoke_others', now, account.id, user.sid]
    );
  }

  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  await logAuditEvent(DB_AUDIT, {
    actorId: account.id,
    targetId: account.id,
    eventType: 'PASSWORD_CHANGED',
    ipAddress: ip,
    metadata: { revokeOtherSessions },
  });

  c.executionCtx?.waitUntil?.(
    sendZeptoEmail({
      toEmail: account.email,
      subject: 'Housika Security Alert - Password Changed',
      htmlContent: '<p>Your Housika account password has been updated. If you did not authorize this, please contact support immediately.</p>',
      apiKey: c.env.ZEPTOMAIL_API_KEY,
      fromAddress: c.env.ZEPTOMAIL_FROM_ADDRESS,
      fromName: c.env.ZEPTOMAIL_FROM_NAME,
    })
  );

  return sendSuccess(c, {
    message: 'Password changed successfully',
  });
});
