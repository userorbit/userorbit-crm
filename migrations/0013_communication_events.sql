CREATE TABLE IF NOT EXISTS communication_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  direction TEXT,
  outcome TEXT,
  subject TEXT NOT NULL,
  body TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_communication_events_workspace ON communication_events(workspace_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_communication_events_account ON communication_events(account_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_communication_events_contact ON communication_events(contact_id, occurred_at);
