ALTER TABLE export_schedules ADD COLUMN destination_type TEXT NOT NULL DEFAULT 'webhook';
ALTER TABLE export_schedules ADD COLUMN payload_format TEXT NOT NULL DEFAULT 'auto';

CREATE INDEX IF NOT EXISTS idx_export_schedules_destination ON export_schedules(workspace_id, destination_type, status);
