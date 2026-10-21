# Assistant mailbox integration

Owned module `src/assistant/mail.js`; migration `0048_assistant_mail.sql`. Legacy mailbox sources and outbound sequences are untouched. All imports are read-only; unmatched or ambiguous participants remain messages with null contact_id, never new contacts.

## Routes and exports

`handleRequest(request, env, {path,workspaceId,auth,helpers})`: path excludes `/api/assistant/`; auth.user.id is mandatory. Coordinator MUST verify workspace membership on reads and write membership on mutations. API tokens must keep their bound workspace. Routes:

- GET `mail/connections` → `{connections:[{id,provider,account_email,status,last_sync_at,last_error,created_at}]}` (personal only).
- POST `mail/connect`, JSON `{provider:"gmail"|"microsoft"}` → `{url}`. Navigate browser to URL.
- GET `mail/messages?offset=0` → `{messages,nextOffset}`, 50 personal messages per page. Treat body/subject as plain text, never innerHTML.
- GET `mail/messages/:provider_message_id` → `{message}` (also accepts local message UUID; personal scope, 404 if inaccessible).
- POST `mail/connections/:id/sync` → `{imported,hasMore}`.
- DELETE `mail/connections/:id` → `{disconnected:true}`; removes encrypted credentials and imported history locally. Provider-side consent can also be revoked by user in provider settings.

`handleOAuthCallback(request,env,context)` is a separate callback export; register `/api/assistant/mail/oauth/callback` as the redirect URI. The coordinator serves a same-origin GET bridge which reads the existing browser auth/workspace and POSTs code/state with an Authorization header; dispatch that authenticated POST to this export BEFORE generic request dispatch. Never put bearer tokens in callback URLs. Resolve its workspace from the initiating browser workspace, verify write membership, and supply the same context. State is one-use, expires in ten minutes, and requires matching user AND workspace. It returns JSON `{connected:true,provider,accountEmail}`. No open redirect. OAuth registration redirect URIs must match the configured callback exactly. Switching workspace during consent deliberately rejects callback.

`startOAuth(env,context,provider)` and `syncConnection(env,id,workspaceId,userId)` are callable helpers. `runScheduled(env,helpers)` runs bounded personal sync work (two due connections, one page each, at most 20 Gmail detail messages; pending IDs resume on subsequent runs); coordinator invokes in cron. Normalizers `normalizeGmail` and `normalizeMicrosoft` exported for tests.

## Configuration

Set secrets ASSISTANT_MAIL_TOKEN_KEY (random 32+ character secret; preserve across deploys), ASSISTANT_GOOGLE_CLIENT_ID, ASSISTANT_GOOGLE_CLIENT_SECRET, ASSISTANT_GOOGLE_REDIRECT_URI, ASSISTANT_MICROSOFT_CLIENT_ID, ASSISTANT_MICROSOFT_CLIENT_SECRET, ASSISTANT_MICROSOFT_REDIRECT_URI. Missing provider configuration returns 503. Google uses gmail.readonly; Microsoft uses offline_access User.Read Mail.Read with common tenant authorization. Production uses fetch; tests inject MAIL_FETCH.

## Schema

`assistant_mail_messages`: id, connection_id, workspace_id, user_id, provider_message_id, contact_id nullable, from_email, to_json (recipient address array), subject, body (plain text), direction (`inbound`/`outbound`), sent_at, thread_id, source_url. Unique(connection_id,provider_message_id). Any consuming intelligence/search module MUST scope workspace_id AND user_id. `assistant_mail_connections` stores encrypted credentials, private cursor JSON, provider/email, status, timestamps, lease and scheduling fields. Never serialize credentials/cursor to client. `assistant_mail_oauth_states` stores encrypted PKCE verifier with owner, workspace and expiry.

## Sync semantics and limits

Gmail does complete paginated history including sent messages, then history.list changes from the profile anchor captured before first page; expired history restarts full sync with dedup. Microsoft scans all mailbox messages (including sent/archive/custom folders) then scans lastModifiedDateTime changes with a five-minute overlap, preserving opaque next links restricted to Graph's mailbox endpoint. Drafts excluded. It is an imported history archive: provider deletions are not mirrored. Attachments are not imported, except Gmail text-body parts stored via attachmentId. HTML is reduced to text; rich formatting is not retained. Messages are committed before cursors, so interrupted pages replay safely. Transient failures defer retry five minutes; auth failures require reconnect. Local disconnect purges imported history. No live credentials or provider accounts are used in tests; OAuth production consent/application verification remains deployment setup.

Provider references: https://developers.google.com/workspace/gmail/api/guides/sync and https://learn.microsoft.com/en-us/graph/api/user-list-messages.

Scheduling requires helpers.requireWorkspaceWrite; disabled users and removed members/viewers do not trigger provider calls. Scheduled work checks users.status is active before checking write membership. Each provider call has a 15s timeout and each message-page API phase has a 55s deadline, within the 120s lease. Backoff is persisted rather than sleeping/retrying inside a Worker invocation.

The scheduled queue excludes inactive users before its two-connection limit. Failed access checks defer that connection for five minutes without provider calls, allowing later eligible mailboxes to run on the next tick. Access is rechecked on retry so restored membership resumes automatically.
