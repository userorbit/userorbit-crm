CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  segment TEXT NOT NULL DEFAULT 'product',
  source TEXT,
  observation TEXT,
  status TEXT NOT NULL DEFAULT 'target',
  owner TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_segment ON accounts(segment);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  title TEXT,
  linkedin_url TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON contacts(account_id);

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'research',
  value_cents INTEGER NOT NULL DEFAULT 0,
  confidence INTEGER NOT NULL DEFAULT 25,
  close_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'research',
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sequences (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sequence_steps (
  id TEXT PRIMARY KEY,
  sequence_id TEXT NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 0,
  template_id TEXT NOT NULL REFERENCES email_templates(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sequence_steps_order ON sequence_steps(sequence_id, step_order);

CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id TEXT PRIMARY KEY,
  sequence_id TEXT NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  current_step_order INTEGER NOT NULL DEFAULT 1,
  next_send_at TEXT NOT NULL,
  last_sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sequence_enrollments_unique ON sequence_enrollments(sequence_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_due ON sequence_enrollments(status, next_send_at);

CREATE TABLE IF NOT EXISTS email_events (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  sequence_id TEXT REFERENCES sequences(id) ON DELETE SET NULL,
  sequence_step_id TEXT REFERENCES sequence_steps(id) ON DELETE SET NULL,
  direction TEXT NOT NULL DEFAULT 'outbound',
  status TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  provider_message_id TEXT,
  error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_events_contact_id ON email_events(contact_id);

INSERT INTO email_templates (id, name, subject, body, created_at, updated_at)
VALUES
  ('tmpl_observation', 'Observation', 'Quick question about {{account.name}} onboarding', 'Hi {{contact.name}},\n\nNoticed {{account.observation}}.\n\nI could not find an in-app announcement, onboarding flow, or help article connected to it. Curious how you are currently handling feature adoption after launch?\n\nBest,\n{{sender.name}}', datetime('now'), datetime('now')),
  ('tmpl_teardown', 'Quick teardown', 'A quick product adoption note', 'Hi {{contact.name}},\n\nI put together a short teardown of a few places where {{account.name}} could connect onboarding, help docs, and feature announcements more tightly.\n\nWorth sending over?\n\nBest,\n{{sender.name}}', datetime('now'), datetime('now')),
  ('tmpl_example', 'Relevant example', 'Example from another SaaS rollout', 'Hi {{contact.name}},\n\nOne pattern that works well after a launch is keeping the announcement, onboarding checklist, and help article tied to the same product change.\n\nThat is the workflow UserOrbit is built around. Is improving post-launch adoption a current priority for your team?\n\nBest,\n{{sender.name}}', datetime('now'), datetime('now')),
  ('tmpl_close_loop', 'Close the loop', 'Close the loop?', 'Hi {{contact.name}},\n\nSeems like timing may not be right.\n\nHappy to reconnect later if onboarding, product communication, or feature adoption becomes a priority.\n\nBest,\n{{sender.name}}', datetime('now'), datetime('now'));

INSERT INTO sequences (id, name, description, status, created_at, updated_at)
VALUES ('seq_userorbit_outreach', 'UserOrbit 4-email outreach', 'Observation, teardown, relevant example, close-the-loop sequence for founder-led outreach.', 'active', datetime('now'), datetime('now'));

INSERT INTO sequence_steps (id, sequence_id, step_order, delay_days, template_id, created_at, updated_at)
VALUES
  ('step_observation', 'seq_userorbit_outreach', 1, 0, 'tmpl_observation', datetime('now'), datetime('now')),
  ('step_teardown', 'seq_userorbit_outreach', 2, 3, 'tmpl_teardown', datetime('now'), datetime('now')),
  ('step_example', 'seq_userorbit_outreach', 3, 5, 'tmpl_example', datetime('now'), datetime('now')),
  ('step_close_loop', 'seq_userorbit_outreach', 4, 7, 'tmpl_close_loop', datetime('now'), datetime('now'));
