import { queryOne } from '../../../utils/d1.ts';
import { normalizeEmail, normalizePhone, isEmail } from '../../../utils/normalization.ts';
import type { D1Database } from '../../../types/env.ts';
import type { AccountType, Role, AccountStatus } from '../../../types/auth.ts';

export interface AccountLoginRecord {
  id: string;
  email: string;
  phone_number: string;
  password_hash: string;
  country_id: string;
  account_type: AccountType;
  role: Role;
  level: number;
  company_id: string | null;
  scope_id: string | null;
  status: AccountStatus;
  auth_version: number;
}

export async function findAccountByIdentifier(
  dbAcc: D1Database,
  identifier: string
): Promise<AccountLoginRecord | null> {
  if (isEmail(identifier)) {
    const norm = normalizeEmail(identifier);
    return queryOne<AccountLoginRecord>(
      dbAcc,
      'SELECT id, email, phone_number, password_hash, country_id, account_type, role, level, company_id, scope_id, status, auth_version FROM accounts WHERE email_normalized = ?',
      [norm]
    );
  }

  const normPhone = normalizePhone(identifier);
  return queryOne<AccountLoginRecord>(
    dbAcc,
    'SELECT id, email, phone_number, password_hash, country_id, account_type, role, level, company_id, scope_id, status, auth_version FROM accounts WHERE phone_normalized = ?',
    [normPhone]
  );
}
