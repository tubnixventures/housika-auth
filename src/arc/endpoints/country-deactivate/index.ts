import { Hono } from 'hono';
import { CountryDeactivateParamSchema } from './schema.ts';
import { authMiddleware, requireMinLevel } from '../../../middleware/auth.ts';
import { execute, queryOne } from '../../../utils/d1.ts';
import { nowUtc } from '../../../utils/time.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import type { Bindings } from '../../../types/env.ts';

export const countryDeactivateRoute = new Hono<{ Bindings: Bindings }>();

countryDeactivateRoute.delete('/:id', authMiddleware, requireMinLevel(90), async (c) => {
  const param = CountryDeactivateParamSchema.safeParse(c.req.param());
  if (!param.success) {
    return sendError(c, 'Invalid country identifier', 400, 'VALIDATION_ERROR');
  }

  const id = param.data.id;
  const user = c.get('user');
  const { DB_COUNTRIES, DB_AUDIT } = c.env;
  if (!DB_COUNTRIES) {
    return sendError(c, 'Database configuration error', 500, 'SERVER_ERROR');
  }

  const existing = await queryOne<{ id: string; is_active: number }>(
    DB_COUNTRIES,
    'SELECT id, is_active FROM countries WHERE id = ?',
    [id]
  );
  if (!existing) {
    return sendError(c, 'Country not found', 404, 'NOT_FOUND');
  }

  const now = nowUtc();
  await execute(
    DB_COUNTRIES,
    'UPDATE countries SET is_active = 0, updated_by = ?, updated_at = ? WHERE id = ?',
    [user.sub, now, id]
  );

  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  await logAuditEvent(DB_AUDIT, {
    actorId: user.sub,
    targetId: id,
    eventType: 'COUNTRY_DEACTIVATED',
    ipAddress: ip,
  });

  return sendSuccess(c, {
    message: 'Country has been deactivated successfully',
    countryId: id,
    isActive: 0,
  });
});
