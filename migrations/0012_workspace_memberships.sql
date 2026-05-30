CREATE TABLE IF NOT EXISTS workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_unique ON workspace_members(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

INSERT OR IGNORE INTO workspace_members (id, workspace_id, user_id, role, created_at, updated_at)
SELECT lower(hex(randomblob(16))), w.id, tm.user_id, tm.role, datetime('now'), datetime('now')
FROM workspaces w
JOIN team_members tm ON tm.team_id = w.team_id;
