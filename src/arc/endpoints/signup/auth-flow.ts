import { generateSessionId, generateTokenFamilyId, generateOtp, generateChallengeId } from '../../../utils/ids.ts';
import { nowUtc, addDays, addMinutes, TOKEN_EXPIRY } from '../../../utils/time.ts';
import { sha256, hmacSha256 } from '../../../utils/security.ts';
import { execute } from '../../../utils/d1.ts';
import { generateRefreshTokenString, createAccessToken } from '../../../utils/jwt.ts';
import type { D1Database } from '../../../types/env.ts';
import type { AccountType, Role } from '../../../types/auth.ts';

export async function createSessionAndTokens(
  dbSess: D1Database,
  accountId: string,
  countryId: string,
  accountType: AccountType,
  role: Role,
  level: number,
  jwtSecret: string,
  deviceMeta?: string
) {
  const sessionId = generateSessionId();
  const tokenFamilyId = generateTokenFamilyId();
  const rawRefreshToken = generateRefreshTokenString();
  const refreshTokenHash = await sha256(rawRefreshToken);
  const now = nowUtc();
  const expiresAt = addDays(now, TOKEN_EXPIRY.REFRESH_DAYS);

  await execute(
    dbSess,
    `INSERT INTO sessions (id, account_id, refresh_token_hash, token_family_id, created_at, updated_at, expires_at, last_used_at, device_metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [sessionId, accountId, refreshTokenHash, tokenFamilyId, now, now, expiresAt, now, deviceMeta || null]
  );

  const accessToken = await createAccessToken(
    { accountId, sessionId, countryId, accountType, role, level, authVersion: 1 },
    jwtSecret
  );

  return { accessToken, refreshToken: rawRefreshToken, sessionId };
}

export async function createEmailChallenge(
  dbChal: D1Database,
  accountId: string,
  email: string,
  hmacSecret: string
) {
  const otp = generateOtp();
  const destHash = await sha256(email);
  const secretHash = await hmacSha256(otp, hmacSecret);
  const challengeId = generateChallengeId();
  const now = nowUtc();

  await execute(
    dbChal,
    `INSERT INTO auth_challenges (id, account_id, purpose, channel, destination_hash, secret_hash, attempts, max_attempts, created_at, updated_at, expires_at)
     VALUES (?, ?, 'email_verification', 'email', ?, ?, 0, 5, ?, ?, ?)`,
    [challengeId, accountId, destHash, secretHash, now, now, addMinutes(now, TOKEN_EXPIRY.OTP_MINUTES)]
  );

  return { otp, challengeId };
}
