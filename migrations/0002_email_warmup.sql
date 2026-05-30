CREATE TABLE IF NOT EXISTS warmup_mailboxes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  smtp_host TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  daily_min INTEGER NOT NULL DEFAULT 5,
  daily_max INTEGER NOT NULL DEFAULT 10,
  send_window_start TEXT NOT NULL DEFAULT '09:30',
  send_window_end TEXT NOT NULL DEFAULT '18:30',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS warmup_recipients (
  id TEXT PRIMARY KEY,
  mailbox_id TEXT NOT NULL REFERENCES warmup_mailboxes(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_warmup_recipients_unique ON warmup_recipients(mailbox_id, email);

CREATE TABLE IF NOT EXISTS warmup_plans (
  id TEXT PRIMARY KEY,
  mailbox_id TEXT NOT NULL REFERENCES warmup_mailboxes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  daily_min INTEGER NOT NULL,
  daily_max INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_warmup_plans_mailbox ON warmup_plans(mailbox_id, status);

CREATE TABLE IF NOT EXISTS warmup_messages (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES warmup_plans(id) ON DELETE CASCADE,
  mailbox_id TEXT NOT NULL REFERENCES warmup_mailboxes(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES warmup_recipients(id) ON DELETE CASCADE,
  scheduled_for TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_message_id TEXT,
  error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_warmup_messages_due ON warmup_messages(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_warmup_messages_mailbox ON warmup_messages(mailbox_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_warmup_messages_plan ON warmup_messages(plan_id, scheduled_for);

CREATE TABLE IF NOT EXISTS warmup_interactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES warmup_messages(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_warmup_interactions_message ON warmup_interactions(message_id);
