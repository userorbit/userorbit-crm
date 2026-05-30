CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_team_slug ON workspaces(team_id, slug);

INSERT OR IGNORE INTO teams (id, name, slug, created_at, updated_at)
VALUES ('team_default', 'Default Team', 'default-team', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO workspaces (id, team_id, name, slug, created_at, updated_at)
VALUES ('workspace_default', 'team_default', 'Sales', 'sales', datetime('now'), datetime('now'));

ALTER TABLE accounts ADD COLUMN workspace_id TEXT;
ALTER TABLE opportunities ADD COLUMN workspace_id TEXT;
ALTER TABLE tasks ADD COLUMN workspace_id TEXT;

UPDATE accounts SET workspace_id = 'workspace_default' WHERE workspace_id IS NULL;
UPDATE opportunities SET workspace_id = 'workspace_default' WHERE workspace_id IS NULL;
UPDATE tasks SET workspace_id = 'workspace_default' WHERE workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_workspace ON accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_workspace ON opportunities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);
