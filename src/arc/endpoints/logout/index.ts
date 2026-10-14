import { Hono } from 'hono';
import { authMiddleware } from '../../../middleware/auth.ts';
import { execute } from '../../../utils/d1.ts';
import { nowUtc } from '../../../utils/time.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import type { Bindings } from '../../../types/env.ts';

export const logoutRoute = new Hono<{ Bindings: Bindings }>();

logoutRoute.post('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const { DB_SESSIONS, DB_AUDIT } = c.env;

  if (!DB_SESSIONS) {
    return sendError(c, 'Database configuration error', 500, 'SERVER_ERROR');
  }

  const now = nowUtc();
  await execute(
    DB_SESSIONS,
    'UPDATE sessions SET revoked_at = ?, revoke_reason = ?, updated_at = ? WHERE id = ?',
    [now, 'user_logout', now, user.sid]
  );

  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'unknown';

  await logAuditEvent(DB_AUDIT, {
    actorId: user.sub,
    targetId: user.sid,
    eventType: 'SESSION_REVOKED',
    ipAddress: ip,
    userAgent,
    metadata: { reason: 'user_logout' },
  });

  return sendSuccess(c, {
    message: 'Logged out successfully',
    sessionId: user.sid,
  });
});
