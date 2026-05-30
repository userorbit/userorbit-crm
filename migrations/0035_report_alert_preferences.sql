ALTER TABLE report_alerts ADD COLUMN notify_on_recovery INTEGER NOT NULL DEFAULT 0;
ALTER TABLE report_alerts ADD COLUMN repeat_interval_hours INTEGER NOT NULL DEFAULT 0;
ALTER TABLE report_alerts ADD COLUMN last_state TEXT NOT NULL DEFAULT 'ok';
