ALTER TABLE assistant_mail_oauth_states ADD COLUMN requested_scopes TEXT;
ALTER TABLE assistant_mail_connections ADD COLUMN granted_scopes TEXT NOT NULL DEFAULT '';
ALTER TABLE assistant_mail_connections ADD COLUMN calendar_cursor_json TEXT NOT NULL DEFAULT '{}';
CREATE TABLE assistant_calendar_events (
 id TEXT PRIMARY KEY, connection_id TEXT NOT NULL REFERENCES assistant_mail_connections(id) ON DELETE CASCADE,
 workspace_id TEXT NOT NULL, user_id TEXT NOT NULL, provider_event_id TEXT NOT NULL,
 title TEXT NOT NULL, description TEXT, starts_at TEXT, ends_at TEXT, location TEXT, meeting_url TEXT,
 attendees_json TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL,
 UNIQUE(connection_id,provider_event_id)
);
CREATE INDEX assistant_calendar_events_personal ON assistant_calendar_events(workspace_id,user_id,starts_at);
CREATE TABLE assistant_mail_drafts (
 id TEXT PRIMARY KEY, connection_id TEXT NOT NULL REFERENCES assistant_mail_connections(id) ON DELETE CASCADE,
 workspace_id TEXT NOT NULL, user_id TEXT NOT NULL, content_json TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE assistant_mail_sends (
 id TEXT PRIMARY KEY, connection_id TEXT NOT NULL REFERENCES assistant_mail_connections(id) ON DELETE CASCADE,
 workspace_id TEXT NOT NULL, user_id TEXT NOT NULL, idempotency_key TEXT NOT NULL, payload_hash TEXT NOT NULL,
 status TEXT NOT NULL, provider_message_id TEXT, created_at TEXT NOT NULL,
 UNIQUE(connection_id,idempotency_key)
);
