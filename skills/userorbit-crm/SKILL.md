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
3. Choose the workspace that matches the user request. If none exists, create one.

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

Create a workspace-scoped agent token:

```http
POST /api/workspace-tokens

{ "workspaceId": "workspace_id", "name": "Codex agent" }
```

Store the returned `token` immediately. It is only shown once and can be used instead of the bootstrap token for future agent operations in that workspace.

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
- Prefer small, personalized batches over bulk imports.
- Check `GET /api/summary`, `GET /api/accounts`, and `GET /api/tasks` before deciding the next action.
- Keep workspace-specific work scoped with `X-Workspace-Id` or `workspaceId` in command payloads. Workspace tokens automatically default to their own workspace.
- Use the bootstrap token only for setup and admin operations; prefer workspace tokens for recurring automations.
