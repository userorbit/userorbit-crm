# Relationship assistant

Open `/assistant` after signing in to the existing CRM. The CRM sidebar links to this page. Existing accounts, reports, sequences, calendar integrations, manual sending, and dashboard pages keep their original routes and behavior.

Apply migrations using the existing migration workflow before opening the new features. Migrations 0048–0053 are additive. Back up production data before normal deployment upgrades. This implementation does not deploy or migrate production automatically.

## Included workflows

1. Connect Gmail or Microsoft 365 with OAuth; import full personal conversation and sent history through bounded recurring sync. Legacy inbox sources remain separate.
2. Extract proposed promises, review quoted deadlines/completion evidence, accept, date, resolve, and explicitly turn an accepted promise into a task.
3. Review relationship-aware attention suggestions alongside the existing next-best actions. Dismiss suggestions or prepare a note.
4. Prepare a brief from a saved calendar meeting, open tasks, opportunities, commitments, and personal correspondence.
5. Draft a follow-up from contact context and selected own sent samples; edit, copy, and mark reviewed. New assistant routes never send outreach.
6. Ask questions across authorized CRM/history and receive cited sources. Text and model-backed answers clearly report their mode.
7. Import LinkedIn CSV/JSON connections into a personal review queue. Confirm identity matches without creating fake contact emails or silently merging CRM records.
8. Capture chosen LinkedIn profiles, record evidenced relationships/referrals, and inspect bounded introduction paths.
9. Record profile/company snapshots and compare changes. Scheduled monitoring is optional and requires a configured observation service.
10. Create recurring attention, promise, meeting, change-review, or cited-research jobs with personal run history and in-app notifications. Cron executes queued runs; no outreach is sent. Template rules run without a model; natural-language filtering of those results requires configured AI and is labeled when unavailable.
11. Connect compatible MCP clients through OAuth with workspace-scoped read tools. Draft tools require separate exact, single-use human approval from the assistant's AI connections screen.
12. Add personal or explicitly shared text/Markdown/CSV/PDF knowledge and open authorized citation sources. PDFs require configured extraction. Original PDF binaries are not stored.

## Optional configuration

No external model or mailbox is called unless configured or explicitly connected. Existing CRM functionality needs none of the following variables.

- `OPENAI_API_KEY`: enables model-backed commitment extraction, writing voice generation, cited answers, and PDF extraction. `OPENAI_MODEL` selects the model. Without a key, explicit-evidence extraction and labeled draft/retrieval fallbacks work; PDF extraction reports that configuration is required.
- `KNOWLEDGE_EMBEDDING_MODEL`: opts into semantic reranking. Without it, retrieval uses lexical matching. This is bounded candidate reranking, not an exhaustive vector index.
- `ASSISTANT_MAIL_TOKEN_KEY`: stable random secret, at least 32 characters; encrypts OAuth credentials. Preserve it across deployments or reconnect affected mailboxes after rotation.
- `ASSISTANT_GOOGLE_CLIENT_ID`, `ASSISTANT_GOOGLE_CLIENT_SECRET`, `ASSISTANT_GOOGLE_REDIRECT_URI`: configure Gmail read-only OAuth. The redirect URI is `https://YOUR-CRM/api/assistant/mail/oauth/callback`.
- `ASSISTANT_MICROSOFT_CLIENT_ID`, `ASSISTANT_MICROSOFT_CLIENT_SECRET`, `ASSISTANT_MICROSOFT_REDIRECT_URI`: equivalent Microsoft application configuration with the same callback path.
- Optional `NETWORK_OBSERVER` service binding: real provider adapter described in [network API docs](assistant-network.md). Without it, automatic monitors stay unavailable; imported history, manual observations, and referral paths still work.
- Optional `MCP_PUBLIC_ORIGIN` and `MCP_ALLOWED_ORIGINS`: pin the canonical MCP origin and explicitly allow browser clients where required. No wildcard origin grant is needed for normal server-to-server clients.

Mailbox OAuth is read-only and new assistant jobs only create suggestions/drafts/in-app results. Existing authorized outbound sequences keep their pre-existing behavior. Imported mailbox history and personal documents, graph records, jobs, approvals, and drafts are scoped to workspace plus user. Disconnected mailbox history is removed locally; already reviewed commitments/drafts remain until managed by the user and may cite unavailable original evidence.

## API details

See [mail](assistant-mail.md), [intelligence](assistant-intelligence.md), [knowledge](assistant-knowledge.md), [network](assistant-network.md), [recurring jobs](assistant-automations.md), and [MCP/OAuth](assistant-mcp.md).

## Verification

Run `bun install --frozen-lockfile`, `bun test`, and `bunx wrangler deploy --dry-run --outdir /tmp/crm-worker-build`. Tests use disposable SQLite and mocked providers, never a production database or real outbound sends. Live provider consent, extraction quality on customer PDFs, and an external MCP client handshake require configured deployment accounts and are not claimed by these tests.
