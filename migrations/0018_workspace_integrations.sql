CREATE TABLE IF NOT EXISTS workspace_integrations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  config_json TEXT,
  events_json TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_integrations_workspace ON workspace_integrations(workspace_id, status, type);

CREATE TABLE IF NOT EXISTS integration_deliveries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  integration_id TEXT NOT NULL REFERENCES workspace_integrations(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  resource_id TEXT,
  status TEXT NOT NULL,
  status_code INTEGER,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_integration_deliveries_integration ON integration_deliveries(integration_id, created_at);
CREATE INDEX IF NOT EXISTS idx_integration_deliveries_workspace ON integration_deliveries(workspace_id, created_at);
