ALTER TABLE report_alerts ADD COLUMN second_escalation_after_runs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE report_alerts ADD COLUMN second_escalation_delivery_url TEXT NOT NULL DEFAULT '';
ALTER TABLE report_alerts ADD COLUMN second_escalation_integration_id TEXT REFERENCES workspace_integrations(id) ON DELETE SET NULL;
ALTER TABLE report_alerts ADD COLUMN last_second_escalated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_report_alerts_second_escalation_integration ON report_alerts(second_escalation_integration_id);
