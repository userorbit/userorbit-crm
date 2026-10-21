-- Empty email means no address was supplied; real addresses remain unique.
DROP INDEX IF EXISTS idx_contacts_email;
CREATE UNIQUE INDEX idx_contacts_email ON contacts(email) WHERE email <> '';
CREATE TABLE legacy_memberships (
 source_workspace_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id),
 team_id TEXT NOT NULL REFERENCES teams(id), role TEXT NOT NULL,
 PRIMARY KEY(source_workspace_id,user_id)
);
CREATE TABLE legacy_workspace_owners (
 workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id), source_workspace_id TEXT NOT NULL,
 owner_id TEXT NOT NULL REFERENCES users(id)
);
CREATE TABLE legacy_records (
 id TEXT PRIMARY KEY, source_table TEXT NOT NULL, source_id TEXT NOT NULL,
 workspace_id TEXT, title TEXT NOT NULL, payload_json TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(source_table,source_id)
);
CREATE TABLE legacy_record_access (
 record_id TEXT NOT NULL REFERENCES legacy_records(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id), PRIMARY KEY(record_id,user_id)
);
CREATE INDEX idx_legacy_access_user ON legacy_record_access(user_id,record_id);
CREATE INDEX idx_legacy_records_type ON legacy_records(source_table,updated_at);
CREATE TABLE legacy_record_chunks (
 record_id TEXT NOT NULL REFERENCES legacy_records(id) ON DELETE CASCADE,
 chunk_index INTEGER NOT NULL,data TEXT NOT NULL, PRIMARY KEY(record_id,chunk_index)
);
CREATE TABLE legacy_record_blobs (
 record_id TEXT NOT NULL REFERENCES legacy_records(id) ON DELETE CASCADE,
 chunk_index INTEGER NOT NULL,data TEXT NOT NULL, PRIMARY KEY(record_id,chunk_index)
);
