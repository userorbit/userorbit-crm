ALTER TABLE report_alerts ADD COLUMN escalation_after_runs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE report_alerts ADD COLUMN escalation_delivery_url TEXT NOT NULL DEFAULT '';
ALTER TABLE report_alerts ADD COLUMN escalation_integration_id TEXT REFERENCES workspace_integrations(id) ON DELETE SET NULL;
ALTER TABLE report_alerts ADD COLUMN consecutive_triggered_runs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE report_alerts ADD COLUMN last_escalated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_report_alerts_escalation_integration ON report_alerts(escalation_integration_id);
