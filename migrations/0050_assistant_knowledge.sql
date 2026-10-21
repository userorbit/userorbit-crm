CREATE TABLE IF NOT EXISTS assistant_knowledge_documents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'personal' CHECK (visibility IN ('personal', 'workspace')),
  extraction_method TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_scope ON assistant_knowledge_documents(workspace_id, user_id, visibility);
CREATE TABLE IF NOT EXISTS assistant_knowledge_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES assistant_knowledge_documents(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  body TEXT NOT NULL,
  UNIQUE(document_id, position)
);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_scope ON assistant_knowledge_chunks(workspace_id, document_id);
