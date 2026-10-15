import { queryOne, execute } from '../../../utils/d1.ts';
import { sha256 } from '../../../utils/security.ts';
import { nowUtc, isExpired, addDays, TOKEN_EXPIRY } from '../../../utils/time.ts';
import { generateRefreshTokenString } from '../../../utils/jwt.ts';
import { generateSessionId } from '../../../utils/ids.ts';
import type { D1Database } from '../../../types/env.ts';

export interface SessionDbRecord {
  id: string;
  account_id: string;
  refresh_token_hash: string;
  token_family_id: string;
  expires_at: number;
  revoked_at: number | null;
  device_metadata?: string | null;
}

export async function processTokenRotation(
  dbSess: D1Database,
  rawRefreshToken: string
): Promise<{ success: boolean; session?: SessionDbRecord; newRefreshToken?: string; error?: string }> {
  const presentedHash = await sha256(rawRefreshToken);
  const session = await queryOne<SessionDbRecord>(
    dbSess,
    'SELECT id, account_id, refresh_token_hash, token_family_id, expires_at, revoked_at, device_metadata FROM sessions WHERE refresh_token_hash = ?',
    [presentedHash]
  );

  if (!session) return { success: false, error: 'Invalid refresh token' };

  const now = nowUtc();

  // Priority 4: RFC 6749 Token Family Reuse Detection & Breach Containment
  if (session.revoked_at !== null) {
    await execute(
      dbSess,
      'UPDATE sessions SET revoked_at = ?, revoke_reason = ? WHERE token_family_id = ? AND revoked_at IS NULL',
      [now, 'reuse_detected_compromised', session.token_family_id]
    );
    return { success: false, error: 'Token reuse detected. All sessions in family terminated for security.' };
  }

  if (isExpired(session.expires_at)) {
    return { success: false, error: 'Refresh token has expired' };
  }

  // Mark current session as rotated
  await execute(
    dbSess,
    'UPDATE sessions SET revoked_at = ?, revoke_reason = ?, updated_at = ? WHERE id = ?',
    [now, 'rotated', now, session.id]
  );

  // Mint new refresh token and link to the same token family
  const newRawRefreshToken = generateRefreshTokenString();
  const newHash = await sha256(newRawRefreshToken);
  const newSessionId = generateSessionId();
  const newExpiry = addDays(now, TOKEN_EXPIRY.REFRESH_DAYS);

  await execute(
    dbSess,
    `INSERT INTO sessions 
      (id, account_id, refresh_token_hash, token_family_id, created_at, updated_at, expires_at, last_used_at, revoked_at, revoke_reason, device_metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
    [newSessionId, session.account_id, newHash, session.token_family_id, now, now, newExpiry, now, session.device_metadata || null]
  );

  const newSession: SessionDbRecord = {
    id: newSessionId,
    account_id: session.account_id,
    refresh_token_hash: newHash,
    token_family_id: session.token_family_id,
    expires_at: newExpiry,
    revoked_at: null,
  };

  return { success: true, session: newSession, newRefreshToken: newRawRefreshToken };
}
