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
- [ ] Initialize and publish the GitHub repository once the final repo owner/name is confirmed.
- [ ] Add invitations, password/OAuth login, token revocation UI, and audit logs.
- [ ] Build the next Close-style CRM gaps: detail timelines, saved views, custom fields, import/export, inbound email sync, reporting dashboards, integrations, and communication channels.

## Review

Completed the first open-source productization slice: landing page at `/`, auth-gated app at `/app`, tenant foundation with users/team memberships/teams/workspaces, workspace-aware summaries/accounts/tasks/opportunities, `/api/me`, team/workspace creation endpoints, workspace-scoped agent tokens, docs for GitHub/Cloudflare self-hosting, and `skills/userorbit-crm/SKILL.md` for agents.

Verified JavaScript parsing, local D1 migration with Node 22 runtime, landing/API responses on port 8788, and browser-visible landing/auth/dashboard flow. Port 8787 was already occupied by an existing server, so verification used 8788 and then stopped that verification server.
