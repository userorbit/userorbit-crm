# Connect Google Workspace

The CRM supports personal Gmail and Google Calendar connections. Existing read-only Gmail and Microsoft connections remain supported. No email is sent automatically, including by scheduled or AI workflows.

## Worker configuration

Create a Google Cloud OAuth web application. Enable Gmail API and Google Calendar API, configure its consent screen and authorized users, and register this exact redirect:

`https://crm.userorb.com/api/assistant/mail/oauth/callback`

Set these Worker secrets:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ASSISTANT_MAIL_TOKEN_KEY`: a random secret of at least 32 characters; keep it stable or existing encrypted connections become unreadable.

Set `CRM_PUBLIC_URL=https://crm.userorb.com`. The callback is inferred from this canonical URL. Existing `ASSISTANT_GOOGLE_CLIENT_ID`, `ASSISTANT_GOOGLE_CLIENT_SECRET`, and `ASSISTANT_GOOGLE_REDIRECT_URI` take precedence and remain supported. Missing configuration is reported without exposing values by `GET /api/assistant/mail/setup`.

The Gmail read scope is restricted by Google. External production OAuth applications may require Google verification; internal Workspace consent or explicitly configured test users are suitable during setup. Adding the OpenAI API key alone does not configure Google OAuth.

## Grants and privacy

`POST /api/assistant/mail/connect` accepts `{ "provider": "gmail", "intent": "workspace" }` and returns the Google authorization URL. It requests only Gmail read and Calendar event read scopes. `intent: "send"` explicitly adds Gmail send; the default `readonly` preserves the earlier Gmail-only integration. No modify/delete/full-mailbox scope is requested. The actual scope returned by Google is recorded, and sending permission is checked independently.

OAuth uses PKCE, an encrypted verifier, an expiring single-use state bound to the initiating user/workspace, and encrypted access/refresh tokens. Refresh failures require reconnecting when permission is revoked. Disconnect attempts provider revocation, removes local credentials/messages and cascades private events, drafts and send records.

Mailbox content and calendar events belong to the connecting user in the chosen workspace. Private Calendar events are stored in `assistant_calendar_events`, never copied into the shared CRM calendar. Existing CRM events require a company association and are visible across their workspace; automatically inserting personal meetings there would disclose private meetings. Personal meeting briefs can read only the matching user's events with an active connection.

## Inbox endpoints

All routes below have the `/api/assistant/` prefix and require workspace membership. Mutations require workspace write access.

- `GET mail/inbox?connectionId=ID&folder=INBOX&query=TEXT&pageToken=TOKEN`: at most 20 normalized messages; folders `INBOX`, `SENT`, `DRAFT`, `STARRED`, or `ALL`.
- `GET mail/threads/THREAD_ID?connectionId=ID`: at most 50 normalized messages.
- `GET mail/attachments/MESSAGE_ID/ATTACHMENT_ID?connectionId=ID`: download only an attachment identified in that mailbox message's MIME tree; 5 MB maximum, download-only content disposition, no caching.
- `GET mail/drafts`, `POST mail/drafts`, `DELETE mail/drafts/ID`: personal CRM drafts. Drafts are local and do not require Google's broader compose scope. POST accepts `connectionId`, optional `id`, and the message fields below.
- `GET mail/calendar`: up to 100 private events from active personal connections.
- `POST mail/connections/ID/calendar-sync` with `{}`: fetch one 50-event page. Next page and incremental sync cursors persist; expired cursors reset safely. Due Google connections also synchronize one page during the existing authorized mail scheduler.

Normalized messages include `id`, `from`, `to`, `cc`, `subject`, plain-text `body`, `direction`, `sentAt`, `thread`, `url`, and attachment metadata. HTML is converted to text; remote tracking images are never rendered by these endpoints.

## Reviewed sending

Sending and send preview require a human browser session; API tokens, MCP and scheduled workflows cannot send. The connection must have Gmail send permission.

1. `POST mail/send-preview` with `connectionId`, `to`, `cc`, `bcc`, `subject`, `body`, optional `attachments`, and `mode` (`compose`, `reply`, `replyAll`, `forward`). Non-compose modes require the provider `messageId`. Address fields accept arrays or comma-separated email addresses.
2. Display the returned `preview` (actual recipients, subject, full body and attachments) to the user. Replies derive recipients from the original message; reply-all excludes the connected mailbox; forwards include the quoted message once.
3. Only on the user's explicit send action, `POST mail/send` with the **original** preview input plus `previewHash`, `confirmed: true`, and a unique 16–100 character `idempotencyKey`.

Preview hashes are encrypted, user/workspace/connection bound and expire after ten minutes. The server regenerates the canonical reply/forward and verifies it still matches the reviewed content. Changed or expired previews must be reviewed again. Every recipient is checked against CRM contact opt-outs and workspace suppressions before sending.

Attachments accept `{filename, mimeType, data}` where data is standard base64. A maximum of ten files and 5 MB decoded total is enforced; MIME headers are validated. File content is included in the reviewed hash and emitted as MIME attachments.

A send key is claimed before calling Gmail. Repeated successful sends return their existing message ID. Pending, failed or uncertain delivery never triggers a blind retry. If a provider timeout occurs, check Gmail Sent before choosing a fresh send action; a provider may have accepted a message even when its response was lost.

## Verification

`bun test tests/google-workspace.test.js tests/mail.test.js`

Tests cover existing read-only behavior, configuration readiness, scope separation, actual provider scopes, OAuth state ownership/single use, encrypted tokens, personal data ownership, calendar pagination/cancellation/expiry, revoked connections, bounded inbox/attachments, drafts, opt-out enforcement, human-only sends, reply-all, forward previews, attachments, changed previews and duplicate/uncertain delivery protection. Tests use provider stubs and do not contact production accounts or send real mail.

Official references: [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), [Calendar incremental synchronization](https://developers.google.com/workspace/calendar/api/guides/sync), [Gmail MIME sending](https://developers.google.com/workspace/gmail/api/guides/sending).
