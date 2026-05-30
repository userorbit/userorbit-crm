CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  external_id TEXT,
  provider TEXT,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  meeting_url TEXT,
  attendee_emails_json TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_workspace ON calendar_events(workspace_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_account ON calendar_events(account_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_contact ON calendar_events(contact_id, starts_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_external ON calendar_events(workspace_id, provider, external_id) WHERE external_id IS NOT NULL;
