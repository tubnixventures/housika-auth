import { Hono } from 'hono';
import { RefreshTokenSchema } from './schema.ts';
import { processTokenRotation } from './service.ts';
import { queryOne } from '../../../utils/d1.ts';
import { createAccessToken } from '../../../utils/jwt.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import type { Bindings } from '../../../types/env.ts';
import type { AccountType, Role } from '../../../types/auth.ts';

export const refreshRoute = new Hono<{ Bindings: Bindings }>();

interface AccountAuthData {
  id: string;
  country_id: string;
  account_type: AccountType;
  role: Role;
  level: number;
  company_id: string | null;
  scope_id: string | null;
  status: string;
  auth_version: number;
}

refreshRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = RefreshTokenSchema.safeParse(body);
  if (!parsed.success) {
    return sendError(c, 'Invalid refresh token payload', 400, 'VALIDATION_ERROR');
  }

  const { DB_SESSIONS, DB_ACCOUNTS, DB_AUDIT } = c.env;
  if (!DB_SESSIONS || !DB_ACCOUNTS) {
    return sendError(c, 'Service configuration error', 500, 'SERVER_ERROR');
  }

  const rotResult = await processTokenRotation(DB_SESSIONS, parsed.data.refreshToken);
  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';

  if (!rotResult.success || !rotResult.session || !rotResult.newRefreshToken) {
    await logAuditEvent(DB_AUDIT, {
      eventType: 'TOKEN_REFRESH_FAILED',
      ipAddress: ip,
      metadata: { reason: rotResult.error },
    });
    return sendError(c, rotResult.error || 'Refresh failed', 401, 'INVALID_REFRESH_TOKEN');
  }

  const account = await queryOne<AccountAuthData>(
    DB_ACCOUNTS,
    'SELECT id, country_id, account_type, role, level, company_id, scope_id, status, auth_version FROM accounts WHERE id = ?',
    [rotResult.session.account_id]
  );

  if (!account || account.status === 'suspended' || account.status === 'deactivated') {
    return sendError(c, 'Account is inactive or disabled', 403, 'ACCOUNT_DISABLED');
  }

  const jwtSecret = c.env.JWT_ACCESS_SECRET || 'housika_default_access_secret_min16';
  const newAccessToken = await createAccessToken(
    {
      accountId: account.id,
      sessionId: rotResult.session.id,
      countryId: account.country_id,
      accountType: account.account_type,
      role: account.role,
      level: account.level,
      companyId: account.company_id,
      scopeId: account.scope_id,
      authVersion: account.auth_version,
    },
    jwtSecret
  );

  await logAuditEvent(DB_AUDIT, {
    actorId: account.id,
    targetId: rotResult.session.id,
    eventType: 'TOKEN_REFRESH_SUCCESS',
    ipAddress: ip,
  });

  return sendSuccess(c, {
    tokens: {
      accessToken: newAccessToken,
      refreshToken: rotResult.newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
    },
  });
});
