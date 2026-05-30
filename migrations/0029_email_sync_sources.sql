CREATE TABLE IF NOT EXISTS workspace_email_sync_sources (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  account_email TEXT,
  config_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_sync_at TEXT,
  last_result_json TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_email_sync_sources_workspace ON workspace_email_sync_sources(workspace_id, status, provider);
