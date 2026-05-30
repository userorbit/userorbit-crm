ALTER TABLE users ADD COLUMN password_hash TEXT;

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  last_used_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, expires_at);
