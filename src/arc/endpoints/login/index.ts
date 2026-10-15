import { Hono } from 'hono';
import { LoginSchema } from './schema.ts';
import { findAccountByIdentifier } from './service.ts';
import { verifyPassword } from '../../../utils/password.ts';
import { createSessionAndTokens } from '../signup/auth-flow.ts';
import { getRequiredSecret } from '../../../utils/secrets.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import { rateLimit } from '../../../middleware/rate-limit.ts';
import type { Bindings } from '../../../types/env.ts';

export const loginRoute = new Hono<{ Bindings: Bindings }>();
const DUMMY_BCRYPT = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// Priority 3: Strengthened rate limiting to 5 attempts per 60s
loginRoute.post('/', rateLimit(5, 60, 'login'), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) return sendError(c, 'Invalid login credentials provided', 400, 'INVALID_CREDENTIALS');

  const { DB_ACCOUNTS, DB_SESSIONS, DB_AUDIT } = c.env;
  if (!DB_ACCOUNTS || !DB_SESSIONS) return sendError(c, 'Service configuration error', 500, 'SERVER_ERROR');

  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'unknown';

  const account = await findAccountByIdentifier(DB_ACCOUNTS, parsed.data.identifier);
  if (!account) {
    await verifyPassword(parsed.data.password, DUMMY_BCRYPT);
    await logAuditEvent(DB_AUDIT, { eventType: 'LOGIN_FAILURE', ipAddress: ip, userAgent, metadata: { reason: 'invalid_credentials' } });
    return sendError(c, 'Invalid email/phone or password', 401, 'INVALID_CREDENTIALS');
  }

  if (account.status === 'suspended' || account.status === 'deactivated') {
    await logAuditEvent(DB_AUDIT, { actorId: account.id, eventType: 'LOGIN_BLOCKED', ipAddress: ip, userAgent, metadata: { status: account.status } });
    return sendError(c, 'This account is currently suspended or disabled', 403, 'ACCOUNT_DISABLED');
  }

  const validPassword = await verifyPassword(parsed.data.password, account.password_hash);
  if (!validPassword) {
    await logAuditEvent(DB_AUDIT, { actorId: account.id, eventType: 'LOGIN_FAILURE', ipAddress: ip, userAgent, metadata: { reason: 'invalid_credentials' } });
    return sendError(c, 'Invalid email/phone or password', 401, 'INVALID_CREDENTIALS');
  }

  // Priority 1: Fail securely if secret missing
  const jwtSecret = getRequiredSecret(c.env, 'JWT_ACCESS_SECRET');
  const { accessToken, refreshToken, sessionId } = await createSessionAndTokens(
    DB_SESSIONS, account.id, account.country_id, account.account_type, account.role, account.level, jwtSecret,
    JSON.stringify({ ip, userAgent })
  );

  await logAuditEvent(DB_AUDIT, {
    actorId: account.id, targetId: account.id, eventType: 'LOGIN_SUCCESS',
    ipAddress: ip, userAgent, metadata: { sessionId, role: account.role, level: account.level },
  });

  return sendSuccess(c, {
    account: {
      id: account.id, email: account.email, phoneNumber: account.phone_number, role: account.role,
      level: account.level, status: account.status, accountType: account.account_type, companyId: account.company_id,
    },
    tokens: { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 900 },
  });
});
