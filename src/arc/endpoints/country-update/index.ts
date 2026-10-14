import { Hono } from 'hono';
import { CountryUpdateSchema } from './schema.ts';
import { authMiddleware, requireMinLevel } from '../../../middleware/auth.ts';
import { execute, queryOne } from '../../../utils/d1.ts';
import { nowUtc } from '../../../utils/time.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import type { Bindings } from '../../../types/env.ts';

export const countryUpdateRoute = new Hono<{ Bindings: Bindings }>();

countryUpdateRoute.patch('/:id', authMiddleware, requireMinLevel(90), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json().catch(() => null);
  const parsed = CountryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return sendError(c, 'Invalid country update payload', 400, 'VALIDATION_ERROR');
  }

  const { DB_COUNTRIES, DB_AUDIT } = c.env;
  if (!DB_COUNTRIES) {
    return sendError(c, 'Database configuration error', 500, 'SERVER_ERROR');
  }

  const existing = await queryOne<{ id: string }>(DB_COUNTRIES, 'SELECT id FROM countries WHERE id = ?', [id]);
  if (!existing) {
    return sendError(c, 'Country not found', 404, 'NOT_FOUND');
  }

  const input = parsed.data;
  const updates: string[] = [];
  const params: unknown[] = [];
  const now = nowUtc();

  if (input.name) { updates.push('name = ?'); params.push(input.name); }
  if (input.callingCode) { updates.push('calling_code = ?'); params.push(input.callingCode); }
  if (input.currencyCode) { updates.push('currency_code = ?'); params.push(input.currencyCode); }
  if (input.currencyName) { updates.push('currency_name = ?'); params.push(input.currencyName); }
  if (input.listingFee) { updates.push('listing_fee = ?'); params.push(JSON.stringify(input.listingFee)); }
  if (input.bookingFee) { updates.push('booking_fee = ?'); params.push(JSON.stringify(input.bookingFee)); }
  if (input.paymentGateway) { updates.push('payment_gateway = ?'); params.push(JSON.stringify(input.paymentGateway)); }

  updates.push('updated_by = ?'); params.push(user.sub);
  updates.push('updated_at = ?'); params.push(now);
  params.push(id);

  await execute(DB_COUNTRIES, `UPDATE countries SET ${updates.join(', ')} WHERE id = ?`, params);

  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  await logAuditEvent(DB_AUDIT, {
    actorId: user.sub,
    targetId: id,
    eventType: 'COUNTRY_UPDATED',
    ipAddress: ip,
    metadata: { updatedFields: Object.keys(input) },
  });

  return sendSuccess(c, { message: 'Country updated successfully', countryId: id });
});
