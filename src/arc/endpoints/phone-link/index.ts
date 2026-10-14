import { Hono } from 'hono';
import { PhoneLinkSchema } from './schema.ts';
import { authMiddleware } from '../../../middleware/auth.ts';
import { queryOne, execute } from '../../../utils/d1.ts';
import { normalizePhone } from '../../../utils/normalization.ts';
import { nowUtc } from '../../../utils/time.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import type { Bindings } from '../../../types/env.ts';

export const phoneLinkRoute = new Hono<{ Bindings: Bindings }>();

phoneLinkRoute.post('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => null);
  const parsed = PhoneLinkSchema.safeParse(body);
  if (!parsed.success) {
    return sendError(c, 'Invalid phone number format', 400, 'VALIDATION_ERROR');
  }

  const { DB_ACCOUNTS, DB_COUNTRIES, DB_AUDIT } = c.env;
  if (!DB_ACCOUNTS || !DB_COUNTRIES) {
    return sendError(c, 'Service configuration error', 500, 'SERVER_ERROR');
  }

  const country = await queryOne<{ calling_code: string }>(
    DB_COUNTRIES,
    'SELECT calling_code FROM countries WHERE id = ?',
    [user.countryId]
  );
  const callingCode = country?.calling_code || '+254';
  const normPhone = normalizePhone(parsed.data.phoneNumber, callingCode);

  const existing = await queryOne<{ id: string }>(
    DB_ACCOUNTS,
    'SELECT id FROM accounts WHERE phone_normalized = ? AND id != ?',
    [normPhone, user.sub]
  );
  if (existing) {
    return sendError(c, 'This phone number is already linked to another account', 409, 'PHONE_ALREADY_EXISTS');
  }

  const now = nowUtc();
  await execute(
    DB_ACCOUNTS,
    'UPDATE accounts SET phone_number = ?, phone_normalized = ?, updated_at = ? WHERE id = ?',
    [parsed.data.phoneNumber, normPhone, now, user.sub]
  );

  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  await logAuditEvent(DB_AUDIT, {
    actorId: user.sub,
    targetId: user.sub,
    eventType: 'PHONE_NUMBER_LINKED',
    ipAddress: ip,
    metadata: { phoneNormalized: normPhone, smsVerificationActive: false },
  });

  return sendSuccess(c, {
    message: 'Phone number linked successfully to account. (SMS verification is currently inactive)',
    phoneNumber: normPhone,
    phoneVerified: false,
    smsVerificationActive: false,
  });
});
