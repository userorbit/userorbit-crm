# UserOrbit CRM

An open source founder-led outreach CRM that runs on Cloudflare Workers and D1.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/userorbit/userorbit-crm)

## What it includes

- Accounts, contacts, opportunities, and tasks.
- Account detail timelines with contacts, opportunities, tasks, and email activity.
- Contact detail timelines with tasks, opportunities, sequence enrollments, and emails.
- Communication activity logging for calls, meetings, SMS, WhatsApp, and notes.
- Calendar meeting capture with manual entry and ICS import.
- Public lead capture forms that create or match accounts and contacts.
- Pipeline board with workspace-configurable sales stages.
- A seeded 4-email UserOrbit outreach sequence.
- Manual email sending, inbound reply capture, and scheduled sequence processing.
- Configurable first-party email open and click tracking.
- Contact unsubscribe handling for manual sends and sequences.
- Zoho SMTP support through Cloudflare Workers TCP sockets.
- A token-protected REST API for agents and scripts.
- Auth-gated app access with a bootstrap admin token and workspace-scoped agent tokens.
- Users, role-based team/workspace memberships, team invitations, teams, and workspaces for separating sales motions, clients, or products.
- Workspace token revocation and audit logs for admin operations plus core CRM mutations.
- Workspace webhooks for account, contact, task, communication, email, and lead form events.
- Native Slack notifications for selected CRM events.
- Account custom fields with role-based read/write permissions for self-hosted CRM data modeling.
- Saved account views for reusable search, segment, status, and custom-field filters.
- Reporting for pipeline health, weighted forecast, activity, owner performance, source conversion, sequence performance, and stalled opportunities.
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

### Configure email tracking

```sh
curl -X PATCH http://localhost:8787/api/email/settings \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{ "openTrackingEnabled": true, "clickTrackingEnabled": true }'
```

Email tracking is workspace-scoped and off by default. Opens and clicks are counted on email activity, account/contact detail, and reports.

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

### Create a Slack integration

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

Slack integrations are workspace-scoped. They can subscribe to the same CRM event names as webhooks and keep recent delivery status in Settings.

### Get reports

```sh
curl http://localhost:8787/api/reports \
  -H "authorization: Bearer $CRM_API_TOKEN"
```

### Export accounts

```sh
curl http://localhost:8787/api/export/accounts.csv \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -o userorbit-accounts.csv
```

### Import accounts

```sh
curl -X POST http://localhost:8787/api/import/accounts.csv \
  -H "authorization: Bearer $CRM_API_TOKEN" \
  -H "content-type: text/csv" \
  --data-binary @accounts.csv
```

Supported columns include `name`, `domain`, `segment`, `status`, `source`, `owner`, `observation`, `contact_name`, `contact_email`, and `contact_title`. The Accounts UI also includes a column mapping panel for imports from tools that use different headers.

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
- `run_sequences`
- `run_warmup`
- `create_task`
- `log_communication`
- `import_calendar_ics`

When SMTP credentials are missing, emails are recorded with status `drafted` instead of being sent. This keeps local development safe.
