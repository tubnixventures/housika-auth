import { Hono } from 'hono';
import { InternalStaffSchema } from './schema.ts';
import { execute, queryOne } from '../../../utils/d1.ts';
import { generateAccountId, generateProfileId } from '../../../utils/ids.ts';
import { nowUtc } from '../../../utils/time.ts';
import { hashPassword, validatePasswordStrength } from '../../../utils/password.ts';
import { normalizeEmail, normalizePhone } from '../../../utils/normalization.ts';
import { timingSafeEqual } from '../../../utils/security.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import { logAuditEvent } from '../../../utils/logger.ts';
import { HOUSIKA_ROLE_LEVELS } from '../../../types/auth.ts';
import type { CountryRecord } from '../signup/service.ts';
import type { Bindings } from '../../../types/env.ts';

export const internalStaffRoute = new Hono<{ Bindings: Bindings }>();

internalStaffRoute.post('/', async (c) => {
  const serviceKey = c.env?.INTERNAL_SERVICE_KEY;
  if (!serviceKey || serviceKey.length < 16) {
    return sendError(c, 'Internal service authentication unavailable', 500, 'SERVER_CONFIGURATION_ERROR');
  }

  const authHeader = c.req.header('authorization');
  const keyHeader = c.req.header('x-internal-service-key');
  const provided = keyHeader || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : '');
  if (!provided || !timingSafeEqual(provided, serviceKey)) {
    return sendError(c, 'Invalid internal service credentials', 401, 'UNAUTHORIZED');
  }

  const body = await c.req.json().catch(() => null);
  const parsed = InternalStaffSchema.safeParse(body);
  if (!parsed.success) return sendError(c, 'Validation failed', 422, 'VALIDATION_ERROR', parsed.error.format());

  const input = parsed.data;
  const pwCheck = validatePasswordStrength(input.password);
  if (!pwCheck.valid) return sendError(c, pwCheck.reason || 'Weak password', 400, 'WEAK_PASSWORD');

  const { DB_ACCOUNTS, DB_PROFILES, DB_COUNTRIES, DB_AUDIT } = c.env;
  if (!DB_ACCOUNTS || !DB_PROFILES || !DB_COUNTRIES) return sendError(c, 'Database configuration error', 500, 'SERVER_ERROR');

  const country = await queryOne<CountryRecord>(
    DB_COUNTRIES, 'SELECT id, name, calling_code, currency_code FROM countries WHERE id = ?', [input.countryId]
  ) || { id: 'ctry_ke_01', name: 'Kenya', calling_code: '+254', currency_code: 'KES', is_active: 1 };

  const normEmail = normalizeEmail(input.email);
  const normPhone = input.phoneNumber ? normalizePhone(input.phoneNumber, country.calling_code) : null;

  const existing = await queryOne<{ id: string }>(
    DB_ACCOUNTS, 'SELECT id FROM accounts WHERE email_normalized = ?', [normEmail]
  );
  if (existing) return sendError(c, 'Staff account with this email already exists', 409, 'ACCOUNT_EXISTS');

  const accountId = generateAccountId();
  const profileId = generateProfileId();
  const level = HOUSIKA_ROLE_LEVELS[input.role];
  const now = nowUtc();
  const passwordHash = await hashPassword(input.password, c.env.BCRYPT_ROUNDS || 10);

  await execute(
    DB_ACCOUNTS,
    `INSERT INTO accounts 
      (id, email, email_normalized, phone_number, phone_normalized, password_hash,
       country_id, account_type, role, level, status, email_verified_at, auth_version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'housika', ?, ?, 'active', ?, 1, ?, ?)`,
    [accountId, input.email, normEmail, input.phoneNumber || null, normPhone, passwordHash, country.id, input.role, level, now, now, now]
  );

  await execute(
    DB_PROFILES,
    `INSERT INTO profiles (id, account_id, name, display_name, country_id, country_name, currency, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [profileId, accountId, input.name, input.displayName || input.name, country.id, country.name, country.currency_code, now, now]
  );

  await logAuditEvent(DB_AUDIT, {
    actorId: 'INTERNAL_SERVICE', targetId: accountId, eventType: 'STAFF_ACCOUNT_PROVISIONED',
    metadata: { role: input.role, level, accountType: 'housika' },
  });

  return sendSuccess(c, { accountId, role: input.role, level, accountType: 'housika' }, 201);
});
