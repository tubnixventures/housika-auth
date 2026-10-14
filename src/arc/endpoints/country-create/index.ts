import { Hono } from 'hono';
import { CountryCreateSchema } from './schema.ts';
import { authMiddleware, requireMinLevel } from '../../../middleware/auth.ts';
import { execute, queryOne } from '../../../utils/d1.ts';
import { nowUtc } from '../../../utils/time.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import type { Bindings } from '../../../types/env.ts';

export const countryCreateRoute = new Hono<{ Bindings: Bindings }>();

countryCreateRoute.post('/', authMiddleware, requireMinLevel(90), async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => null);
  const parsed = CountryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return sendError(c, 'Invalid country data', 422, 'VALIDATION_ERROR', parsed.error.format());
  }

  const { DB_COUNTRIES, DB_AUDIT } = c.env;
  if (!DB_COUNTRIES) {
    return sendError(c, 'Database configuration error', 500, 'SERVER_ERROR');
  }

  const input = parsed.data;
  const existing = await queryOne<{ id: string }>(
    DB_COUNTRIES,
    'SELECT id FROM countries WHERE iso2 = ? OR iso3 = ? OR name = ?',
    [input.iso2, input.iso3, input.name]
  );
  if (existing) {
    return sendError(c, 'Country with this ISO code or name already exists', 409, 'CONFLICT');
  }

  const now = nowUtc();
  await execute(
    DB_COUNTRIES,
    `INSERT INTO countries 
      (id, name, iso2, iso3, calling_code, currency_code, currency_name,
       listing_fee, booking_fee, payment_gateway, is_active, account_count,
       created_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?)`,
    [
      input.id,
      input.name,
      input.iso2,
      input.iso3,
      input.callingCode,
      input.currencyCode,
      input.currencyName,
      JSON.stringify(input.listingFee),
      JSON.stringify(input.bookingFee),
      JSON.stringify(input.paymentGateway),
      user.sub,
      user.sub,
      now,
      now,
    ]
  );

  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  await logAuditEvent(DB_AUDIT, {
    actorId: user.sub,
    targetId: input.id,
    eventType: 'COUNTRY_CREATED',
    ipAddress: ip,
    metadata: { iso2: input.iso2, name: input.name },
  });

  return sendSuccess(c, { message: 'Country created successfully', countryId: input.id }, 201);
});
