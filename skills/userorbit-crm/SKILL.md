---
name: userorbit-crm
description: Use a self-hosted UserOrbit CRM end to end: configure access, create teams and workspaces, add accounts and contacts, manage tasks, enroll contacts in outreach sequences, run due emails, and operate mailbox warmup through the token-protected API.
---

# UserOrbit CRM Agent Skill

## Requirements

- Base URL, for example `http://localhost:8787` or the deployed Worker URL.
- Bearer token from `CRM_API_TOKEN` for bootstrap admin setup, a user session token from `POST /api/auth/login` or OAuth/OIDC browser login, or a workspace-scoped token created from Settings or `POST /api/workspace-tokens`.
- Optional workspace id. If omitted, the API uses the first workspace.

Use these headers for every API request:

```http
Authorization: Bearer <CRM_API_TOKEN>
Content-Type: application/json
X-Workspace-Id: <workspace_id>
```

For browser-style user sessions, first sign in with email and password:

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "admin@localhost", "password": "long-local-password" }
```

For first setup, use `CRM_API_TOKEN` to open Settings and set the bootstrap user's password. Passwords must be at least 12 characters.

OAuth/OIDC browser login starts at:

```http
GET /api/auth/oauth/start
```

When OAuth env vars are configured, register `/api/auth/oauth/callback` as the redirect URI. Existing active users can sign in by matching email; new OAuth users require their email domain in `OAUTH_ALLOWED_DOMAINS`.

## Discover Context

1. Call `GET /api/health` to verify the app is reachable and whether SMTP is configured.
2. Call `GET /api/me` to list teams, workspaces, and the current workspace.
3. Call `GET /api/summary` and `GET /api/reports` before recommending pipeline or follow-up actions.
4. Choose the workspace that matches the user request. If none exists, create one.

Workspace access is explicit for invited users. Team owners and admins can administer all team workspaces. Workspace admins can manage settings and access, members can create and update CRM records, and viewers are read-only. Invites only grant the selected workspace unless another workspace membership is added later.

Create a team:

```http
POST /api/teams

{ "name": "Acme GTM", "defaultWorkspaceName": "Outbound" }
```

Create another workspace:

```http
POST /api/workspaces

{ "teamId": "team_id", "name": "Expansion" }
```

Invite a teammate to the current workspace team:

```http
POST /api/team-invitations

{ "email": "teammate@company.com", "name": "Teammate", "role": "member" }
```

The response includes a token beginning with `uocrm_inv_`. The invited user can use that token as `Authorization: Bearer <token>`; first use marks the invitation accepted.

Supported invite roles are `admin`, `member`, and `viewer`.

Review team invitations:

```http
GET /api/team-invitations
```

Create a webhook endpoint for integrations:

```http
POST /api/webhooks

{
  "name": "Zapier catch hook",
  "url": "https://hooks.example.com/userorbit",
  "events": ["account.created", "contact.created", "task.created", "communication.created", "email.created", "lead_form.submitted"]
}
```

List endpoints and recent deliveries:

```http
GET /api/webhooks
```

Create a native notification integration for selected CRM events:

```http
POST /api/integrations

{
  "type": "slack",
  "name": "Sales alerts",
  "webhookUrl": "https://hooks.slack.com/services/...",
  "events": ["lead_form.submitted", "email.received", "task.created"]
}
```

Supported `type` values are `slack`, `teams`, and `discord`. Use the provider's incoming webhook URL; UserOrbit formats the event for that destination and records delivery status.

List integrations and recent delivery status:

```http
GET /api/integrations
```

Create a provider-backed SMS or WhatsApp message channel:

```http
POST /api/message-channels

{
  "type": "sms",
  "provider": "twilio",
  "name": "Outbound SMS",
  "accountSid": "AC...",
  "authToken": "twilio-auth-token",
  "from": "+15551234567"
}
```

List channels and recent delivery status:

```http
GET /api/message-channels
```

Only workspace owners/admins can create or disable channels. Owners, admins, and members can send through active channels. Treat stored provider credentials as self-hosted secrets.

The channel response includes `webhook_path` for owners/admins. Configure Twilio or a compatible provider to send inbound message callbacks to `<base_url><webhook_path>`. Twilio-style form fields `From`, `Body`, and `MessageSid` are supported. Inbound messages match contacts by phone, create timeline activity, set the contact to `replied`, pause active sequence enrollments, and emit `message.received`.

Create a workspace-scoped agent token:

```http
POST /api/workspace-tokens

{ "workspaceId": "workspace_id", "name": "Codex agent" }
```

Store the returned `token` immediately. It is only shown once and can be used instead of the bootstrap token for future agent operations in that workspace.

List or revoke workspace tokens:

```http
GET /api/workspace-tokens
DELETE /api/workspace-tokens/<token_id>
```

Review admin audit events:

```http
GET /api/audit-logs
```

Audit logs include access/settings changes and core CRM writes such as account/contact/opportunity/task mutations, imports, sequence enrollments, manual sends, warmup administration, and lead form submissions. Use them before making sensitive changes in a shared workspace.

Review or update workspace email tracking settings:

```http
GET /api/email/settings

PATCH /api/email/settings
Content-Type: application/json

{ "openTrackingEnabled": true, "clickTrackingEnabled": true }
```

Tracking is off by default. Enable it only when the workspace has a correct public Worker URL configured with `CRM_PUBLIC_URL` so sequence emails can produce valid tracking links.

Configure sender rotation:

```http
POST /api/email/senders

{
  "email": "founder@example.com",
  "name": "Founder",
  "dailyLimit": 100
}
```

List senders with `GET /api/email/senders`. Manual and sequence sends choose the least-used active sender that has not hit its daily cap. If no sender is configured, UserOrbit falls back to `CRM_FROM_EMAIL` or `SMTP_USERNAME`.

Create an inbound email source for provider parse webhooks:

```http
POST /api/email/inbound-sources

{
  "name": "Sales inbound parser",
  "provider": "postmark"
}
```

Supported providers are `generic`, `postmark`, `sendgrid`, and `mailgun`. List sources with `GET /api/email/inbound-sources`; owner/admin responses include `webhook_path`. Configure the provider to post inbound parse events to `<base_url><webhook_path>`. Inbound messages match contacts by sender email, create timeline email activity, mark contacts replied, pause active sequence enrollments, and emit `email.received`.

Create a public lead capture form:

```http
POST /api/lead-forms

{
  "name": "Website demo request",
  "source": "Website form",
  "defaultOwner": "Sales",
  "defaultSegment": "growth",
  "defaultStatus": "target"
}
```

List forms and share the returned `/forms/<public_key>` URL:

```http
GET /api/lead-forms
```

Public form submissions do not require authentication. Browser users can submit the hosted form, and agents or external sites can send JSON to the same URL:

```http
POST /forms/<public_key>
Content-Type: application/json

{
  "company": "Acme SaaS",
  "domain": "acme.com",
  "contactName": "Jane Doe",
  "email": "jane@acme.com",
  "title": "Head of Product",
  "message": "Interested in a demo"
}
```

Submissions match existing accounts by domain/name, create the contact when the email is new, record an audit event, and emit `lead_form.submitted` webhooks. Disable a form with `DELETE /api/lead-forms/<form_id>`.

## Core Workflow

Create an account with contacts:

```http
POST /api/agent/command

{
  "command": "create_account",
  "account": {
    "workspaceId": "workspace_id",
    "name": "Acme SaaS",
    "domain": "acme.com",
    "segment": "product",
    "source": "Product Hunt",
    "observation": "they launched a new onboarding checklist",
    "contacts": [
      { "name": "Jane Doe", "email": "jane@acme.com", "phone": "+15551234567", "title": "Head of Product" }
    ]
  }
}
```

Open an account timeline before recommending next steps:

```http
GET /api/accounts/<account_id>
```

Use the returned `timeline`, `contacts`, `opportunities`, `tasks`, and `emails` arrays to understand current context before creating follow-up work or sending email.

Open a contact timeline before enrolling, emailing, or creating person-specific tasks:

```http
GET /api/contacts/<contact_id>
```

Use the returned `timeline`, `tasks`, `opportunities`, `enrollments`, and `emails` arrays to avoid duplicate follow-up.

Unsubscribe a contact from outreach:

```http
POST /api/contacts/<contact_id>/unsubscribe
```

Unsubscribed contacts are blocked from manual sends and sequence enrollment, and active sequence enrollments are stopped.

Mark a contact as replied:

```http
POST /api/contacts/<contact_id>/reply
```

Reply handling sets contact status to `replied` and stops active sequence enrollments for that contact.

Create a follow-up task:

```http
POST /api/agent/command

{
  "command": "create_task",
  "payload": {
    "workspaceId": "workspace_id",
    "accountId": "account_id",
    "contactId": "contact_id",
    "title": "Send teardown note",
    "kind": "follow-up",
    "dueAt": "2026-06-01T10:00:00.000Z"
  }
}
```

Enroll a contact:

```http
POST /api/agent/command

{
  "command": "enroll_contact",
  "payload": {
    "sequenceId": "seq_userorbit_outreach",
    "contactId": "contact_id"
  }
}
```

Run due sequence emails:

```http
POST /api/agent/command

{ "command": "run_sequences", "limit": 20 }
```

Review sales reports:

```http
GET /api/reports
```

The response includes `pipeline`, `forecast`, `accountStatus`, `taskStatus`, `sequencePerformance`, `activity`, `ownerPerformance`, `sourceConversion`, `stalledOpportunities`, and `customFieldBreakdowns`. `forecast` groups open opportunities by close month with raw and confidence-weighted value.

Export accounts for backup or spreadsheet analysis:

```http
GET /api/export/accounts.csv
```

Import accounts from CSV:

```http
POST /api/import/accounts.csv
Content-Type: text/csv

name,domain,segment,status,contact_name,contact_email,contact_phone,contact_title
Acme,acme.com,product,target,Jane Doe,jane@acme.com,+15551234567,Head of Product
```

Supported account columns include `name`, `domain`, `segment`, `status`, `source`, `owner`, and `observation`. Optional contact columns are `contact_name`, `contact_email`, `contact_phone`, and `contact_title`.

For non-standard CSV headers, send JSON with `csv` and `mapping`:

```http
POST /api/import/accounts.csv
Content-Type: application/json

{
  "csv": "Company,Website,Full Name,Email Address\nAcme,acme.com,Jane Doe,jane@acme.com",
  "mapping": {
    "name": "Company",
    "domain": "Website",
    "contactName": "Full Name",
    "contactEmail": "Email Address",
    "customFields": { "company_size": "Company Size" }
  }
}
```

CSV import matches existing accounts by normalized domain first, then exact account name. The response includes `imported`, `matched`, `failed`, and per-row `action` values.

Review possible duplicate accounts:

```http
GET /api/duplicates/accounts
```

Merge a duplicate account into the account you want to keep:

```http
POST /api/accounts/<target_account_id>/merge
Content-Type: application/json

{ "sourceAccountId": "duplicate_account_id" }
```

The merge moves contacts, opportunities, tasks, email activity, and account custom fields that do not already exist on the target account, then deletes the source account.

Log calls, meetings, messages, or notes:

```http
POST /api/communications
Content-Type: application/json

{
  "accountId": "account_id",
  "contactId": "optional_contact_id",
  "type": "call",
  "direction": "outbound",
  "outcome": "connected",
  "subject": "Discovery call",
  "body": "Talked through onboarding launch workflow and next step.",
  "occurredAt": "2026-05-31T10:00:00.000Z"
}
```

Supported `type` values are `call`, `meeting`, `sms`, `whatsapp`, and `note`. The `log_communication` agent command accepts the same fields in `payload`.

Send SMS or WhatsApp through a configured provider channel:

```http
POST /api/agent/command

{
  "command": "send_message",
  "payload": {
    "channelId": "message_channel_id",
    "contactId": "contact_id",
    "body": "Thanks for taking a look. Want me to send the teardown?"
  }
}
```

The contact must have a phone number unless `payload.to` is provided. The send creates a `communication.created` timeline event and a `message.sent` webhook event with delivery status. For inbound provider replies, use the channel `webhook_path`; do not call authenticated APIs from the provider callback.

Create and work a power dialer queue:

```http
POST /api/agent/command

{
  "command": "create_dialer_session",
  "payload": {
    "name": "Today outbound block",
    "contactIds": ["contact_id_1", "contact_id_2"]
  }
}
```

Use `GET /api/dialer/sessions/<session_id>/next` to fetch the next queued contact. Start a call with `POST /api/dialer/items/<item_id>/start`, then complete it:

```http
POST /api/agent/command

{
  "command": "complete_dialer_call",
  "itemId": "dialer_item_id",
  "payload": {
    "outcome": "connected",
    "body": "Discussed onboarding workflow and next step."
  }
}
```

Completed dialer calls create outbound `call` communication events, update the queue, appear on account/contact timelines, and emit `dialer.call.completed`.

Generate an AI account or contact insight:

```http
POST /api/agent/command

{
  "command": "generate_ai_insight",
  "payload": {
    "entity": "account",
    "entityId": "account_id"
  }
}
```

Use `entity: "contact"` for a contact-level insight. Insights summarize recent context, next steps, risks, and a 0-100 score. When `OPENAI_API_KEY` is configured the app uses OpenAI's Responses API; otherwise it returns a deterministic local insight from CRM activity.

Research an account website and store the result as an account insight:

```http
POST /api/accounts/<account_id>/research
Content-Type: application/json

{
  "url": "https://example.com",
  "updateObservation": true
}
```

Equivalent agent command:

```json
{
  "command": "research_account",
  "accountId": "account_id",
  "payload": { "updateObservation": true }
}
```

If `url` is omitted, UserOrbit uses the account domain. The command fetches public page text, generates positioning and outreach signals, stores the result as an account AI insight, and updates the account observation unless `updateObservation` is `false`.

Configure a generic account enrichment provider:

```http
POST /api/enrichment-providers

{
  "name": "Company data API",
  "endpointUrl": "https://api.example.com/company",
  "method": "GET",
  "authHeader": "Authorization",
  "authToken": "Bearer provider-token"
}
```

The provider receives `domain`, `name`, and `accountId` as query parameters for `GET` or JSON for `POST`. Enrich an account:

```http
POST /api/accounts/<account_id>/enrich
Content-Type: application/json

{ "providerId": "optional_provider_id", "updateObservation": true }
```

Equivalent agent command:

```json
{
  "command": "enrich_account",
  "accountId": "account_id",
  "payload": { "providerId": "optional_provider_id" }
}
```

UserOrbit stores enrichment output as an account AI insight, updates the account observation by default, and emits `account.enriched`.

Generate AI follow-up notes for a logged call, meeting, or note:

```http
POST /api/communications/<communication_id>/ai-notes
```

Equivalent agent command:

```json
{
  "command": "generate_ai_notes",
  "communicationId": "communication_id"
}
```

The result is stored as an AI insight on the communication and appears in `GET /api/communications` as `ai_summary`, `aiNextSteps`, and `aiRisks`. Use this after logging discovery calls or meetings to produce concise recaps, concrete follow-up actions, sales risks, and a 0-100 momentum score.

Capture calendar meetings directly or from an ICS export:

```http
POST /api/calendar/events
Content-Type: application/json

{
  "accountId": "account_id",
  "contactId": "optional_contact_id",
  "title": "Discovery meeting",
  "startsAt": "2026-05-31T10:00:00.000Z",
  "endsAt": "2026-05-31T10:30:00.000Z",
  "location": "Zoom",
  "meetingUrl": "https://meet.example.com/room",
  "attendeeEmails": ["jane@example.com"]
}
```

```http
POST /api/calendar/import.ics
Content-Type: application/json

{
  "accountId": "account_id",
  "contactId": "optional_contact_id",
  "ics": "BEGIN:VCALENDAR..."
}
```

The `import_calendar_ics` agent command accepts the same payload as `POST /api/calendar/import.ics`. Imported meetings appear on account and contact timelines.

Create a recurring ICS/webcal calendar source:

```http
POST /api/calendar/sources

{
  "name": "Sales calendar",
  "accountId": "account_id",
  "contactId": "optional_contact_id",
  "url": "webcal://calendar.example.com/private.ics",
  "syncIntervalMinutes": 1440
}
```

Run a source immediately:

```http
POST /api/calendar/sources/<source_id>/run
```

List sources with `GET /api/calendar/sources`. Active sources are also checked by the scheduled Worker, and events are upserted by ICS UID.

Connect a Google Calendar or Microsoft Outlook calendar with OAuth:

```http
POST /api/calendar/oauth/start

{
  "provider": "google",
  "name": "Primary Google calendar",
  "accountId": "account_id",
  "contactId": "optional_contact_id",
  "calendarId": "primary",
  "syncIntervalMinutes": 1440
}
```

Open the returned `authorizationUrl` in the browser. Register `/api/calendar/oauth/callback` as the redirect URI on the provider. Google requires `GOOGLE_CALENDAR_CLIENT_ID` and `GOOGLE_CALENDAR_CLIENT_SECRET`; Microsoft requires `MICROSOFT_CALENDAR_CLIENT_ID`, `MICROSOFT_CALENDAR_CLIENT_SECRET`, and optional `MICROSOFT_CALENDAR_TENANT`. OAuth calendar sources store refresh tokens and sync through the same `POST /api/calendar/sources/<source_id>/run` and scheduled Worker path.

Record a parsed inbound reply from an email provider, Cloudflare Email Worker, automation, or agent:

```http
POST /api/email/inbound
Content-Type: application/json

{
  "fromEmail": "jane@acme.com",
  "subject": "Re: Quick question",
  "body": "Happy to take a look next week.",
  "providerMessageId": "provider-message-id"
}
```

You can also pass `contactId` instead of `fromEmail`. UserOrbit stores the inbound email, adds it to timelines, marks the contact `replied`, and pauses active sequence enrollments.

Review or move pipeline opportunities:

```http
GET /api/opportunities
```

List or create workspace pipeline stages:

```http
GET /api/opportunity-stages
```

```http
POST /api/opportunity-stages

{ "label": "Security review", "position": 45 }
```

```http
PATCH /api/opportunities/<opportunity_id>

{ "stage": "demo" }
```

Create a saved account view for repeat work:

```http
POST /api/saved-views

{
  "name": "Product targets",
  "resource": "accounts",
  "filters": {
    "segment": "product",
    "status": "target",
    "q": "",
    "customFields": { "company_size": "11-50" }
  }
}
```

Use saved views by passing `viewId` to `GET /api/accounts?viewId=<saved_view_id>`.

Create an account custom field:

```http
POST /api/custom-fields

{
  "entity": "account",
  "name": "Company size",
  "type": "select",
  "options": ["1-10", "11-50", "51-200", "200+"],
  "readRoles": ["owner", "admin", "member", "viewer"],
  "writeRoles": ["owner", "admin", "member"]
}
```

`readRoles` and `writeRoles` accept workspace roles. Owners/admins can always manage fields; restricted fields are omitted from account detail, account filters, and custom-field reports for unauthorized roles, and writes are rejected.

Set custom field values by passing `customFields` when creating or updating an account. Keys are generated from the field name, for example:

```json
{ "customFields": { "company_size": "11-50" } }
```

Filter accounts by custom fields with `cf_<field_key>` query params:

```http
GET /api/accounts?cf_company_size=11-50
```

Send one manual email:

```http
POST /api/agent/command

{
  "command": "send_email",
  "payload": {
    "contactId": "contact_id",
    "subject": "Quick product adoption note",
    "body": "Hi Jane,\n\n..."
  }
}
```

When SMTP is not configured, the CRM records emails as `drafted` instead of sending them. When email tracking is enabled, account/contact email activity and `GET /api/reports` include open and click counts.

## Mailbox Warmup

1. Create or update the configured sender mailbox with `POST /api/warmup/mailboxes`.
2. Add at least three trusted recipients.
3. Create a 14-90 day plan with `POST /api/warmup/plans`.
4. Run due warmup sends with the `run_warmup` agent command or let the Worker cron process them.

## Operating Rules

- Do not invent account research. Store the source and observation used to justify outreach.
- Treat enrichment provider output as unverified third-party data unless the user has approved the provider.
- Do not send or enroll contacts with `status: "unsubscribed"`.
- Do not keep contacts in automated sequences after they reply; use `POST /api/contacts/<contact_id>/reply`.
- Prefer small, personalized batches over bulk imports.
- Check `GET /api/summary`, `GET /api/accounts`, and `GET /api/tasks` before deciding the next action.
- Keep workspace-specific work scoped with `X-Workspace-Id` or `workspaceId` in command payloads. Workspace tokens automatically default to their own workspace.
- Use the bootstrap token only for setup and admin operations; prefer workspace tokens for recurring automations.
