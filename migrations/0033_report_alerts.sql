CREATE TABLE IF NOT EXISTS report_alerts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  metric TEXT NOT NULL,
  operator TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily',
  delivery_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_run_at TEXT,
  next_run_at TEXT,
  last_value INTEGER,
  last_triggered_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_report_alerts_due ON report_alerts(status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_report_alerts_workspace ON report_alerts(workspace_id, status, created_at);

CREATE TABLE IF NOT EXISTS report_alert_deliveries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  alert_id TEXT NOT NULL REFERENCES report_alerts(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  value INTEGER,
  threshold INTEGER,
  status TEXT NOT NULL,
  status_code INTEGER,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_report_alert_deliveries_workspace ON report_alert_deliveries(workspace_id, created_at);
