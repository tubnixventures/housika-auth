-- ==============================================================================
-- Housika Authentication System - Database 5 of 6: Authentication Challenges
-- Table: auth_challenges (Strictly 1 table per D1 database)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS auth_challenges (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('email_verification', 'phone_verification', 'password_reset')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  destination_hash TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);

-- Performance and Expiry Indexes
CREATE INDEX IF NOT EXISTS idx_challenges_acc_purpose ON auth_challenges(account_id, purpose);
CREATE INDEX IF NOT EXISTS idx_challenges_expires_at ON auth_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_challenges_consumed_at ON auth_challenges(consumed_at);
