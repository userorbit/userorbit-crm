- [x] Inspect the current Worker/D1 CRM shape.
- [x] Research Close CRM's current public feature surface.
- [x] Document the functionality gap list and recommended build order.
- [x] Add an open-source landing page.
- [x] Keep the CRM app auth-gated behind the self-hosted API token.
- [x] Add teams and workspaces to the data model and API.
- [x] Add workspace selection to the UI.
- [x] Add users, team memberships, and workspace-scoped agent tokens.
- [x] Add Settings controls for creating teams, workspaces, and agent tokens.
- [x] Add a Codex-style agent skill file.
- [x] Add self-hosting/GitHub deploy instructions.
- [x] Initialize and publish the GitHub repository.
- [x] Add reporting dashboards for pipeline, activity, tasks, sequences, and stalled opportunities.
- [x] Add account CSV export.
- [x] Add account detail timelines with contacts, opportunities, tasks, and email activity.
- [x] Add contact detail timelines with tasks, opportunities, sequence enrollments, and emails.
- [x] Add saved account views for reusable search, segment, and status filters.
- [x] Add account custom fields and values.
- [x] Add opportunity pipeline board and stage movement.
- [x] Add workspace token revocation UI and audit logs.
- [x] Add account CSV import.
- [x] Add workspace-configurable pipeline stages.
- [x] Add custom-field account filtering and reporting.
- [x] Add weighted forecast reporting.
- [x] Add owner performance and source conversion reporting.
- [x] Add duplicate-aware CSV import and account duplicate watchlist.
- [x] Add token-based team invitations.
- [x] Add workspace webhooks and delivery logs.
- [x] Add unsubscribe handling for contacts, manual sends, and sequences.
- [x] Add manual reply handling and sequence pause-on-reply.
- [x] Add account merge workflow for duplicate accounts.
- [x] Add inbound email capture that records replies and pauses active sequences.
- [x] Add password login with user-managed session tokens.
- [x] Add explicit workspace memberships and workspace-scoped invite access.
- [x] Add advanced CSV import column mapping.
- [x] Add communication activity logging for calls, meetings, messages, and notes.
- [x] Add calendar meeting capture with ICS import.
- [x] Add public lead capture forms for inbound website leads.
- [x] Add read-only viewer roles and enforce workspace write/admin permissions.
- [x] Add configurable email open/click tracking and engagement reporting.
- [x] Broaden audit coverage for core CRM and workspace operations.
- [x] Add field-level read/write permissions for account custom fields.
- [x] Add OAuth login.
- [x] Add native Slack integration notifications for CRM events.
- [x] Add provider-backed SMS/WhatsApp message channels.
- [x] Add inbound SMS/WhatsApp provider webhooks.
- [x] Add AI account/contact summaries, next steps, risks, and scores.
- [x] Add recurring ICS/webcal calendar source sync.
- [x] Add workspace email sender rotation with daily caps.
- [x] Add provider-backed inbound email parse webhooks.
- [x] Add AI call/meeting notes and follow-up generation.
- [x] Add native Teams and Discord notification integrations.
- [x] Add AI account website research and enrichment.
- [x] Add Google/Microsoft OAuth calendar source sync.
- [x] Add generic account enrichment-provider integrations.
- [x] Add power dialer queues with call outcome logging.
- [x] Add Twilio-compatible native outbound calling with call status tracking.
- [x] Add native HubSpot CRM company/contact imports.
- [x] Add native Pipedrive organization/person imports.
- [x] Add native Salesforce account/contact imports.
- [x] Add Gmail/Microsoft native mailbox sync for inbound replies.
- [x] Add drag-and-drop movement to the pipeline board.
- [x] Add per-user dashboard widget customization.
- [x] Add saved report section views.
- [x] Add scheduled account CSV exports.
- [ ] Build the next Close-style CRM gaps: deeper native integrations.
- [x] Restyle the app and lab to match Campsite's design system.
  - [x] Port Campsite-like design tokens, shell, sidebar, buttons, inputs, panels, tables, and pills.
  - [x] Align dashboard/lab content density and hierarchy with Campsite's workspace UI.
  - [x] Verify locally in browser and record results.

## Review

Completed the first open-source productization slice: landing page at `/`, auth-gated app at `/app`, tenant foundation with users/team memberships/teams/workspaces, workspace-aware summaries/accounts/tasks/opportunities, `/api/me`, team/workspace creation endpoints, workspace-scoped agent tokens, docs for GitHub/Cloudflare self-hosting, and `skills/userorbit-crm/SKILL.md` for agents.

Verified JavaScript parsing, local D1 migration with Node 22 runtime, landing/API responses on port 8788, and browser-visible landing/auth/dashboard flow. Port 8787 was already occupied by an existing server, so verification used 8788 and then stopped that verification server.

Added the next CRM-depth slice: `/api/reports`, account CSV export, a Reports UI tab, an account export button, and agent/docs coverage for reporting and exports.

Added account detail timelines: `GET /api/accounts/:id`, an Account UI view from account rows, timeline composition from account/contact/opportunity/task/email activity, and agent/docs coverage for using account context before follow-up actions.

Added contact detail timelines: `GET /api/contacts/:id`, Contact UI view from account contacts, timeline composition from contact/task/opportunity/enrollment/email activity, and agent/docs coverage for avoiding duplicate follow-up.

Added saved account views: D1-backed saved filters, account list filtering by saved view, UI controls to apply/save/delete views, and agent/docs coverage.

Added account custom fields: workspace-scoped field definitions, account value storage, account detail display, account creation inputs, Settings field creation, and agent/docs coverage.

Added pipeline board: `GET /api/opportunities`, `PATCH /api/opportunities/:id`, Pipeline UI columns by stage, stage movement controls, and agent/docs coverage.

Added token revocation and audit logs: list/revoke workspace tokens, reject revoked tokens in auth, record audit events for team/workspace/token administration, Settings tables, and agent/docs coverage.

Added account CSV import: UI textarea import, `POST /api/import/accounts.csv`, per-row success/failure reporting, optional first contact creation, and docs/agent coverage.

Added workspace-configurable pipeline stages: D1-backed stage definitions, seeded default stages, API/UI creation, dynamic board columns/selectors, stage-aware reports, and agent/docs coverage.

Added custom-field account filtering and reporting: `cf_<field_key>` account filters, saved view persistence, custom-field filter UI, and report breakdowns by field value.

Added weighted forecast reporting: `/api/reports` now groups open opportunities by close month with raw and confidence-weighted values, and the Reports UI surfaces the forecast table and metric.

Added duplicate-aware imports: CSV import matches existing accounts by domain/name before creating, adds missing contacts when safe, returns created/matched counts, and the Accounts UI shows duplicate account groups from `GET /api/duplicates/accounts`.

Added token-based team invitations: owners/admins can invite a teammate from Settings, the invite grants team membership plus an invite token, invite-token auth marks acceptance, and invitation activity is visible in Settings and audit logs.

Added workspace webhooks: admins can create/disable webhook endpoints from Settings, core account/contact/task/email events deliver JSON payloads, and recent delivery status is recorded for troubleshooting.

Added unsubscribe handling: contacts can be unsubscribed from contact detail or API, active sequence enrollments stop, future manual sends/enrollments are blocked, and unsubscribe events are audited and webhooked.

Added reply handling: contacts can be marked replied from contact detail or API, active sequence enrollments pause with `replied` status, and reply events are audited and webhooked.

Restyled the app/lab against Campsite's current open-source design system: neutral gray tokens, 240px workspace sidebar, compact titlebar, dense panels, small rounded buttons, subtle Campsite-style shadows, table/pill/input treatments, and orange brand accent. Verified `src/ui.js` parsing, loaded `/`, unauthenticated `/app`, authenticated dashboard, and Settings on 390px mobile at `http://localhost:8788`, and fixed mobile tables so wide settings/audit tables scroll inside panels without page overflow.

Added advanced CSV import mapping: `POST /api/import/accounts.csv` now accepts JSON `{ csv, mapping }` while keeping `text/csv` compatibility, the Accounts import form exposes column mapping for account/contact/custom fields, and mapped imports still dedupe by domain/name before creating records.

Added communication activity logging: `communication_events` stores calls, meetings, SMS, WhatsApp, and notes, `/api/communications` and `log_communication` create entries, the Communications UI logs/reviews activity, and account/contact timelines include those events.

Added role-based workspace permissions: invite roles now support `viewer`, read access accepts viewers, CRM mutation endpoints require owner/admin/member, workspace settings endpoints require owner/admin, and mutating account/contact/opportunity/task/email/sequence routes verify records belong to the active workspace.

Added email engagement tracking: workspace admins can enable open/click tracking, outbound emails get tracking IDs and first-party tracking links/pixels when configured, `/t/open/*` and `/t/click/*` record engagement, and reports plus account/contact email activity show open/click counts.

Added reporting depth: `/api/reports` now includes owner performance and source conversion analytics, and the Reports UI shows rep workload/activity/pipeline/won value plus source contacted/replied/qualified/won conversion.

Added calendar capture: `calendar_events` stores meetings, `/api/calendar/events` and `/api/calendar/import.ics` create timeline-linked meetings, the Calendar UI supports manual and ICS import flows, and agents can use `import_calendar_ics`.

Added lead capture forms: workspace admins can create/disable public lead forms, `/forms/<public_key>` accepts browser or JSON submissions, submissions match existing accounts by domain/name before creating contacts, and `lead_form.submitted` webhooks plus audit logs record inbound lead activity.

Broadened audit coverage: account/contact/opportunity/task creation, account/opportunity/task updates, account imports, custom-field administration, sequence enrollments, manual sends, warmup administration, and relevant agent-command writes now record compact workspace audit events without storing sensitive message bodies.

Added field-level permissions for account custom fields: admins choose read/write roles when creating fields, restricted fields are hidden from unauthorized account detail/filter/report responses, and unauthorized custom-field writes are rejected for app, import, and agent account creation/update flows.

Added generic OAuth/OIDC login: self-hosters can configure authorization/token/userinfo endpoints and client credentials, `/api/auth/oauth/start` redirects to the provider, `/api/auth/oauth/callback` creates a browser session, and new OAuth users are gated by `OAUTH_ALLOWED_DOMAINS`.

Added native Slack integrations: workspace admins can create/disable Slack incoming-webhook integrations, subscribe them to selected CRM events, and inspect recent delivery status from Settings alongside webhooks.

Added provider-backed messaging: workspace admins can configure Twilio-compatible SMS/WhatsApp channels, members can send messages from Communications, outbound sends create timeline events plus delivery rows, and agents can use `send_message`.

Added inbound provider messaging: SMS/WhatsApp channels expose admin-visible webhook URLs, Twilio-style inbound callbacks match contacts by phone, create inbound communication timeline events, mark contacts replied, pause active sequence enrollments, and emit `message.received`.

Added AI insights: account and contact detail pages can generate summaries, next steps, risks, and scores through optional OpenAI Responses API configuration, with a local deterministic fallback for self-hosters without an API key.

Added calendar source sync: workspace admins can create ICS/webcal sources mapped to accounts and contacts, run them manually, and scheduled Workers check active sources for due imports.

Added email sender rotation: workspace admins can configure active sender identities with daily caps, and manual/sequence emails pick the least-used sender before falling back to the SMTP env sender.
