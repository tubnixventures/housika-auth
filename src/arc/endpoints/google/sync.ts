import { queryOne, execute } from '../../../utils/d1.ts';
import { generateAccountId, generateProfileId, createId } from '../../../utils/ids.ts';
import { nowUtc } from '../../../utils/time.ts';
import { hashPassword } from '../../../utils/password.ts';
import { normalizeEmail, normalizePhone } from '../../../utils/normalization.ts';
import { resolveSignupRole, type CountryRecord } from '../signup/service.ts';
import type { D1Database } from '../../../types/env.ts';
import type { GoogleAuthInput } from './schema.ts';
import type { GooglePayload } from './service.ts';
import type { AccountLoginRecord } from '../login/service.ts';

export async function syncGoogleAccount(
  dbAcc: D1Database,
  dbProf: D1Database,
  google: GooglePayload,
  input: GoogleAuthInput,
  country: CountryRecord
): Promise<{ account: AccountLoginRecord; isNew: boolean }> {
  const normEmail = normalizeEmail(google.email);
  const now = nowUtc();

  // 1. Check existing account by email to prevent duplicates
  const existing = await queryOne<AccountLoginRecord>(
    dbAcc,
    'SELECT id, email, phone_number, password_hash, country_id, account_type, role, level, company_id, scope_id, status, auth_version FROM accounts WHERE email_normalized = ?',
    [normEmail]
  );

  if (existing) {
    // Sync google_id and mark email verified
    await execute(
      dbAcc,
      `UPDATE accounts SET google_id = COALESCE(google_id, ?), email_verified_at = COALESCE(email_verified_at, ?), status = CASE WHEN status = 'pending_verification' THEN 'active' ELSE status END, updated_at = ? WHERE id = ?`,
      [google.sub, now, now, existing.id]
    );
    return { account: existing, isNew: false };
  }

  // 2. Resolve optional phone number if user provided one during SSO
  let phoneNum: string | null = null;
  let phoneNorm: string | null = null;
  if (input.phoneNumber && input.phoneNumber.trim().length >= 8) {
    const raw = input.phoneNumber.trim();
    phoneNorm = normalizePhone(raw, country.calling_code);
    phoneNum = raw;
  }

  const accountId = generateAccountId();
  const profileId = generateProfileId();
  const { role, level } = resolveSignupRole(input.accountType, input.role);
  const randSecret = createId('sso_rnd', 32);
  const dummyHash = await hashPassword(randSecret, 8);

  await execute(
    dbAcc,
    `INSERT INTO accounts 
      (id, email, email_normalized, phone_number, phone_normalized, google_id, password_hash,
       country_id, account_type, role, level, status, email_verified_at, auth_version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 1, ?, ?)`,
    [accountId, google.email, normEmail, phoneNum, phoneNorm, google.sub, dummyHash, country.id, input.accountType, role, level, now, now, now]
  );

  await execute(
    dbProf,
    `INSERT INTO profiles (id, account_id, name, display_name, country_id, country_name, currency, avatar_key, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [profileId, accountId, google.name, google.name, country.id, country.name, country.currency_code, google.picture || null, now, now]
  );

  const newAcc: AccountLoginRecord = {
    id: accountId,
    email: google.email,
    phone_number: phoneNum || '',
    password_hash: dummyHash,
    country_id: country.id,
    account_type: input.accountType,
    role,
    level,
    company_id: null,
    scope_id: null,
    status: 'active',
    auth_version: 1,
  };

  return { account: newAcc, isNew: true };
}
