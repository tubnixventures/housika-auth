-- ==============================================================================
-- Housika Authentication System - Database 6 of 6: Security Audit Events
-- Table: audit_events (Strictly 1 table per D1 database)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  target_id TEXT,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT, -- JSON string storing minimized, non-sensitive audit details
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Performance and Query Indexes
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_target_id ON audit_events(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_events(created_at);
