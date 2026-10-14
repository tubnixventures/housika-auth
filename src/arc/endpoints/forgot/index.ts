import { Hono } from 'hono';
import { ForgotPasswordSchema } from './schema.ts';
import { findAccountByIdentifier } from '../login/service.ts';
import { generateOtp, generateChallengeId } from '../../../utils/ids.ts';
import { nowUtc, addMinutes, TOKEN_EXPIRY } from '../../../utils/time.ts';
import { sha256, hmacSha256 } from '../../../utils/security.ts';
import { execute } from '../../../utils/d1.ts';
import { sendSuccess } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import { sendZeptoEmail } from '../../../utils/zeptomail.ts';
import { renderOtpEmail } from '../../../templates/otp.ts';
import { rateLimit } from '../../../middleware/rate-limit.ts';
import type { Bindings } from '../../../types/env.ts';

export const forgotRoute = new Hono<{ Bindings: Bindings }>();

forgotRoute.post('/', rateLimit(5, 60), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = ForgotPasswordSchema.safeParse(body);
  const genericResponse = {
    message: 'If an account matches this information, recovery instructions have been sent to the registered email.',
  };

  if (!parsed.success) return sendSuccess(c, genericResponse);

  const { DB_ACCOUNTS, DB_CHALLENGES, DB_AUDIT } = c.env;
  if (!DB_ACCOUNTS || !DB_CHALLENGES) return sendSuccess(c, genericResponse);

  const account = await findAccountByIdentifier(DB_ACCOUNTS, parsed.data.identifier);
  if (!account) return sendSuccess(c, genericResponse);

  // Since SMS service is unavailable, all recovery codes are dispatched to verified email
  const otp = generateOtp();
  const destHash = await sha256(account.email);
  const hmacSecret = c.env.CHALLENGE_HMAC_SECRET || 'housika_default_hmac_secret_min16';
  const secretHash = await hmacSha256(otp, hmacSecret);
  const now = nowUtc();

  await execute(
    DB_CHALLENGES,
    `INSERT INTO auth_challenges (id, account_id, purpose, channel, destination_hash, secret_hash, attempts, max_attempts, created_at, updated_at, expires_at)
     VALUES (?, ?, 'password_reset', 'email', ?, ?, 0, 5, ?, ?, ?)`,
    [generateChallengeId(), account.id, destHash, secretHash, now, now, addMinutes(now, TOKEN_EXPIRY.RESET_MINUTES)]
  );

  const { subject, html } = renderOtpEmail(otp, 'password_reset');
  c.executionCtx?.waitUntil?.(
    sendZeptoEmail({
      toEmail: account.email,
      subject,
      htmlContent: html,
      apiKey: c.env.ZEPTOMAIL_API_KEY,
      fromAddress: c.env.ZEPTOMAIL_FROM_ADDRESS,
      fromName: c.env.ZEPTOMAIL_FROM_NAME,
    })
  );

  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  await logAuditEvent(DB_AUDIT, {
    actorId: account.id,
    targetId: account.id,
    eventType: 'PASSWORD_RESET_REQUESTED',
    ipAddress: ip,
    metadata: { channel: 'email', fallbackFromSms: true },
  });

  return sendSuccess(c, genericResponse);
});
