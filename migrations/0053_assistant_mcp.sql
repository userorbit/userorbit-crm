CREATE TABLE assistant_mcp_clients (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, redirects_json TEXT NOT NULL, created_at INTEGER NOT NULL, registration_key TEXT NOT NULL
);
CREATE INDEX assistant_mcp_clients_registration ON assistant_mcp_clients(registration_key,created_at);
CREATE TABLE assistant_mcp_grants (
 id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES assistant_mcp_clients(id),
 workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 scope TEXT NOT NULL, resource TEXT NOT NULL, expires_at INTEGER NOT NULL, revoked_at INTEGER
);
CREATE TABLE assistant_mcp_codes (
 hash TEXT PRIMARY KEY, grant_id TEXT NOT NULL REFERENCES assistant_mcp_grants(id) ON DELETE CASCADE,
 redirect_uri TEXT NOT NULL, challenge TEXT NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER
);
CREATE TABLE assistant_mcp_tokens (
 hash TEXT PRIMARY KEY, grant_id TEXT NOT NULL REFERENCES assistant_mcp_grants(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('access','refresh')), expires_at INTEGER NOT NULL, used_at INTEGER
);
CREATE INDEX assistant_mcp_tokens_grant ON assistant_mcp_tokens(grant_id);
CREATE TABLE assistant_mcp_approvals (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 tool TEXT NOT NULL, arguments_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER
);
CREATE INDEX assistant_mcp_approvals_owner ON assistant_mcp_approvals(workspace_id,user_id);
