import { Hono } from 'hono';
import { SignupSchema } from './schema.ts';
import { createAccountAndProfile, type CountryRecord } from './service.ts';
import { createSessionAndTokens, createEmailChallenge } from './auth-flow.ts';
import { normalizeEmail, normalizePhone } from '../../../utils/normalization.ts';
import { validatePasswordStrength } from '../../../utils/password.ts';
import { queryOne } from '../../../utils/d1.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import { sendZeptoEmail } from '../../../utils/zeptomail.ts';
import { renderOtpEmail } from '../../../templates/otp.ts';
import type { Bindings } from '../../../types/env.ts';

export const signupRoute = new Hono<{ Bindings: Bindings }>();

signupRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return sendError(c, 'Validation failed', 422, 'VALIDATION_ERROR', parsed.error.format());
  }

  const input = parsed.data;
  const pwCheck = validatePasswordStrength(input.password);
  if (!pwCheck.valid) {
    return sendError(c, pwCheck.reason || 'Weak password', 400, 'WEAK_PASSWORD');
  }

  const { DB_ACCOUNTS, DB_PROFILES, DB_SESSIONS, DB_COUNTRIES, DB_CHALLENGES, DB_AUDIT } = c.env;
  if (!DB_ACCOUNTS || !DB_PROFILES || !DB_SESSIONS || !DB_COUNTRIES || !DB_CHALLENGES) {
    return sendError(c, 'Database configuration error', 500, 'SERVER_ERROR');
  }

  const country = await queryOne<CountryRecord>(
    DB_COUNTRIES,
    'SELECT id, name, calling_code, currency_code, is_active FROM countries WHERE id = ? AND is_active = 1',
    [input.countryId]
  );
  if (!country) {
    return sendError(c, 'Invalid or unsupported country selected', 400, 'INVALID_COUNTRY');
  }

  const normEmail = normalizeEmail(input.email);
  const normPhone = normalizePhone(input.phoneNumber, country.calling_code);

  const existing = await queryOne<{ id: string }>(
    DB_ACCOUNTS,
    'SELECT id FROM accounts WHERE email_normalized = ? OR phone_normalized = ?',
    [normEmail, normPhone]
  );
  if (existing) {
    return sendError(c, 'Account with this email or phone number already exists', 409, 'ACCOUNT_EXISTS');
  }

  const { accountId, role, level } = await createAccountAndProfile(
    DB_ACCOUNTS, DB_PROFILES, input, normEmail, normPhone, country, c.env.BCRYPT_ROUNDS
  );

  const userAgent = c.req.header('user-agent') || 'unknown';
  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  const hmacSecret = c.env.CHALLENGE_HMAC_SECRET || 'housika_default_hmac_secret_min16';
  const jwtSecret = c.env.JWT_ACCESS_SECRET || 'housika_default_access_secret_min16';

  const { accessToken, refreshToken, sessionId } = await createSessionAndTokens(
    DB_SESSIONS, accountId, country.id, input.accountType, role, level, jwtSecret,
    JSON.stringify({ ip, userAgent })
  );

  const { otp } = await createEmailChallenge(DB_CHALLENGES, accountId, normEmail, hmacSecret);
  const { subject, html } = renderOtpEmail(otp, 'verification');

  // Asynchronous notification delivery (do not leak OTP in logs)
  c.executionCtx?.waitUntil?.(
    sendZeptoEmail({
      toEmail: normEmail,
      toName: input.name,
      subject,
      htmlContent: html,
      apiKey: c.env.ZEPTOMAIL_API_KEY,
      fromAddress: c.env.ZEPTOMAIL_FROM_ADDRESS,
      fromName: c.env.ZEPTOMAIL_FROM_NAME,
    })
  );

  await logAuditEvent(DB_AUDIT, {
    actorId: accountId,
    targetId: accountId,
    eventType: 'ACCOUNT_SIGNUP',
    ipAddress: ip,
    userAgent,
    metadata: { role, level, accountType: input.accountType, countryId: country.id },
  });

  return sendSuccess(c, {
    account: { id: accountId, email: normEmail, phoneNumber: normPhone, status: 'pending_verification', role, level, accountType: input.accountType },
    tokens: { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 900 },
    verification: { required: true, channel: 'email', message: 'Verification code dispatched to email' },
  }, 201);
});
