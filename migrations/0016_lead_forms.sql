CREATE TABLE IF NOT EXISTS lead_forms (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  public_key TEXT NOT NULL UNIQUE,
  source TEXT,
  default_owner TEXT,
  default_segment TEXT NOT NULL DEFAULT 'growth',
  default_status TEXT NOT NULL DEFAULT 'target',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_forms_workspace_slug ON lead_forms(workspace_id, slug);
CREATE INDEX IF NOT EXISTS idx_lead_forms_workspace ON lead_forms(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS lead_form_submissions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  form_id TEXT NOT NULL REFERENCES lead_forms(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  payload_json TEXT,
  remote_ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_workspace ON lead_form_submissions(workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_form ON lead_form_submissions(form_id, created_at);
