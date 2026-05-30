ALTER TABLE workspace_message_channels ADD COLUMN inbound_key TEXT;

UPDATE workspace_message_channels
SET inbound_key = lower(hex(randomblob(16)))
WHERE inbound_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_message_channels_inbound_key ON workspace_message_channels(inbound_key);
