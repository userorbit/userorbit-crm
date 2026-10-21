CREATE TABLE IF NOT EXISTS assistant_commitments (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, user_id TEXT NOT NULL,
  contact_id TEXT, message_id TEXT NOT NULL, evidence_key TEXT NOT NULL,
  title TEXT NOT NULL, quote TEXT NOT NULL, source_url TEXT NOT NULL,
  owner TEXT NOT NULL CHECK(owner IN ('self','contact')), due_at TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','accepted','resolved','dismissed')),
  task_id TEXT, provider TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  UNIQUE(workspace_id,user_id,message_id,evidence_key)
);
CREATE INDEX IF NOT EXISTS idx_assistant_commitments_scope ON assistant_commitments(workspace_id,user_id,status);
CREATE TABLE IF NOT EXISTS assistant_suggestions (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, user_id TEXT NOT NULL, suggestion_key TEXT NOT NULL,
  payload_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','dismissed','snoozed')),
  snoozed_until TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  UNIQUE(workspace_id,user_id,suggestion_key)
);
CREATE TABLE IF NOT EXISTS assistant_drafts (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, user_id TEXT NOT NULL, contact_id TEXT NOT NULL,
  subject TEXT NOT NULL, body TEXT NOT NULL, instruction TEXT NOT NULL,
  sample_ids_json TEXT NOT NULL, sources_json TEXT NOT NULL, provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','reviewed','discarded')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assistant_drafts_scope ON assistant_drafts(workspace_id,user_id,created_at);
