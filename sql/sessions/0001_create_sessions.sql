-- ==============================================================================
-- Housika Authentication System - Database 3 of 6: Sessions
-- Table: sessions (Strictly 1 table per D1 database)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  token_family_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL,
  revoked_at INTEGER,
  revoke_reason TEXT,
  device_metadata TEXT -- JSON string storing IP, user agent, client device
);

-- Performance and Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_account_id ON sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_sessions_family_id ON sessions(token_family_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_hash ON sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked_at ON sessions(revoked_at);
