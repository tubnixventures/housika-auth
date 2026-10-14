-- ==============================================================================
-- Housika Authentication System - Database 4 of 6: Countries
-- Table: countries (Strictly 1 table per D1 database)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS countries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  iso2 TEXT NOT NULL UNIQUE,
  iso3 TEXT NOT NULL UNIQUE,
  calling_code TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  currency_name TEXT NOT NULL,
  listing_fee TEXT NOT NULL,     -- JSON: {"residential":2500,"commercial":5000,"land":3500}
  booking_fee TEXT NOT NULL,     -- JSON: {"residential":1000,"commercial":2000,"land":1500}
  payment_gateway TEXT NOT NULL, -- JSON: {"providers":["stripe","mpesa"],"default":"mpesa"}
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  account_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_countries_iso2 ON countries(iso2);
CREATE INDEX IF NOT EXISTS idx_countries_iso3 ON countries(iso3);
CREATE INDEX IF NOT EXISTS idx_countries_calling_code ON countries(calling_code);
CREATE INDEX IF NOT EXISTS idx_countries_is_active ON countries(is_active);
