# Research Notes

## Zoho SMTP

Zoho Mail documents SMTP for external clients. The important operational settings are:

- Host: `smtp.zoho.com`
- SSL port: `465`
- TLS/STARTTLS port: `587`
- Auth username: full email address
- Auth password: account password or application-specific password when 2FA is enabled

## Cloudflare fit

The app uses Cloudflare Workers, D1, Cron Triggers, and outbound TCP sockets.

Workers support outbound TCP sockets through `connect()` and support StartTLS through `socket.startTls()`. Cloudflare blocks outbound SMTP on port `25`, so this CRM uses Zoho's supported ports `465` or `587`.

D1 is available on the Workers Free plan, and this app avoids paid-only infrastructure. It does not require R2, Durable Objects, a queue, or a separate Node server.

## CloseCRM-inspired minimum feature set

Close's current public product pages emphasize that an inside-sales CRM is not just a database. It is a rep action surface with built-in calling, email, SMS, workflows, pipeline reporting, custom fields, meetings, and AI assistance.

Sources checked on 2026-05-30:

- https://close.com/crm-2025
- https://close.com/email
- https://close.com/automation
- https://close.com/reporting
- https://close.com/pricing
- https://close.com/get-started/dialer

Close-style CRMs commonly center on:

- Leads/accounts with contacts.
- Opportunities and pipeline stages.
- Tasks and follow-ups.
- Email activity attached to contacts and accounts.
- Email templates and sequences.
- Searchable views for reps.
- API access for automation.
- Native calling, power/predictive dialing, call logging, call coaching, and call outcomes.
- SMS/WhatsApp follow-up and multi-channel workflows.
- Two-way email sync, reply detection, thread timeline, unsubscribe handling, open/click tracking, and sending limits.
- Custom fields, saved/smart views, filters, imports, exports, and deduplication.
- Pipeline, activity, workflow, rep-performance, and forecast reporting.
- Meeting scheduling, recordings, transcripts, notes, and follow-up generation.
- Team roles, permissions, audit history, assignments, and collaboration.
- Integrations and webhooks for calendars, enrichment, forms, Slack, Zapier, and data warehouses.
- AI support for enrichment, drafting, summarization, call notes, lead scoring, and next-best action.

## Current UserOrbit CRM coverage

- Present: accounts, account custom fields, contacts, account detail timelines, contact detail timelines, saved account views, opportunities, pipeline board, tasks, email templates, sequences, manual sends, scheduled sequence processing, mailbox warmup, REST API, agent command API, landing page, token-gated UI, users, team memberships, teams, workspaces, workspace-scoped agent tokens, account CSV export, and reporting for pipeline health/activity/tasks/sequences/stalled opportunities.
- Partial: pipeline management exists as a board with fixed stages and stage reports but lacks customizable stages, forecast views, and conversion analytics.
- Partial: email exists through outbound SMTP and stored events but lacks inbound sync, reply detection, unsubscribe management, tracking, and mailbox rotation.
- Missing: native calling, power dialer, SMS/WhatsApp, meetings, custom fields, imports/exports, dedupe, saved views, dashboards, role-based access control, audit logs, webhooks, third-party integrations, and AI enrichment/notes.

## Recommended build order

1. Finish open-source foundation: GitHub repository, license, deploy button, Cloudflare setup docs, seed data, screenshots, contribution guide, and hosted demo path.
2. Harden tenancy and auth: invitations, password or OAuth login, workspace membership overrides, richer roles, token revocation UI, and audit logs.
3. Build sales workflow depth: configurable stages, bulk import, custom-field filtering/reporting, and deduplication.
4. Build email depth: inbound/reply sync, unsubscribe lists, sequence pause-on-reply, deliverability limits, tracking settings, template variables, and mailbox rotation.
5. Deepen reporting: forecast views, rep-level performance, conversion rates, dashboard customization, and saved report filters.
6. Add integrations and AI: calendar/meeting capture, webhooks, enrichment providers, AI research summaries, draft generation, call/meeting notes, and next-best actions.
7. Consider communication expansion: SMS/WhatsApp and dialer integrations before native telephony, because native calling has heavier compliance and infrastructure requirements.
