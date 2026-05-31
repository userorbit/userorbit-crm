ALTER TABLE report_alerts ADD COLUMN owner_label TEXT NOT NULL DEFAULT '';
ALTER TABLE report_alerts ADD COLUMN runbook_url TEXT NOT NULL DEFAULT '';
ALTER TABLE report_alerts ADD COLUMN runbook_note TEXT NOT NULL DEFAULT '';
