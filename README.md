# UserOrbit CRM

An open source founder-led outreach CRM that runs on Cloudflare Workers and D1.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/userorbit/userorbit-crm)

## What it includes

- Accounts, contacts, opportunities, and tasks.
- Account detail timelines with contacts, opportunities, tasks, and email activity.
- Contact detail timelines with tasks, opportunities, sequence enrollments, and emails.
- Communication activity logging for calls, meetings, SMS, WhatsApp, and notes.
- Provider-backed SMS and WhatsApp channels through Twilio-compatible outbound and inbound messaging.
- Calendar meeting capture with manual entry and ICS import.
- Calendar source sync from ICS/webcal feeds.
- Public lead capture forms that create or match accounts and contacts.
- Pipeline board with drag-and-drop movement and workspace-configurable sales stages.
- A seeded 4-email UserOrbit outreach sequence.
- Manual email sending, inbound reply capture, and scheduled sequence processing.
- Configurable first-party email open and click tracking.
- Workspace email sender rotation with per-sender daily caps.
- Contact unsubscribe handling for manual sends and sequences.
- Zoho SMTP support through Cloudflare Workers TCP sockets.
- A token-protected REST API for agents and scripts.
- Auth-gated app access with a bootstrap admin token and workspace-scoped agent tokens.
- Users, role-based team/workspace memberships, team invitations, teams, and workspaces for separating sales motions, clients, or products.
- Workspace token revocation and audit logs for admin operations plus core CRM mutations.
- Workspace webhooks for account, contact, task, communication, email, and lead form events.
- Native Slack notifications for selected CRM events.
- AI account/contact summaries, next steps, risks, and lead scores with optional OpenAI Responses API support.
- Account custom fields with role-based read/write permissions for self-hosted CRM data modeling.
- Saved account views for reusable search, segment, status, and custom-field filters.
- Reporting for pipeline health, weighted forecast, activity, owner performance, source conversion, sequence performance, and stalled opportunities.
- Per-user dashboard widget preferences for each workspace.
- Account CSV import/export with duplicate matching and merge workflow for backups and spreadsheet workflows.
- A landing page at `/` and the CRM app at `/app`.
- A lightweight Linear/Coss-inspired UI served by the Worker.

## Self-host in one click

After this directory is published to GitHub, the deploy button above can create a Cloudflare Worker from the repository. Set these Cloudflare values after deploy:

- D1 binding: `DB`
- Secret: `CRM_API_TOKEN` for the bootstrap admin login
- Optional public URL: `CRM_PUBLIC_URL` for email open/click tracking links
- Optional SMTP secrets: `CRM_FROM_EMAIL`, `CRM_FROM_NAME`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USERNAME`, `SMTP_PASSWORD`
- Optional OAuth/OIDC secrets: `OAUTH_AUTHORIZATION_URL`, `OAUTH_TOKEN_URL`, `OAUTH_USERINFO_URL`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_ALLOWED_DOMAINS`
- Optional calendar OAuth secrets: `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `MICROSOFT_CALENDAR_CLIENT_ID`, `MICROSOFT_CALENDAR_CLIENT_SECRET`, `MICROSOFT_CALENDAR_TENANT`
- Optional AI secrets: `OPENAI_API_KEY`, `OPENAI_MODEL`

The public repository is available at https://github.com/userorbit/userorbit-crm.

## Cloudflare setup

```sh
npm install
npm run db:create
```

Copy the returned D1 `database_id` into `wrangler.jsonc`, then run:

```sh
npm run db:migrate:local
npm run dev
```

Open `http://localhost:8787` for the landing page or `http://localhost:8787/app` for the auth-gated CRM. Sign in with `CRM_API_TOKEN` for first setup, set your user password in Settings, then use Settings to create teams, workspaces, and workspace-scoped agent tokens.

Team owners/admins can administer every workspace in their team. Workspace admins can manage settings and access, members can create and update CRM activity, and viewers are read-only. Invited users are granted access only to the workspace selected when the invitation is created.

For production:

```sh
npm run db:migrate
npm run deploy
```

## Secrets

Create `.dev.vars` locally and set production secrets with `wrangler secret put`.

```sh
CRM_API_TOKEN="use-a-long-random-token"
CRM_PUBLIC_URL="https://your-worker.example.workers.dev"
CRM_FROM_EMAIL="founder@userorbit.com"
CRM_FROM_NAME="UserOrbit"
SMTP_HOST="smtp.zoho.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USERNAME="founder@userorbit.com"
SMTP_PASSWORD="zoho-app-specific-password"
OAUTH_AUTHORIZATION_URL="https://accounts.example.com/oauth/authorize"
OAUTH_TOKEN_URL="https://accounts.example.com/oauth/token"
OAUTH_USERINFO_URL="https://accounts.example.com/oauth/userinfo"
OAUTH_CLIENT_ID="oauth-client-id"
OAUTH_CLIENT_SECRET="oauth-client-secret"
OAUTH_ALLOWED_DOMAINS="your-company.com"
GOOGLE_CALENDAR_CLIENT_ID="google-client-id"
GOOGLE_CALENDAR_CLIENT_SECRET="google-client-secret"
MICROSOFT_CALENDAR_CLIENT_ID="microsoft-client-id"
MICROSOFT_CALENDAR_CLIENT_SECRET="microsoft-client-secret"
MICROSOFT_CALENDAR_TENANT="common"
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-5-mini"
```

Zoho supports SMTP on `smtp.zoho.com` with SSL on port `465` and TLS/STARTTLS on port `587`. If the Zoho account has 2FA enabled, use an application-specific password.

Cloudflare Workers can open outbound TCP sockets and use StartTLS, but port `25` is blocked. This app defaults to Zoho's SSL port `465`.

Set `CRM_PUBLIC_URL` to your deployed Worker origin before enabling email open or click tracking. Manual sends from the UI can infer the current origin, but scheduled sequence sends need the configured public URL.

## API

All `/api/*` endpoints require `Authorization: Bearer <token>` except `POST /api/auth/login`. Use `CRM_API_TOKEN` for bootstrap setup, set a user password in Settings for browser sessions, and create workspace-scoped tokens in Settings for agents and scripts.

OAuth/OIDC login is available at `/api/auth/oauth/start` when the OAuth env vars are configured. The redirect URI to register with your provider is `/api/auth/oauth/callback` on your Worker origin. Existing active users can sign in by OAuth email; new OAuth users are created only when their email domain is listed in `OAUTH_ALLOWED_DOMAINS`.

### Password sign in

```sh
curl -X POST http://localhost:8787/api/auth/login \
  -H "content-type: application/json" \
  -d '{ "email": "admin@localhost", "password": "long-local-password" }'
```

The response includes a 30-day session token that can be used as `Authorization: Bearer <token>`.

### Create an account with contacts

```sh
curl -X POST http://localhost:8787/api/agent/command \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "command": "create_account",
    "account": {
      "name": "Acme SaaS",
      "domain": "acme.com",
      "segment": "product",
      "source": "Product Hunt",
      "observation": "they launched a new reporting feature",
      "contacts": [
        {
          "name": "Jane Doe",
          "email": "jane@acme.com",
          "title": "Head of Product"
        }
      ]
    }
  }'
```

### Get an account timeline

```sh
curl http://localhost:8787/api/accounts/account-id \
  -H "authorization: Bearer $CRM_API_TOKEN"
```

### Enroll a contact

```sh
curl -X POST http://localhost:8787/api/agent/command \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "command": "enroll_contact",
    "payload": {
      "sequenceId": "seq_userorbit_outreach",
      "contactId": "contact-id"
    }
  }'
```

### Run due sequence emails

```sh
curl -X POST http://localhost:8787/api/agent/command \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{ "command": "run_sequences", "limit": 20 }'
```

### Capture an inbound reply

```sh
curl -X POST http://localhost:8787/api/email/inbound \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "fromEmail": "jane@acme.com",
    "subject": "Re: Quick question",
    "body": "Happy to take a look next week.",
    "providerMessageId": "message-id-from-your-mail-provider"
  }'
```

Inbound emails are matched to contacts by `fromEmail` or `contactId`, recorded on account and contact timelines, and pause active sequence enrollments by marking the contact as replied.

### Import calendar meetings

```sh
curl -X POST http://localhost:8787/api/calendar/import.ics \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "accountId": "account-id",
    "contactId": "optional-contact-id",
    "ics": "BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:meeting-1\nSUMMARY:Discovery call\nDTSTART:20260531T100000Z\nDTEND:20260531T103000Z\nEND:VEVENT\nEND:VCALENDAR"
  }'
```

Calendar events are attached to account/contact timelines and can also be created directly with `POST /api/calendar/events`.

### Sync an ICS calendar feed

```sh
curl -X POST http://localhost:8787/api/calendar/sources \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "name": "Sales calendar",
    "accountId": "account-id",
    "contactId": "optional-contact-id",
    "url": "webcal://calendar.example.com/private.ics",
    "syncIntervalMinutes": 1440
  }'
```

Run a source immediately:

```sh
curl -X POST http://localhost:8787/api/calendar/sources/source-id/run \
  -H "authorization: Bearer $CRM_API_TOKEN"
```

Active sources are also checked by the scheduled Worker. Feed events are upserted by ICS UID and attached to account/contact timelines.

### Connect Google or Microsoft calendar OAuth

Configure the calendar OAuth secrets above, then register this redirect URI with the provider:

```text
https://your-worker.example.workers.dev/api/calendar/oauth/callback
```

The Calendar view can start Google Calendar or Microsoft Outlook OAuth. Programmatically, owners/admins can request the authorization URL:

```sh
curl -X POST http://localhost:8787/api/calendar/oauth/start \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "provider": "google",
    "name": "Primary Google calendar",
    "accountId": "account-id",
    "calendarId": "primary",
    "syncIntervalMinutes": 1440
  }'
```

After callback, UserOrbit stores the refresh token on the calendar source, syncs Google Calendar `events.list` or Microsoft Graph `calendarView`, and upserts meetings on the account/contact timelines.

### Configure email tracking

```sh
curl -X PATCH http://localhost:8787/api/email/settings \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{ "openTrackingEnabled": true, "clickTrackingEnabled": true }'
```

Email tracking is workspace-scoped and off by default. Opens and clicks are counted on email activity, account/contact detail, and reports.

### Configure email sender rotation

```sh
curl -X POST http://localhost:8787/api/email/senders \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "email": "founder@example.com",
    "name": "Founder",
    "dailyLimit": 100
  }'
```

Manual and sequence sends pick the least-used active sender for the workspace and increment usage after successful SMTP delivery. If no sender is configured, the app falls back to `CRM_FROM_EMAIL` or `SMTP_USERNAME`.

### Configure inbound email sources

```sh
curl -X POST http://localhost:8787/api/email/inbound-sources \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "name": "Sales inbound parser",
    "provider": "postmark"
  }'
```

Workspace admins can create generic, Postmark, SendGrid, or Mailgun inbound sources. The response includes `webhook_path`; configure the email provider's inbound parse/webhook target to `<base_url><webhook_path>`. Inbound messages match contacts by sender email, create inbound email activity, mark the contact as replied, pause active sequence enrollments, and emit `email.received`.

### Configure mailbox sync

```sh
curl -X POST http://localhost:8787/api/email/sync-sources \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "name": "Sales Gmail inbox",
    "provider": "gmail",
    "accountEmail": "sales@example.com",
    "accessToken": "oauth-access-token",
    "labelId": "INBOX",
    "limit": 25
  }'
```

Supported providers are `gmail`, `microsoft`, and `imap_bridge`. Gmail sync reads recent messages through the Gmail API `users.messages.list` and `users.messages.get` metadata endpoints. Microsoft sync reads recent Inbox messages through Microsoft Graph `/me/mailFolders/{folder}/messages`. `imap_bridge` calls a self-hosted HTTPS bridge at `apiBaseUrl` with `{ mailbox, accountEmail, limit }` and expects `{ messages: [{ id, fromEmail, subject, body, receivedAt }] }`. Run a source with `POST /api/email/sync-sources/<source_id>/run` or the `run_email_sync` agent command. Synced messages dedupe by provider message id, match existing contacts by sender email, create inbound email activity, mark contacts replied, pause active sequence enrollments, and emit `email.received`.

### Create a lead form

```sh
curl -X POST http://localhost:8787/api/lead-forms \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "name": "Website demo request",
    "source": "Website form",
    "defaultSegment": "growth",
    "defaultStatus": "target"
  }'
```

Share the returned `/forms/<public_key>` URL. Public submissions create or match an account by domain/name, add the contact when the email is new, record a submission, and emit `lead_form.submitted` webhooks.

### Create a native notification integration

```sh
curl -X POST http://localhost:8787/api/integrations \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "type": "slack",
    "name": "Sales alerts",
    "webhookUrl": "https://hooks.slack.com/services/...",
    "events": ["lead_form.submitted", "email.received", "task.created"]
  }'
```

Slack, Microsoft Teams, Discord, and Segment integrations are workspace-scoped. Chat integrations use incoming webhook URLs; Segment uses a write key and sends CRM events to the Track API for analytics/data-pipeline routing. All native integrations can subscribe to the same CRM event names as webhooks and keep recent delivery status in Settings.

### Generate AI insights

```sh
curl -X POST http://localhost:8787/api/accounts/account-id/ai-insights \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{}'
```

Account and contact detail pages include an AI insight panel. The API also supports `POST /api/contacts/<contact_id>/ai-insights` and agent command `generate_ai_insight`. When `OPENAI_API_KEY` is configured, the Worker uses OpenAI's Responses API at `/v1/responses`; otherwise it creates a local deterministic summary from CRM activity.

### Research an account website

```sh
curl -X POST http://localhost:8787/api/accounts/account-id/research \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{ "updateObservation": true }'
```

Account detail includes a Research site button. The API fetches the account domain or supplied `url`, stores an AI research insight, and can refresh the account observation with the generated summary. Agents can call `research_account`.

### Configure account enrichment providers

```sh
curl -X POST http://localhost:8787/api/enrichment-providers \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "name": "Company data API",
    "endpointUrl": "https://api.example.com/company",
    "method": "GET",
    "authHeader": "Authorization",
    "authToken": "Bearer provider-token"
  }'
```

Generic providers receive `domain`, `name`, and `accountId` as query parameters for `GET` or JSON for `POST`. Enrich an account with `POST /api/accounts/<account_id>/enrich` or the `enrich_account` agent command. The result is stored as an account insight and can refresh the account observation.

### Generate AI call and meeting notes

```sh
curl -X POST http://localhost:8787/api/communications/communication-id/ai-notes \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{}'
```

The Communications view can turn logged calls, meetings, and notes into a concise follow-up brief with next steps, risks, and a momentum score. The agent command is `generate_ai_notes` with `communicationId`.

### Run a power dialer queue

Create a call queue from contacts that have phone numbers:

```sh
curl -X POST http://localhost:8787/api/dialer/sessions \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "name": "Today outbound block",
    "contactIds": ["contact-id-1", "contact-id-2"]
  }'
```

Fetch the next queued call, start it, then complete it with a standard call outcome:

```sh
curl http://localhost:8787/api/dialer/sessions/session-id/next \
  -H "authorization: Bearer $CRM_API_TOKEN"

curl -X POST http://localhost:8787/api/dialer/items/item-id/start \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{}'

curl -X POST http://localhost:8787/api/dialer/items/item-id/complete \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{ "outcome": "connected", "body": "Discussed onboarding workflow and next step." }'
```

Completed dialer calls create outbound `call` communication events, appear on account/contact timelines, emit `dialer.call.completed`, and can be generated through the `create_dialer_session` and `complete_dialer_call` agent commands.

### Create message and call channels

```sh
curl -X POST http://localhost:8787/api/message-channels \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "type": "sms",
    "provider": "twilio",
    "name": "Outbound SMS",
    "accountSid": "AC...",
    "authToken": "twilio-auth-token",
    "from": "+15551234567"
  }'
```

Send a provider-backed message and log it on the account/contact timeline:

```sh
curl -X POST http://localhost:8787/api/messages/send \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "channelId": "channel-id",
    "contactId": "contact-id",
    "body": "Thanks for taking a look. Want me to send the teardown?"
  }'
```

WhatsApp channels use `type: "whatsapp"` and accept either `+15551234567` or `whatsapp:+15551234567` in `from`; outbound addresses are normalized before sending. Recent delivery status is visible from Settings.

Settings shows an inbound webhook URL for each channel. Configure the provider's inbound message callback to that URL. Twilio-style form posts with `From`, `Body`, and `MessageSid` are supported. Inbound messages match contacts by phone number, create account/contact timeline activity, mark the contact replied, pause active sequence enrollments, and emit `message.received`.

Native calling uses the same Twilio-compatible channel model with `type: "call"`. Optionally set `voiceAgentNumber` to bridge answered customer calls to a rep phone number through TwiML. Start a call and store it on the timeline:

```sh
curl -X POST http://localhost:8787/api/calls/start \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "channelId": "call-channel-id",
    "contactId": "contact-id",
    "body": "Outbound discovery call"
  }'
```

Call channel responses include `call_twiml_path` and `call_status_path` for Twilio-compatible voice callbacks. Status callbacks update delivery status, call outcomes, and active dialer items.

### Get reports

```sh
curl http://localhost:8787/api/reports \
  -H "authorization: Bearer $CRM_API_TOKEN"
```

### Save report views

```sh
curl -X POST http://localhost:8787/api/saved-views \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "name": "Pipeline review",
    "resource": "reports",
    "filters": { "sections": ["metrics", "pipeline", "forecast", "stalled_opportunities"] }
  }'
```

Report views are scoped to the signed-in user and active workspace. Supported report sections are `metrics`, `pipeline`, `forecast`, `account_status`, `sequence_performance`, `owner_performance`, `source_conversion`, `stalled_opportunities`, and `custom_fields`.

### Customize the dashboard

```sh
curl -X PATCH http://localhost:8787/api/dashboard/preferences \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{ "widgets": ["metrics", "priority_accounts", "due_tasks", "pipeline"] }'
```

Dashboard preferences are scoped to the signed-in user and active workspace. Supported widgets are `metrics`, `priority_accounts`, `due_tasks`, `pipeline`, `sequence_performance`, and `stalled_opportunities`.

### Share a dashboard

```sh
curl -X POST http://localhost:8787/api/dashboard/shares \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "name": "Leadership snapshot",
    "widgets": ["metrics", "pipeline", "sequence_performance", "stalled_opportunities"]
  }'
```

Workspace admins can create revocable read-only dashboard share links at `/share/dashboards/<public_key>` and iframe-friendly embeds at `/embed/dashboards/<public_key>`. Shared and embedded dashboards expose aggregate metrics and report widgets only; they do not expose account/contact detail rows or require an app session.

### Export accounts

```sh
curl http://localhost:8787/api/export/accounts.csv \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -o userorbit-accounts.csv
```

### Schedule account and report exports

```sh
curl -X POST http://localhost:8787/api/export-schedules \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "name": "Weekly account backup",
    "resource": "accounts",
    "frequency": "weekly",
    "deliveryUrl": "https://hooks.example.com/userorbit/accounts.csv"
  }'
```

Workspace admins can schedule daily, weekly, or monthly exports to a webhook-compatible URL. Use `"resource": "accounts"` for CSV account exports or `"resource": "reports"` for JSON snapshots of pipeline, forecast, activity, task, sequence, owner-performance, source-conversion, stalled-opportunity, and custom-field reports. Run a schedule immediately with `POST /api/export-schedules/<schedule_id>/run`; scheduled Worker jobs also process due exports and record delivery status in Settings.

### Import accounts

```sh
curl -X POST http://localhost:8787/api/import/accounts.csv \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: text/csv" \
  --data-binary @accounts.csv
```

Supported columns include `name`, `domain`, `segment`, `status`, `source`, `owner`, `observation`, `contact_name`, `contact_email`, `contact_phone`, and `contact_title`. The Accounts UI also includes a column mapping panel for imports from tools that use different headers.

### Import from HubSpot, Pipedrive, or Salesforce

Workspace admins can create a native HubSpot, Pipedrive, or Salesforce import source with a private app/API token, then run it on demand:

```sh
curl -X POST http://localhost:8787/api/native-import-sources \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "name": "HubSpot CRM",
    "provider": "hubspot",
    "accessToken": "pat-...",
    "limit": 100
  }'

curl -X POST http://localhost:8787/api/native-import-sources/source-id/run \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{}'
```

For Pipedrive, use `provider: "pipedrive"` and optionally `authMode: "bearer"` when using an OAuth bearer token instead of the default API-token query parameter.
For Salesforce, use `provider: "salesforce"` and set `apiBaseUrl` to the Salesforce instance URL, for example `https://your-domain.my.salesforce.com`.

The native importers read recent companies/organizations/accounts and contacts/persons through provider CRM APIs, match accounts by domain/name, match contacts by email, create missing records, mask stored tokens in API responses, and record the last run result in Settings.

For scripted imports with custom column names, send JSON:

```sh
curl -X POST http://localhost:8787/api/import/accounts.csv \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "csv": "Company,Website,Full Name,Email Address\nAcme,acme.com,Jane Doe,jane@acme.com",
    "mapping": {
      "name": "Company",
      "domain": "Website",
      "contactName": "Full Name",
      "contactEmail": "Email Address"
    }
  }'
```

## Agent skill contract

An agent can manage the CRM through `POST /api/agent/command`. A full Codex-style skill is available at `skills/userorbit-crm/SKILL.md`.

Supported commands:

- `create_account`
- `enroll_contact`
- `send_email`
- `send_message`
- `start_call`
- `run_native_import`
- `run_email_sync`
- `run_export_schedule`
- `create_dialer_session`
- `complete_dialer_call`
- `generate_ai_insight`
- `research_account`
- `enrich_account`
- `generate_ai_notes`
- `run_sequences`
- `run_warmup`
- `create_task`
- `log_communication`
- `import_calendar_ics`

When SMTP credentials are missing, emails are recorded with status `drafted` instead of being sent. This keeps local development safe.
