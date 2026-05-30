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

- Present: accounts, account custom fields with role-based field-level read/write permissions, custom-field filtering/reporting, contacts with optional phone numbers, account detail timelines, contact detail timelines, saved account views, duplicate-aware CSV import/export with column mapping, duplicate account watchlist and merge workflow, native HubSpot, Pipedrive, and Salesforce CRM company/contact imports, opportunities, workspace-configurable pipeline stages, drag-and-drop pipeline board, tasks, communication activity logging with call/meeting recordings and transcripts, power dialer queues for phone contacts with call outcome logging, Twilio-compatible native outbound calling with TwiML/status callbacks, provider-backed SMS/WhatsApp channels through Twilio-compatible outbound messaging and inbound reply webhooks, AI account/contact summaries with next steps, risks, and scores, AI account website research/enrichment, generic account enrichment-provider connectors, AI call/meeting follow-up notes with next steps and risks, calendar event capture with manual entry, ICS import, recurring ICS/webcal source sync, and Google/Microsoft OAuth calendar source sync, public lead capture forms, email templates with contact/account/sender/workspace variables, sequences, manual sends, workspace sender rotation with daily caps, email open/click tracking, provider-backed inbound parse webhooks for generic/Postmark/SendGrid/Mailgun email replies, native Gmail/Microsoft mailbox sync for inbound replies, self-hosted IMAP bridge mailbox sync, parsed inbound reply capture, scheduled sequence processing, unsubscribe handling, manual reply detection, sequence pause-on-reply, mailbox warmup, REST API, agent command API, webhooks, native Slack/Teams/Discord event notifications, native Zapier Catch Hook workflow automation, native Segment Track API event forwarding, landing page, token-gated UI, password login, generic OAuth/OIDC login, users, role-based team memberships, role-based workspace memberships, team invitations, teams, workspaces, workspace-scoped agent tokens, token revocation, broad workspace audit logs for admin and CRM mutations, configurable per-user dashboard widgets, per-user report alert notification preferences, saved report section views, scheduled account CSV exports, scheduled report JSON exports, scheduled report threshold alerts with webhook/native integration destinations, repeated-alert suppression, recovery notifications, and one-time escalation policies, read-only aggregate dashboard share links, embeddable aggregate dashboard widgets, and reporting for pipeline health/forecast/activity/tasks/sequences/owner performance/source conversion/stalled opportunities with compact drill-down rows for pipeline stages, owners, and sources.
- Partial: pipeline management exists as a configurable drag-and-drop board with stage, forecast, owner performance, source conversion reports, dashboard widget preferences, saved report views, scheduled account/report exports, public dashboard sharing, embeddable dashboard widgets, compact report drill-downs, and threshold report alerts with webhook plus Slack/Teams/Discord/Zapier/Segment destinations, repeat suppression, recovery notifications, per-user alert notification preferences, and one-time escalation policies.
- Partial: email exists through outbound SMTP, stored events, sender rotation, first-party open/click tracking, provider inbound parse webhooks, native Gmail/Microsoft mailbox sync, self-hosted IMAP bridge sync, parsed inbound reply ingestion, unsubscribe handling, and manual reply handling but lacks built-in raw IMAP sockets in the Worker runtime.
- Missing: deeper native third-party integrations beyond Slack/Teams/Discord/Zapier/Segment notifications, automation, and event forwarding, Google/Microsoft calendar sync, Twilio-compatible calling/messaging, and HubSpot/Pipedrive/Salesforce imports.

## Recommended build order

1. Finish open-source foundation: GitHub repository, license, deploy button, Cloudflare setup docs, seed data, screenshots, contribution guide, and hosted demo path.
2. Harden tenancy and auth: richer roles and periodic audit review tooling.
3. Build sales workflow depth: relationship enrichment and rep-level performance.
4. Build email depth: deliverability limits and advanced template management.
5. Deepen reporting: advanced multi-step escalation policies.
6. Add integrations and AI: calendar/meeting capture, enrichment providers, AI research summaries, draft generation, call/meeting notes, and next-best actions.
7. Consider communication expansion: SMS/WhatsApp and dialer provider integrations before native telephony, because native calling has heavier compliance and infrastructure requirements.
