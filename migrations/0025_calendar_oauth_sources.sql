ALTER TABLE calendar_sources ADD COLUMN token_json TEXT;
ALTER TABLE calendar_sources ADD COLUMN token_expires_at TEXT;
ALTER TABLE calendar_sources ADD COLUMN external_calendar_id TEXT;
ALTER TABLE calendar_sources ADD COLUMN external_account TEXT;

CREATE TABLE IF NOT EXISTS calendar_oauth_states (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  calendar_id TEXT,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 1440,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_oauth_states_state ON calendar_oauth_states(state, expires_at);
