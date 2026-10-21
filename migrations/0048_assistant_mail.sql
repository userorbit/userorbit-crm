CREATE TABLE assistant_mail_connections (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 provider TEXT NOT NULL CHECK(provider IN ('gmail','microsoft')), account_email TEXT NOT NULL,
 credentials TEXT NOT NULL, cursor_json TEXT NOT NULL DEFAULT '{}',
 status TEXT NOT NULL DEFAULT 'active', last_sync_at TEXT, last_error TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0, lease_id TEXT, next_sync_at INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, UNIQUE(workspace_id,user_id,provider,account_email)
);
CREATE TABLE assistant_mail_oauth_states (
 state TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, user_id TEXT NOT NULL,
 provider TEXT NOT NULL, verifier TEXT NOT NULL, redirect_uri TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE assistant_mail_messages (
 id TEXT PRIMARY KEY, connection_id TEXT NOT NULL REFERENCES assistant_mail_connections(id) ON DELETE CASCADE,
 workspace_id TEXT NOT NULL, user_id TEXT NOT NULL, provider_message_id TEXT NOT NULL,
 contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
 from_email TEXT NOT NULL, to_json TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
 direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound')), sent_at TEXT, thread_id TEXT, source_url TEXT,
 UNIQUE(connection_id,provider_message_id)
);
CREATE INDEX assistant_mail_messages_personal ON assistant_mail_messages(workspace_id,user_id,sent_at);
CREATE INDEX assistant_mail_connections_due ON assistant_mail_connections(status,next_sync_at);
