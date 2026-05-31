ALTER TABLE report_alerts ADD COLUMN acknowledged_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE report_alerts ADD COLUMN acknowledged_at TEXT;
ALTER TABLE report_alerts ADD COLUMN resolved_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE report_alerts ADD COLUMN resolved_at TEXT;
