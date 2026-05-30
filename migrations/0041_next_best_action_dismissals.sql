CREATE TABLE IF NOT EXISTS next_best_action_dismissals (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_next_best_action_dismissals_unique ON next_best_action_dismissals(workspace_id, user_id, action_id);
CREATE INDEX IF NOT EXISTS idx_next_best_action_dismissals_workspace_user ON next_best_action_dismissals(workspace_id, user_id, created_at);
