ALTER TABLE report_alerts ADD COLUMN integration_id TEXT REFERENCES workspace_integrations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_report_alerts_integration ON report_alerts(integration_id);
