import { sign, verify } from 'hono/jwt';
import { createId } from './ids.ts';
import { nowUtc, addMinutes, addDays, TOKEN_EXPIRY } from './time.ts';
import type { AccessTokenPayload, AccountType, Role } from '../types/auth.ts';

export interface CreateTokenParams {
  accountId: string;
  sessionId: string;
  countryId: string;
  accountType: AccountType;
  role: Role;
  level: number;
  companyId?: string | null;
  scopeId?: string | null;
  authVersion: number;
}

export async function createAccessToken(
  params: CreateTokenParams,
  secret: string,
  issuer = 'https://auth.housika.com'
): Promise<string> {
  const now = nowUtc();
  const payload: AccessTokenPayload = {
    sub: params.accountId,
    sid: params.sessionId,
    countryId: params.countryId,
    accountType: params.accountType,
    role: params.role,
    level: params.level,
    companyId: params.companyId ?? null,
    scopeId: params.scopeId ?? null,
    authVersion: params.authVersion,
    iss: issuer,
    aud: 'housika-api',
    iat: now,
    exp: addMinutes(now, TOKEN_EXPIRY.ACCESS_MINUTES),
    jti: createId('tok', 20),
  };
  return sign(payload as unknown as Record<string, unknown>, secret, 'HS256');
}

export async function verifyAccessToken(
  token: string,
  secret: string
): Promise<AccessTokenPayload> {
  const payload = await verify(token, secret, 'HS256');
  return payload as unknown as AccessTokenPayload;
}

export function generateRefreshTokenString(): string {
  return createId('rfr', 36);
}
