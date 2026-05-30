CREATE TABLE IF NOT EXISTS workspace_email_inbound_sources (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  inbound_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  last_received_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_email_inbound_sources_workspace ON workspace_email_inbound_sources(workspace_id, status, created_at);
