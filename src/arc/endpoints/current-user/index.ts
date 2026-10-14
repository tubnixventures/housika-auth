import { Hono } from 'hono';
import { authMiddleware } from '../../../middleware/auth.ts';
import { queryOne } from '../../../utils/d1.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import type { Bindings } from '../../../types/env.ts';

export const currentUserRoute = new Hono<{ Bindings: Bindings }>();

interface DbAccountRecord {
  id: string;
  email: string;
  phone_number: string;
  role: string;
  level: number;
  account_type: string;
  status: string;
  company_id: string | null;
  email_verified_at: number | null;
  phone_verified_at: number | null;
  auth_version: number;
}

interface DbProfileRecord {
  id: string;
  name: string;
  display_name: string | null;
  country_id: string;
  country_name: string;
  currency: string;
  avatar_key: string | null;
}

currentUserRoute.get('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const { DB_ACCOUNTS, DB_PROFILES } = c.env;

  if (!DB_ACCOUNTS || !DB_PROFILES) {
    return sendError(c, 'Database configuration error', 500, 'SERVER_ERROR');
  }

  const account = await queryOne<DbAccountRecord>(
    DB_ACCOUNTS,
    `SELECT id, email, phone_number, role, level, account_type, status, company_id, 
            email_verified_at, phone_verified_at, auth_version
     FROM accounts WHERE id = ?`,
    [user.sub]
  );

  if (!account) {
    return sendError(c, 'Account not found', 404, 'ACCOUNT_NOT_FOUND');
  }

  if (account.auth_version > user.authVersion) {
    return sendError(c, 'Session has expired or was revoked', 401, 'TOKEN_REVOKED');
  }

  const profile = await queryOne<DbProfileRecord>(
    DB_PROFILES,
    `SELECT id, name, display_name, country_id, country_name, currency, avatar_key
     FROM profiles WHERE account_id = ?`,
    [user.sub]
  );

  return sendSuccess(c, {
    id: account.id,
    email: account.email,
    phoneNumber: account.phone_number,
    role: account.role,
    level: account.level,
    accountType: account.account_type,
    status: account.status,
    companyId: account.company_id,
    emailVerified: Boolean(account.email_verified_at),
    phoneVerified: Boolean(account.phone_verified_at),
    profile: profile
      ? {
          id: profile.id,
          name: profile.name,
          displayName: profile.display_name,
          countryId: profile.country_id,
          countryName: profile.country_name,
          currency: profile.currency,
          avatarKey: profile.avatar_key,
        }
      : null,
  });
});
