CREATE TABLE IF NOT EXISTS workspace_email_senders (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  daily_limit INTEGER NOT NULL DEFAULT 100,
  sent_today INTEGER NOT NULL DEFAULT 0,
  sent_on TEXT,
  last_used_at TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_email_senders_email ON workspace_email_senders(workspace_id, email);
CREATE INDEX IF NOT EXISTS idx_workspace_email_senders_rotation ON workspace_email_senders(workspace_id, status, sent_on, sent_today, last_used_at);
