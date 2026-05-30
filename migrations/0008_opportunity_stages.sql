CREATE TABLE IF NOT EXISTS opportunity_stages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_won INTEGER NOT NULL DEFAULT 0,
  is_lost INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunity_stages_workspace_key ON opportunity_stages(workspace_id, key);
CREATE INDEX IF NOT EXISTS idx_opportunity_stages_workspace_position ON opportunity_stages(workspace_id, position);

WITH defaults(key, label, position, is_won, is_lost) AS (
  VALUES
    ('research', 'Research', 10, 0, 0),
    ('conversation', 'Conversation', 20, 0, 0),
    ('demo', 'Demo', 30, 0, 0),
    ('proposal', 'Proposal', 40, 0, 0),
    ('won', 'Won', 50, 1, 0),
    ('lost', 'Lost', 60, 0, 1)
)
INSERT INTO opportunity_stages (id, workspace_id, key, label, position, is_won, is_lost, created_at, updated_at)
SELECT lower(hex(randomblob(16))), w.id, defaults.key, defaults.label, defaults.position, defaults.is_won, defaults.is_lost, datetime('now'), datetime('now')
FROM workspaces w
CROSS JOIN defaults
WHERE NOT EXISTS (
  SELECT 1 FROM opportunity_stages existing
  WHERE existing.workspace_id = w.id AND existing.key = defaults.key
);
