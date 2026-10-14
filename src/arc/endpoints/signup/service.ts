import { execute } from '../../../utils/d1.ts';
import { generateAccountId, generateProfileId } from '../../../utils/ids.ts';
import { nowUtc } from '../../../utils/time.ts';
import { hashPassword } from '../../../utils/password.ts';
import { ROLE_LEVELS, type Role } from '../../../types/auth.ts';
import type { D1Database } from '../../../types/env.ts';
import type { SignupInput } from './schema.ts';

export interface CountryRecord {
  id: string;
  name: string;
  calling_code: string;
  currency_code: string;
  is_active: number;
}

// Strictly prevents any Housika internal staff role/account creation on signup
export function resolveSignupRole(accountType: 'individual' | 'company', requestedRole?: Role) {
  if (accountType === 'individual') {
    const validRoles: Role[] = ['tenant', 'landlord', 'dual'];
    const role = requestedRole && validRoles.includes(requestedRole) ? requestedRole : 'tenant';
    return { role, level: ROLE_LEVELS[role] };
  }
  // Company signups are real estate / property management organizations (level 30)
  return { role: 'landlord' as Role, level: ROLE_LEVELS['landlord'] };
}

export async function createAccountAndProfile(
  dbAcc: D1Database,
  dbProf: D1Database,
  input: SignupInput,
  normEmail: string,
  normPhone: string,
  country: CountryRecord,
  rounds = 10
) {
  const { role, level } = resolveSignupRole(input.accountType, input.role as Role);
  const accountId = generateAccountId();
  const profileId = generateProfileId();
  const now = nowUtc();
  const passwordHash = await hashPassword(input.password, rounds);

  await execute(
    dbAcc,
    `INSERT INTO accounts 
      (id, email, email_normalized, phone_number, phone_normalized, password_hash,
       country_id, account_type, role, level, status, auth_version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_verification', 1, ?, ?)`,
    [accountId, input.email, normEmail, input.phoneNumber, normPhone, passwordHash, country.id, input.accountType, role, level, now, now]
  );

  await execute(
    dbProf,
    `INSERT INTO profiles (id, account_id, name, display_name, country_id, country_name, currency, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [profileId, accountId, input.name, input.displayName || input.name, country.id, country.name, country.currency_code, now, now]
  );

  return { accountId, role, level };
}
