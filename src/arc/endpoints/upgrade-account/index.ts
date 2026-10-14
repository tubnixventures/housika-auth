import { Hono } from 'hono';
import { UpgradeAccountSchema } from './schema.ts';
import { authMiddleware } from '../../../middleware/auth.ts';
import { queryOne, execute } from '../../../utils/d1.ts';
import { nowUtc } from '../../../utils/time.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import { ROLE_LEVELS } from '../../../types/auth.ts';
import type { Bindings } from '../../../types/env.ts';

export const upgradeAccountRoute = new Hono<{ Bindings: Bindings }>();

upgradeAccountRoute.post('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => null);
  const parsed = UpgradeAccountSchema.safeParse(body);
  if (!parsed.success) {
    return sendError(c, 'Invalid upgrade target role', 400, 'VALIDATION_ERROR');
  }

  const { DB_ACCOUNTS, DB_AUDIT } = c.env;
  if (!DB_ACCOUNTS) {
    return sendError(c, 'Database configuration error', 500, 'SERVER_ERROR');
  }

  const account = await queryOne<{
    id: string;
    account_type: string;
    role: string;
    level: number;
    status: string;
    email_verified_at: number | null;
  }>(DB_ACCOUNTS, 'SELECT id, account_type, role, level, status, email_verified_at FROM accounts WHERE id = ?', [user.sub]);

  if (!account) {
    return sendError(c, 'Account not found', 404, 'ACCOUNT_NOT_FOUND');
  }

  if (account.account_type !== 'individual') {
    return sendError(c, 'Only individual accounts can upgrade roles via this endpoint', 400, 'INVALID_ACCOUNT_TYPE');
  }

  if (!account.email_verified_at) {
    return sendError(c, 'Account verification is required before upgrading roles', 403, 'VERIFICATION_REQUIRED');
  }

  const targetRole = parsed.data.targetRole;
  const newLevel = ROLE_LEVELS[targetRole];
  const now = nowUtc();

  await execute(
    DB_ACCOUNTS,
    'UPDATE accounts SET role = ?, level = ?, auth_version = auth_version + 1, updated_at = ? WHERE id = ?',
    [targetRole, newLevel, now, account.id]
  );

  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  await logAuditEvent(DB_AUDIT, {
    actorId: account.id,
    targetId: account.id,
    eventType: 'ACCOUNT_ROLE_UPGRADED',
    ipAddress: ip,
    metadata: { previousRole: account.role, newRole: targetRole, newLevel },
  });

  return sendSuccess(c, {
    message: `Account upgraded successfully to ${targetRole}`,
    role: targetRole,
    level: newLevel,
  });
});
