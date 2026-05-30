---
name: userorbit-crm
description: Use a self-hosted UserOrbit CRM end to end: configure access, create teams and workspaces, add accounts and contacts, manage tasks, enroll contacts in outreach sequences, run due emails, and operate mailbox warmup through the token-protected API.
---

# UserOrbit CRM Agent Skill

## Requirements

- Base URL, for example `http://localhost:8787` or the deployed Worker URL.
- Bearer token from `CRM_API_TOKEN` for bootstrap admin setup, or a workspace-scoped token created from Settings or `POST /api/workspace-tokens`.
- Optional workspace id. If omitted, the API uses the first workspace.

Use these headers for every API request:

```http
Authorization: Bearer <CRM_API_TOKEN>
Content-Type: application/json
X-Workspace-Id: <workspace_id>
```

## Discover Context

1. Call `GET /api/health` to verify the app is reachable and whether SMTP is configured.
2. Call `GET /api/me` to list teams, workspaces, and the current workspace.
3. Call `GET /api/summary` and `GET /api/reports` before recommending pipeline or follow-up actions.
4. Choose the workspace that matches the user request. If none exists, create one.

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
  "events": ["account.created", "contact.created", "task.created", "email.created"]
}
```

List endpoints and recent deliveries:

```http
GET /api/webhooks
```

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
      { "name": "Jane Doe", "email": "jane@acme.com", "title": "Head of Product" }
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

The response includes `pipeline`, `forecast`, `accountStatus`, `taskStatus`, `sequencePerformance`, `activity`, `stalledOpportunities`, and `customFieldBreakdowns`. `forecast` groups open opportunities by close month with raw and confidence-weighted value.

Export accounts for backup or spreadsheet analysis:

```http
GET /api/export/accounts.csv
```

Import accounts from CSV:

```http
POST /api/import/accounts.csv
Content-Type: text/csv

name,domain,segment,status,contact_name,contact_email,contact_title
Acme,acme.com,product,target,Jane Doe,jane@acme.com,Head of Product
```

Supported account columns include `name`, `domain`, `segment`, `status`, `source`, `owner`, and `observation`. Optional contact columns are `contact_name`, `contact_email`, and `contact_title`.

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
  "options": ["1-10", "11-50", "51-200", "200+"]
}
```

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

When SMTP is not configured, the CRM records emails as `drafted` instead of sending them.

## Mailbox Warmup

1. Create or update the configured sender mailbox with `POST /api/warmup/mailboxes`.
2. Add at least three trusted recipients.
3. Create a 14-90 day plan with `POST /api/warmup/plans`.
4. Run due warmup sends with the `run_warmup` agent command or let the Worker cron process them.

## Operating Rules

- Do not invent account research. Store the source and observation used to justify outreach.
- Do not send or enroll contacts with `status: "unsubscribed"`.
- Do not keep contacts in automated sequences after they reply; use `POST /api/contacts/<contact_id>/reply`.
- Prefer small, personalized batches over bulk imports.
- Check `GET /api/summary`, `GET /api/accounts`, and `GET /api/tasks` before deciding the next action.
- Keep workspace-specific work scoped with `X-Workspace-Id` or `workspaceId` in command payloads. Workspace tokens automatically default to their own workspace.
- Use the bootstrap token only for setup and admin operations; prefer workspace tokens for recurring automations.
