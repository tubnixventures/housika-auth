import { queryOne, execute } from '../../../utils/d1.ts';
import { nowUtc, isExpired } from '../../../utils/time.ts';
import { hmacSha256, timingSafeEqual } from '../../../utils/security.ts';
import type { D1Database } from '../../../types/env.ts';

export interface ChallengeRecord {
  id: string;
  account_id: string;
  purpose: string;
  destination_hash: string;
  secret_hash: string;
  attempts: number;
  max_attempts: number;
  expires_at: number;
  consumed_at: number | null;
}

export async function validateAndConsumeChallenge(
  dbChal: D1Database,
  accountId: string,
  purpose: string,
  rawOtp: string,
  hmacSecret: string
): Promise<{ success: boolean; error?: string }> {
  const challenge = await queryOne<ChallengeRecord>(
    dbChal,
    `SELECT * FROM auth_challenges 
     WHERE account_id = ? AND purpose = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [accountId, purpose]
  );

  if (!challenge) {
    return { success: false, error: 'No active verification challenge found' };
  }

  if (isExpired(challenge.expires_at)) {
    return { success: false, error: 'Verification code has expired' };
  }

  if (challenge.attempts >= challenge.max_attempts) {
    return { success: false, error: 'Maximum verification attempts exceeded' };
  }

  const computedHash = await hmacSha256(rawOtp, hmacSecret);
  const isValid = timingSafeEqual(computedHash, challenge.secret_hash);
  const now = nowUtc();

  if (!isValid) {
    await execute(
      dbChal,
      'UPDATE auth_challenges SET attempts = attempts + 1, updated_at = ? WHERE id = ?',
      [now, challenge.id]
    );
    return { success: false, error: 'Invalid verification code' };
  }

  // Consume challenge
  await execute(
    dbChal,
    'UPDATE auth_challenges SET consumed_at = ?, updated_at = ? WHERE id = ?',
    [now, now, challenge.id]
  );

  return { success: true };
}
