import { Hono } from 'hono';
import { VerifyRequestSchema } from './schema.ts';
import { queryOne, execute } from '../../../utils/d1.ts';
import { generateOtp, generateChallengeId } from '../../../utils/ids.ts';
import { nowUtc, addMinutes, TOKEN_EXPIRY } from '../../../utils/time.ts';
import { sha256, hmacSha256 } from '../../../utils/security.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { sendZeptoEmail } from '../../../utils/zeptomail.ts';
import { renderOtpEmail } from '../../../templates/otp.ts';
import { normalizeEmail, isEmail } from '../../../utils/normalization.ts';
import { verifyAccessToken } from '../../../utils/jwt.ts';
import type { Bindings } from '../../../types/env.ts';

export const verifyRequestRoute = new Hono<{ Bindings: Bindings }>();

verifyRequestRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = VerifyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return sendError(c, 'Invalid verification request parameters', 400, 'VALIDATION_ERROR');
  }

  const { channel, purpose, identifier } = parsed.data;

  // Phone and SMS verification currently inactive as per system configuration
  if (channel === 'sms' || purpose === 'phone_verification') {
    return sendError(c, 'Phone and SMS verification service is currently inactive. Please verify via email.', 400, 'PHONE_VERIFICATION_INACTIVE');
  }

  const { DB_ACCOUNTS, DB_CHALLENGES } = c.env;
  if (!DB_ACCOUNTS || !DB_CHALLENGES) {
    return sendError(c, 'Service configuration error', 500, 'SERVER_ERROR');
  }

  let account: { id: string; email: string } | null = null;
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const secret = c.env.JWT_ACCESS_SECRET || 'housika_default_access_secret_min16';
    try {
      const payload = await verifyAccessToken(token, secret);
      account = await queryOne(DB_ACCOUNTS, 'SELECT id, email FROM accounts WHERE id = ?', [payload.sub]);
    } catch { /* Fallback to identifier */ }
  }

  if (!account && identifier && isEmail(identifier)) {
    const norm = normalizeEmail(identifier);
    account = await queryOne(DB_ACCOUNTS, 'SELECT id, email FROM accounts WHERE email_normalized = ?', [norm]);
  }

  if (!account) {
    return sendSuccess(c, { message: 'If the account exists, a new verification code was sent to email.' });
  }

  const otp = generateOtp();
  const destHash = await sha256(account.email);
  const hmacSecret = c.env.CHALLENGE_HMAC_SECRET || 'housika_default_hmac_secret_min16';
  const secretHash = await hmacSha256(otp, hmacSecret);
  const now = nowUtc();

  await execute(
    DB_CHALLENGES,
    `INSERT INTO auth_challenges (id, account_id, purpose, channel, destination_hash, secret_hash, attempts, max_attempts, created_at, updated_at, expires_at)
     VALUES (?, ?, 'email_verification', 'email', ?, ?, 0, 5, ?, ?, ?)`,
    [generateChallengeId(), account.id, destHash, secretHash, now, now, addMinutes(now, TOKEN_EXPIRY.OTP_MINUTES)]
  );

  const { subject, html } = renderOtpEmail(otp, 'verification');
  c.executionCtx?.waitUntil?.(sendZeptoEmail({
    toEmail: account.email, subject, htmlContent: html, apiKey: c.env.ZEPTOMAIL_API_KEY,
    fromAddress: c.env.ZEPTOMAIL_FROM_ADDRESS, fromName: c.env.ZEPTOMAIL_FROM_NAME,
  }));

  return sendSuccess(c, {
    message: 'Verification code sent to email',
    channel: 'email',
    expiresInSeconds: TOKEN_EXPIRY.OTP_MINUTES * 60,
  });
});
