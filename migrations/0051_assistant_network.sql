CREATE TABLE IF NOT EXISTS assistant_network_imports (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, user_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL, name TEXT NOT NULL, email TEXT, linkedin_url TEXT,
  company TEXT, title TEXT, connected_at TEXT, source TEXT NOT NULL,
  contact_id TEXT, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','matched','rejected')),
  created_at TEXT NOT NULL,
  UNIQUE(workspace_id,user_id,fingerprint)
);
CREATE TABLE IF NOT EXISTS assistant_network_edges (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, user_id TEXT NOT NULL,
  from_node TEXT NOT NULL, to_node TEXT NOT NULL, relationship TEXT NOT NULL,
  evidence TEXT NOT NULL, source_url TEXT, created_at TEXT NOT NULL,
  UNIQUE(workspace_id,user_id,from_node,to_node,relationship)
);
CREATE TABLE IF NOT EXISTS assistant_network_observations (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, values_json TEXT NOT NULL,
  source_url TEXT NOT NULL, evidence TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_network_observations_entity ON assistant_network_observations(workspace_id,user_id,entity_type,entity_id,created_at);
CREATE TABLE IF NOT EXISTS assistant_network_alerts (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, user_id TEXT NOT NULL,
  observation_id TEXT NOT NULL REFERENCES assistant_network_observations(id),
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, field TEXT NOT NULL,
  before_value TEXT, after_value TEXT, evidence TEXT NOT NULL, source_url TEXT NOT NULL,
  acknowledged_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_network_alerts_owner ON assistant_network_alerts(workspace_id,user_id,created_at);
CREATE TABLE IF NOT EXISTS assistant_network_monitors (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, url TEXT NOT NULL,
  interval_hours INTEGER NOT NULL DEFAULT 24 CHECK(interval_hours >= 24),
  next_run_at TEXT NOT NULL, lease_until TEXT, last_status TEXT NOT NULL DEFAULT 'pending', last_checked_at TEXT,
  UNIQUE(workspace_id,user_id,entity_type,entity_id)
);
CREATE INDEX IF NOT EXISTS idx_network_monitors_due ON assistant_network_monitors(next_run_at,lease_until);
