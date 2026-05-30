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
- [x] Add duplicate-aware CSV import and account duplicate watchlist.
- [x] Add token-based team invitations.
- [x] Add workspace webhooks and delivery logs.
- [x] Add unsubscribe handling for contacts, manual sends, and sequences.
- [x] Add manual reply handling and sequence pause-on-reply.
- [ ] Add password/OAuth login, workspace membership overrides, and broader audit coverage.
- [ ] Build the next Close-style CRM gaps: advanced import mapping UI, merge workflows, automatic inbound email sync, native integrations, and communication channels.

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
