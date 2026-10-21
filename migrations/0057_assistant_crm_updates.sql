CREATE TABLE assistant_crm_updates (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 entity_type TEXT NOT NULL CHECK(entity_type IN ('contact','account','opportunity')),
 entity_id TEXT NOT NULL, entity_name TEXT NOT NULL, field TEXT NOT NULL,
 before_value TEXT NOT NULL, after_value TEXT NOT NULL, record_updated_at TEXT NOT NULL,
 source_type TEXT NOT NULL, source_id TEXT NOT NULL, source_title TEXT NOT NULL,
 source_url TEXT NOT NULL, quote TEXT NOT NULL, fingerprint TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','accepted','rejected')),
 created_at TEXT NOT NULL, reviewed_at TEXT, review_token TEXT,
 UNIQUE(workspace_id,user_id,fingerprint)
);
CREATE INDEX idx_assistant_crm_updates_owner ON assistant_crm_updates(workspace_id,user_id,status,created_at);
