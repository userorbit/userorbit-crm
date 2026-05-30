CREATE TABLE IF NOT EXISTS export_schedules (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  resource TEXT NOT NULL DEFAULT 'accounts',
  frequency TEXT NOT NULL DEFAULT 'weekly',
  delivery_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_run_at TEXT,
  next_run_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_export_schedules_due ON export_schedules(status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_export_schedules_workspace ON export_schedules(workspace_id, status, created_at);

CREATE TABLE IF NOT EXISTS export_deliveries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  schedule_id TEXT NOT NULL REFERENCES export_schedules(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  status TEXT NOT NULL,
  status_code INTEGER,
  row_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_export_deliveries_schedule ON export_deliveries(schedule_id, created_at);
CREATE INDEX IF NOT EXISTS idx_export_deliveries_workspace ON export_deliveries(workspace_id, created_at);
