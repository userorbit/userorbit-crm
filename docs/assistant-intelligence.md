# Assistant intelligence API

Exports: `handleRequest(request, env, {path,workspaceId,auth,helpers})`, `extractCommitments(env, context, input)`, `getAttention(env, context)`, `buildMeetingBrief(env, context, eventId)`, `createDraft(env, context, input)`. Context uses the shared contract. No sends or cron side effects.

All routes below are relative to `/api/assistant/intelligence`; JSON responses are described below. Coordinator enforces workspace read membership; module additionally enforces write membership through `helpers.requireWorkspaceWrite` for mutations. Personal records are always scoped by workspace and authenticated user.

- GET `/commitments` → `{commitments}` (newest 100; optional `status=proposed|accepted|resolved|dismissed`).
- POST `/commitments/extract` body `{contactId?}` → `{commitments,provider,mailAvailable}`; scan latest 100 personal messages, deduplicate evidence, never replace review state.
- PATCH `/commitments/:id` body `{status,title?,dueAt?}` → `{commitment}`; status required, dates ISO or null, title editable. Resolution is explicit human review.
- POST `/commitments/:id/task` → `{commitment,taskId}`; idempotent conversion of accepted commitment only.
- GET `/attention` → `{suggestions,mailAvailable}`; combines existing next best actions with inbound reply waiting, accepted commitments, and long gaps in previously reciprocal relationships (latest message for up to 100 contacts; reciprocity uses full stored history). Persists suggestions, preserves dismissal/snooze.
- PATCH `/attention/:id` body `{status:'dismissed'|'snoozed'|'active',snoozedUntil?}` → `{suggestion}`; snooze requires future ISO time.
- GET `/briefs/:eventId` → `{event,account,contact,commitments,recentMessages,tasks,opportunities,sources,summary,mailAvailable}`; grounded CRM/calendar brief.
- GET `/writing-samples` → `{samples,mailAvailable}`; latest 20 own sent messages (preview only).
- POST `/drafts` body `{contactId,instruction,sampleIds?:string[]}` → `{draft}`. Sample IDs are the returned writing sample `messageId` (internal mail row ID), max 5; omitted selects up to 3 own recent sent messages. Invalid/unowned IDs rejected. Draft includes subject/body/provider/sampleIds/sources/status. Deterministic fallback when AI unavailable; no send capability.
- GET `/drafts` → `{drafts}` (newest 50).
- PATCH `/drafts/:id` body `{subject?,body?,status?:'draft'|'reviewed'|'discarded'}` → `{draft}`.

Migration 0049 owns `assistant_commitments`, `assistant_suggestions`, `assistant_drafts`. Mail is read-only through `assistant_mail_messages` contract fields. Missing mail table produces `mailAvailable:false`; other database errors propagate. Evidence contains source URLs (safe HTTP(S) when provided, otherwise authenticated mail-message API links), original quotes and message IDs. All extracted commitments start proposed. AI extraction must return verbatim quotes present in supplied evidence; deterministic extraction supports explicit English promises only and leaves ambiguous deadlines unset. AI failure returns fallback without retrying billable calls. Briefs use stored calendar and CRM facts without AI.

## Verification and integration notes

- `bun test tests/intelligence.test.js`: 13 tests / 53 assertions pass both with only baseline + 0049 and with the real mail-track 0048 applied. Provider responses are mocked; no live provider calls were made.
- Browser-target Bun build passes. Tests cover real SQLite migrations, cross-workspace/user isolation, viewer mutation denial, idempotent extraction/task conversion, dismiss/snooze, evidence rejection, AI failure/empty output, personal sent sample selection, and missing-mail compatibility.
- Coordinator wires authenticated requests and user-facing controls. These exported service functions assume the same authenticated context; direct automated dispatch must supply the intended user context. No `runScheduled` export.
- Extraction scans at most 100 recent messages per request (optionally one contact). Attention considers at most 100 distinct contacts plus existing core actions. AI extraction is English-oriented in deterministic mode, leaves deadlines unset for human confirmation, and rejects common quoted/forwarded/conditional promises. It is a review aid, not a guarantee that every promise is detected.
- Fallback drafts deliberately include editable placeholders and do not pretend to reproduce a sender's style. Configured AI uses selected samples for style; generated text always requires human review. AI unavailability returns fallback; the module never retries or sends mail.
- Commitments retain their review state and evidence after mail sync. Resolving a commitment does not automatically complete its converted task; the task remains independently managed in the existing CRM.

## Completion and deadline suggestions

`GET /commitments`, `GET /commitments/:id`, and `POST /commitments/extract` include `resolutionEvidence: [{messageId,url,subject,sentAt,quote}]`, `deadlineText`, `suggestedDueDate`, and `suggestedDueAt` on each commitment. Completion evidence is recomputed from at most 30 later messages in the exact original mail connection/thread, scoped to the same workspace/user. It requires explicit completion wording matching the promised action and a shared object term, excludes negation/conditional/questions and quoted mail, and never changes status. The UI can display the quoted evidence and offer its existing explicit Resolve control. Matching is conservative English heuristics and can miss or overmatch nuanced language; it is always a suggestion.

Exact ISO dates become `suggestedDueDate` (YYYY-MM-DD). Only an explicit timezone-bearing ISO timestamp becomes `suggestedDueAt`; relative/ambiguous dates remain quoted `deadlineText`. No suggestion sets `due_at` automatically. Submit the reviewed exact timestamp via the existing PATCH `{status,dueAt}` route. No migration extension is required; these fields derive from original evidence and current mail.
