import { Hono } from 'hono';
import { GoogleAuthSchema } from './schema.ts';
import { verifyGoogleToken } from './service.ts';
import { syncGoogleAccount } from './sync.ts';
import { createSessionAndTokens } from '../signup/auth-flow.ts';
import { queryOne } from '../../../utils/d1.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import { rateLimit } from '../../../middleware/rate-limit.ts';
import type { CountryRecord } from '../signup/service.ts';
import type { Bindings } from '../../../types/env.ts';

export const googleAuthRoute = new Hono<{ Bindings: Bindings }>();

googleAuthRoute.post('/', rateLimit(15, 60), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = GoogleAuthSchema.safeParse(body);
  if (!parsed.success) {
    return sendError(c, 'Invalid Google authentication parameters', 400, 'VALIDATION_ERROR');
  }

  const { DB_ACCOUNTS, DB_PROFILES, DB_SESSIONS, DB_COUNTRIES, DB_AUDIT } = c.env;
  if (!DB_ACCOUNTS || !DB_PROFILES || !DB_SESSIONS || !DB_COUNTRIES) {
    return sendError(c, 'Service configuration error', 500, 'SERVER_ERROR');
  }

  // Verify ID token with Google
  const verifyRes = await verifyGoogleToken(parsed.data.idToken, c.env.GOOGLE_CLIENT_ID);
  if (!verifyRes.success || !verifyRes.data) {
    return sendError(c, verifyRes.error || 'Google token verification failed', 401, 'INVALID_GOOGLE_TOKEN');
  }

  const googleUser = verifyRes.data;
  const countryId = parsed.data.countryId || 'ctry_ke_01';
  let country = await queryOne<CountryRecord>(
    DB_COUNTRIES,
    'SELECT id, name, calling_code, currency_code, is_active FROM countries WHERE id = ? AND is_active = 1',
    [countryId]
  );

  if (!country) {
    country = await queryOne<CountryRecord>(
      DB_COUNTRIES,
      'SELECT id, name, calling_code, currency_code, is_active FROM countries WHERE is_active = 1 LIMIT 1'
    );
  }

  if (!country) {
    return sendError(c, 'No active country configured', 500, 'NO_ACTIVE_COUNTRY');
  }

  const { account, isNew } = await syncGoogleAccount(DB_ACCOUNTS, DB_PROFILES, googleUser, parsed.data, country);

  if (account.status === 'suspended' || account.status === 'deactivated') {
    return sendError(c, 'This account is currently suspended or disabled', 403, 'ACCOUNT_DISABLED');
  }

  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'unknown';
  const jwtSecret = c.env.JWT_ACCESS_SECRET || 'housika_default_access_secret_min16';

  const { accessToken, refreshToken } = await createSessionAndTokens(
    DB_SESSIONS, account.id, account.country_id, account.account_type, account.role, account.level, jwtSecret,
    JSON.stringify({ ip, userAgent, provider: 'google' })
  );

  await logAuditEvent(DB_AUDIT, {
    actorId: account.id,
    targetId: account.id,
    eventType: isNew ? 'GOOGLE_SIGNUP_SUCCESS' : 'GOOGLE_LOGIN_SUCCESS',
    ipAddress: ip,
    userAgent,
    metadata: { email: googleUser.email, isNew },
  });

  return sendSuccess(c, {
    account: {
      id: account.id,
      email: account.email,
      phoneNumber: account.phone_number || null,
      role: account.role,
      level: account.level,
      status: account.status,
      accountType: account.account_type,
      isNewAccount: isNew,
    },
    tokens: { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 900 },
  }, isNew ? 201 : 200);
});
