import { queryOne, execute } from '../../../utils/d1.ts';
import { sha256 } from '../../../utils/security.ts';
import { nowUtc, isExpired, addDays, TOKEN_EXPIRY } from '../../../utils/time.ts';
import { generateRefreshTokenString } from '../../../utils/jwt.ts';
import type { D1Database } from '../../../types/env.ts';

export interface SessionDbRecord {
  id: string;
  account_id: string;
  refresh_token_hash: string;
  token_family_id: string;
  expires_at: number;
  revoked_at: number | null;
}

export async function processTokenRotation(
  dbSess: D1Database,
  rawRefreshToken: string
): Promise<{ success: boolean; session?: SessionDbRecord; newRefreshToken?: string; error?: string }> {
  const presentedHash = await sha256(rawRefreshToken);
  const session = await queryOne<SessionDbRecord>(
    dbSess,
    'SELECT id, account_id, refresh_token_hash, token_family_id, expires_at, revoked_at FROM sessions WHERE refresh_token_hash = ?',
    [presentedHash]
  );

  if (!session) {
    return { success: false, error: 'Invalid refresh token' };
  }

  // Token Reuse Detection
  if (session.revoked_at) {
    const now = nowUtc();
    // Invalidate entire family as compromised
    await execute(
      dbSess,
      'UPDATE sessions SET revoked_at = ?, revoke_reason = ? WHERE token_family_id = ? AND revoked_at IS NULL',
      [now, 'reuse_detected_compromised', session.token_family_id]
    );
    return { success: false, error: 'Token reuse detected. Session invalidated for security.' };
  }

  if (isExpired(session.expires_at)) {
    return { success: false, error: 'Refresh token has expired' };
  }

  // Rotate token: generate new refresh token and update session
  const newRawRefreshToken = generateRefreshTokenString();
  const newHash = await sha256(newRawRefreshToken);
  const now = nowUtc();
  const newExpiry = addDays(now, TOKEN_EXPIRY.REFRESH_DAYS);

  await execute(
    dbSess,
    'UPDATE sessions SET refresh_token_hash = ?, last_used_at = ?, expires_at = ?, updated_at = ? WHERE id = ?',
    [newHash, now, newExpiry, now, session.id]
  );

  return { success: true, session, newRefreshToken: newRawRefreshToken };
}
