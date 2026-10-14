-- Migration: Add Google OAuth support and relax phone constraints for SSO accounts
ALTER TABLE accounts ADD COLUMN google_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_google_id ON accounts(google_id);
