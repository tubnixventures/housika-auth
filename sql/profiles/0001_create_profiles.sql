-- ==============================================================================
-- Housika Authentication System - Database 2 of 6: Profiles
-- Table: profiles (Strictly 1 table per D1 database)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_name TEXT,
  country_id TEXT NOT NULL,
  country_name TEXT NOT NULL,
  currency TEXT NOT NULL,
  avatar_key TEXT,
  metadata TEXT, -- JSON string for validated extensible metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_country_id ON profiles(country_id);
