ALTER TABLE contacts ADD COLUMN phone TEXT;

CREATE TABLE IF NOT EXISTS workspace_message_channels (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  config_json TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_message_channels_workspace ON workspace_message_channels(workspace_id, status, type);

CREATE TABLE IF NOT EXISTS message_deliveries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES workspace_message_channels(id) ON DELETE CASCADE,
  communication_event_id TEXT REFERENCES communication_events(id) ON DELETE SET NULL,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL,
  status_code INTEGER,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_message_deliveries_channel ON message_deliveries(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_message_deliveries_workspace ON message_deliveries(workspace_id, created_at);
