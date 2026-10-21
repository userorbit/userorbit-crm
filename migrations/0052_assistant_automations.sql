CREATE TABLE assistant_jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  instructions TEXT NOT NULL,
  schedule_json TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK(max_attempts BETWEEN 1 AND 3),
  next_run_at TEXT NOT NULL,
  next_attempt_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  lease_until TEXT,
  last_result_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_assistant_jobs_due ON assistant_jobs(enabled,next_attempt_at);
CREATE INDEX idx_assistant_jobs_owner ON assistant_jobs(workspace_id,user_id);
CREATE TABLE assistant_job_runs (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES assistant_jobs(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('running','retrying','succeeded','unchanged','failed','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  summary TEXT,
  result_json TEXT,
  error_code TEXT,
  UNIQUE(job_id,scheduled_at)
);
CREATE INDEX idx_assistant_job_runs_owner ON assistant_job_runs(workspace_id,user_id,job_id,scheduled_at);
CREATE TABLE assistant_job_notifications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES assistant_jobs(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL UNIQUE REFERENCES assistant_job_runs(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('result','failure')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read_at TEXT
);
CREATE INDEX idx_assistant_job_notifications_owner ON assistant_job_notifications(workspace_id,user_id,created_at);
