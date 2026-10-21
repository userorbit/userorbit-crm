# Relationship assistant implementation

Baseline: public userorbit/userorbit-crm commit f7ad0d5. The primary local checkout has unrelated uncommitted UI/config changes and must remain untouched. This integration branch adds optional capabilities without changing existing outbound sequence behavior.

## Module contract

Each feature owns its own module, tests, documentation, and numbered migration. Do not edit src/worker.js, src/ui.js, package.json, shared.js, or other feature modules; the coordinating chat integrates these files.

All authenticated feature endpoints live under /api/assistant/<feature>. Each module exports `handleRequest(request, env, context)` returning a Response, or null for an unhandled path. Context is `{ path, workspaceId, auth, helpers }`, where path is the substring after `/api/assistant/` (e.g. `mail/connections`). The coordinator verifies read membership on all requests and write membership on all non-GET/HEAD requests; individual admin routes must additionally call helpers.requireWorkspaceAdmin(env, auth, workspaceId). All SQL must scope by workspace and personal data by user where applicable.

`helpers` exposes existing Worker functions: json, readJson, httpError, requireAuth, resolveWorkspaceId, requireWorkspaceRole, requireWorkspaceWrite, requireWorkspaceAdmin, recordAuditLog, getContact, getAccount, createContactEmailDraft, getNextBestActions, createAiInsight, createCommunicationAiNote, getReports, parseJsonObject, sha256Hex. Inspect their signatures in src/worker.js. Core functions are not exported; access through context.helpers. Prefer own pure functions for testability.

Modules may export `runScheduled(env, helpers)` for bounded cron work. No new feature may send outreach automatically. Suggestions/drafts require a human send; existing sequences stay unchanged. Agent jobs store in-app results and notify only on meaningful changes. OAuth callbacks/public MCP routes need separately exported handlers and explicit route documentation. Never return credentials or token-bearing configuration from public JSON.

## Ownership

- Mail: src/assistant/mail.js, migration 0048, tests/mail*.test.js. Full history, OAuth refresh, scheduled incremental sync, safe identity matching, sent records for voice/intelligence. Own `assistant_mail_messages` (workspace_id,user_id,provider_message_id,contact_id,from_email,to_json,subject,body,direction,sent_at,thread_id,source_url) and connections tables. Publish final schema.
- Intelligence: src/assistant/intelligence.js, migration 0049, tests/intelligence*.test.js. Commitments, attention, briefs, voice-aware drafts. Read assistant_mail_messages with missing-table graceful compatibility for standalone tests if necessary, but production applies all migrations.
- Knowledge: src/assistant/knowledge.js, migration 0050, tests/knowledge*.test.js. Cited conversational search, uploaded documents/notes and extraction. Public export searchKnowledge(env,workspaceId,query,options) for agents/MCP.
- Network: src/assistant/network.js, migration 0051, tests/network*.test.js, optional chrome-extension/. LinkedIn CSV/JSON import, capture, identity mapping, intro graph, company/contact change observations. External live monitoring must use configured real providers and report not configured clearly.
- Automations: src/assistant/automations.js, migration 0052, tests/automations*.test.js. Configurable recurring jobs, run history, dedup/leases, templates for intelligence/network/knowledge; dispatcher injected by coordinator so modules stay independent.
- MCP: src/assistant/mcp.js, migration 0053, tests/mcp*.test.js. OAuth PKCE, scoped read tools and explicit approved writes over streamable HTTP, API token compatibility and discovery. Expose public handler; coordinator passes authenticated core helpers plus capability dispatch.

## Acceptance

Real end-to-end routes and usable UI, not scaffold placeholders. Add feature tests using Bun, disposable local SQLite/D1 tests, workspace isolation, viewer denial, malformed inputs, provider retries and dedup where relevant. No remote D1 migration, deployment, real email sends, or billable external calls. Commit only owned files, report SHA and checks. Do not push; coordinator integrates and pushes the verified branch. No claims of live OAuth/provider validation without credentials.
