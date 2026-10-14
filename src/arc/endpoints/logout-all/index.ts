import { Hono } from 'hono';
import { authMiddleware } from '../../../middleware/auth.ts';
import { execute } from '../../../utils/d1.ts';
import { nowUtc } from '../../../utils/time.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import type { Bindings } from '../../../types/env.ts';

export const logoutAllRoute = new Hono<{ Bindings: Bindings }>();

logoutAllRoute.post('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const { DB_SESSIONS, DB_ACCOUNTS, DB_AUDIT } = c.env;

  if (!DB_SESSIONS || !DB_ACCOUNTS) {
    return sendError(c, 'Database configuration error', 500, 'SERVER_ERROR');
  }

  const now = nowUtc();

  // Revoke all active sessions
  await execute(
    DB_SESSIONS,
    'UPDATE sessions SET revoked_at = ?, revoke_reason = ?, updated_at = ? WHERE account_id = ? AND revoked_at IS NULL',
    [now, 'logout_all_devices', now, user.sub]
  );

  // Invalidate any active access tokens by bumping auth_version
  await execute(
    DB_ACCOUNTS,
    'UPDATE accounts SET auth_version = auth_version + 1, updated_at = ? WHERE id = ?',
    [now, user.sub]
  );

  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'unknown';

  await logAuditEvent(DB_AUDIT, {
    actorId: user.sub,
    targetId: user.sub,
    eventType: 'ALL_SESSIONS_REVOKED',
    ipAddress: ip,
    userAgent,
    metadata: { reason: 'logout_all_devices' },
  });

  return sendSuccess(c, {
    message: 'All active sessions have been revoked successfully',
    accountId: user.sub,
  });
});
