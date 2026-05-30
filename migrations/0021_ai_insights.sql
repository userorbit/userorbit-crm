CREATE TABLE IF NOT EXISTS ai_insights (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT,
  summary TEXT NOT NULL,
  next_steps_json TEXT,
  risks_json TEXT,
  score INTEGER,
  prompt_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_entity ON ai_insights(workspace_id, entity, entity_id, created_at);
