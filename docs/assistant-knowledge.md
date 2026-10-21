# Knowledge search integration

Completed: scoped source adapters, bounded ingestion, retrieval/answer routes, and SQLite isolation/provider tests.

Stable exports: `handleRequest(request, env, {path, workspaceId, auth, helpers})`, `searchKnowledge(env, workspaceId, query, options={userId, limit, semantic})`, `askKnowledge(env, workspaceId, query, options)`.
The caller must verify workspace membership for exports. `userId` must come from authenticated identity (never request JSON). Omitting it excludes personal documents and synced mail. CRM email events are workspace-shared, assistant mail is always personal.

Routes under `/api/assistant/knowledge`:
- GET `/search?q=...&limit=...` → `{query, retrievalMode, sources, warnings}`.
- POST `/ask` `{query, limit}` → search response plus `{answer, answerMode}`. No history is implicitly trusted or stored.
- GET `/documents` → `{documents}` (metadata only, up to 100 newest visible).
- POST `/documents` JSON `{name, text, mimeType?, visibility?}` for text/Markdown/CSV, or `{name, mimeType:'application/pdf', dataBase64, visibility?}`. Default visibility personal; workspace sharing is explicit. Returns `{document}` (201).
- DELETE `/documents/:id` → `{deleted:true}`; owner only, workspace writer required.
- GET `/sources/:type/:id` → `{source}` with current access rechecked; citation `url` includes workspaceId. Types account, contact, task, email, communication, document, mail. Document IDs identify chunks.

Requires migration 0050. New tables: assistant_knowledge_documents (id, workspace_id, user_id, name, mime_type, visibility, extraction_method, byte_size, created_at), assistant_knowledge_chunks (id, document_id, workspace_id, position, body). Atomic inserts; delete explicitly removes chunks atomically. No original binary stored.

Configuration: OPENAI_API_KEY enables real PDF extraction and cited answers through OpenAI Responses. OPENAI_MODEL defaults to gpt-5-mini. KNOWLEDGE_EMBEDDING_MODEL explicitly enables OpenAI embeddings and bounded semantic reranking (e.g. text-embedding-3-small); absent or failing provider is labeled lexical fallback. No provider calls occur without configuration. Sources sent to the provider are already authorized. PDF extraction is model-based, requires visual verification for critical content, and rejects empty/oversized results. No fake PDF parser.

Limits: 1 MiB decoded upload, 150,000 extracted characters, 200 chunks, 2 MiB JSON request, 500-character queries, 12 meaningful query terms, 20 results. Retrieval scans lexical matches within each authorized source and ranks a bounded candidate pool (20 per source); semantic mode adds up to 5 recent candidates per source and reranks the best 60 candidates in that pool, not the entire workspace. No exhaustive vector index. All returned excerpts are untrusted plain text; UI must use textContent. Source links are internal and do not honor arbitrary links inside uploaded text. Providers have timeouts, limited response bodies, no tools, and no authority to execute source instructions. Generated answers are constrained to validated source citation IDs; lexical extractive answers remain available on failure.

Verification: Bun SQLite/D1 tests cover all seven source types, cross-workspace and cross-user denial, share/delete ownership, viewer rejection, input bounds, configured PDF extraction request and incomplete-result failure, generated citation validation, semantic retrieval and 429 fallback, and optional-mail-table compatibility. 11 tests / 62 assertions pass, including atomic rollback and forged in-text citation rejection. Provider responses are mocked; no live paid calls were made.

Integration check: the same 11 tests pass with the real 0048 mail migration applied, using explicit-column message inserts and valid connection fixtures. Fetch is restored after each test.
