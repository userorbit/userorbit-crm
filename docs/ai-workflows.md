# AI CRM workflows

Set `OPENAI_API_KEY` as a Cloudflare Worker secret. The default model is `gpt-6-luna`; `OPENAI_MODEL` can explicitly override it. Never place the key in browser settings or source control. The implementation uses OpenAI's Responses API with `store: false`. Model support: https://developers.openai.com/api/docs/models/gpt-6-luna.

## Connect and review

Connect a personal Google Workspace account from the relationship assistant's Google Workspace section. Google OAuth credentials and the encryption key must first be configured by the operator; see the Google Workspace setup guide. Email and calendars remain scoped to the connecting user and workspace. Disconnecting removes the connection's source records; previously extracted review proposals remain private to the user until workspace/user deletion.

Open CRM updates and extract suggestions. Extraction sends at most 40 bounded sources to OpenAI: your active connected mailbox messages, your active connected calendar descriptions, and communication notes/transcripts accessible within the workspace. Existing contacts are matched through explicit email participants or the communication's linked contact. Personal calendar matching requires exactly one existing contact among the attendees. It does not create contacts, companies, deals, or send messages.

The AI can propose contact title, phone and LinkedIn URL; company observation; and an explicitly quoted named deal's ISO close date. It cannot assign owners, change stages, consent or access, or trigger outreach. Monetary updates are deliberately excluded because native CRM deals do not persist a currency; the assistant never assumes a currency or converts money. Quotes must occur verbatim in the supplied source, contact/date/URL values must appear in that quote, and named deal dates must appear in the quote. Ambiguous identities, unsupported fields, missing citations, malformed values and unchanged values are skipped.

Each proposal shows the previous value, proposed value and source excerpt. Accept or reject each explicitly. Acceptance rechecks current workspace permissions and migrated contributor restrictions, then atomically checks the original value and record modification time before applying the single field and writing an audit entry. A stale proposal returns HTTP 409 rather than overwriting subsequent edits. Duplicate extractions preserve prior review decisions. Private source excerpts are not copied into shared audit metadata.

The optional CRM update review recurring job only fills the private review queue. No scheduled or mailbox-sync process accepts proposals. Free-form source text and recurring instructions cannot direct database writes. A missing API key, provider failure, incomplete response or malformed output returns a clear unavailable response for CRM update extraction; it never fabricates proposals. Older non-generative assistant features retain their explicitly labelled rule-based/extractive behavior.

## API

All endpoints require the selected workspace and existing assistant authentication. Writes require workspace write access.

- `GET /api/assistant/updates/status`: `{configured, model, requiresReview}` without secrets. Configuration is not a live provider availability test.
- `GET /api/assistant/updates`: `{updates, status}` for the current user only. `before_value` and `after_value` are native JSON values.
- `POST /api/assistant/updates/extract` with `{}`: `{created, skipped, sourceCount, model}`.
- `POST /api/assistant/updates/:id/review` with `{action:"accept"}` or `{action:"reject"}`.

The `crm_review` recurring template invokes the same extraction and returns a queue summary. Personal calendar events can also feed existing meeting briefs and cited knowledge search. Neither a source ID nor a proposal ID grants access across users or workspaces.

## Verification

Mocked-provider tests cover the exact model/schema request, absence of automatic record changes, scope and credential isolation, explicit review, viewer denial, migrated contributor deal restrictions, stale proposals, duplicate decisions, audit logging, malformed provider output, unsupported quotes, disconnected sources, and private meeting briefs/knowledge. No production OpenAI request or real email send is needed for these checks.
