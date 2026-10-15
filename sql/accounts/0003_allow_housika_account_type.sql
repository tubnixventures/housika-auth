-- ==============================================================================
-- Migration: 0003_allow_housika_account_type.sql
-- Safe table recreate pattern to expand account_type CHECK in SQLite/D1
-- ==============================================================================

CREATE TABLE accounts_new (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  phone_normalized TEXT UNIQUE,
  google_id TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  country_id TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('housika', 'company', 'individual')),
  role TEXT NOT NULL CHECK (role IN ('root', 'ceo', 'admin', 'manager', 'customercare', 'landlord', 'dual', 'tenant')),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 100),
  scope_id TEXT,
  company_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('active', 'pending_verification', 'suspended', 'deactivated')),
  email_verified_at INTEGER,
  phone_verified_at INTEGER,
  password_changed_at INTEGER,
  auth_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Copy all existing data safely without data loss
INSERT INTO accounts_new (
  id, email, email_normalized, phone_number, phone_normalized, google_id,
  password_hash, country_id, account_type, role, level, scope_id, company_id,
  status, email_verified_at, phone_verified_at, password_changed_at,
  auth_version, created_at, updated_at
)
SELECT 
  id, email, email_normalized, phone_number, phone_normalized, google_id,
  password_hash, country_id, account_type, role, level, scope_id, company_id,
  status, email_verified_at, phone_verified_at, password_changed_at,
  auth_version, created_at, updated_at
FROM accounts;

-- Drop old table and rename new table
DROP TABLE accounts;
ALTER TABLE accounts_new RENAME TO accounts;

-- Recreate performance indexes
CREATE INDEX IF NOT EXISTS idx_accounts_email_norm ON accounts(email_normalized);
CREATE INDEX IF NOT EXISTS idx_accounts_phone_norm ON accounts(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_accounts_google_id ON accounts(google_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_company_id ON accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON accounts(created_at);
