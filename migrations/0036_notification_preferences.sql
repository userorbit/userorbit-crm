CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_alert_trigger_enabled INTEGER NOT NULL DEFAULT 1,
  report_alert_recovery_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_preferences_unique ON notification_preferences(workspace_id, user_id);
