CREATE TABLE IF NOT EXISTS dashboard_shares (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  public_key TEXT NOT NULL UNIQUE,
  widgets_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_viewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dashboard_shares_workspace ON dashboard_shares(workspace_id, status, created_at);
