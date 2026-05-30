CREATE TABLE IF NOT EXISTS workspace_email_settings (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  open_tracking_enabled INTEGER NOT NULL DEFAULT 0,
  click_tracking_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE email_events ADD COLUMN tracking_id TEXT;
ALTER TABLE email_events ADD COLUMN open_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_events ADD COLUMN click_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_events ADD COLUMN first_opened_at TEXT;
ALTER TABLE email_events ADD COLUMN last_opened_at TEXT;
ALTER TABLE email_events ADD COLUMN first_clicked_at TEXT;
ALTER TABLE email_events ADD COLUMN last_clicked_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_events_tracking_id ON email_events(tracking_id);
