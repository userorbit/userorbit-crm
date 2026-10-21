# Network assistant API

All endpoints use `/api/assistant/network`; `handleRequest(request, env, {path,workspaceId,auth,helpers})` follows the shared contract. The module additionally enforces read membership and write membership through helpers. All imported identities, graph edges, observations, alerts and monitors are personal to the authenticated user and workspace. Existing CRM rows are never modified or merged.

## Stable routes

- `POST /imports/preview`: `{format:"csv"|"json", content:string|array, mapping?:{name,first_name,last_name,email,linkedin_url,company,title,connected_at}}`. Mapping values are source column keys. Returns `{rows:[{name,email,linkedin_url,company,title,connected_at,fingerprint,candidates:[{id,name,email,reason}],warnings:[]}],count}`. CSV supports LinkedIn preamble, quoted commas/newlines and BOM. Maximum 500 rows / 1 MB. Ambiguous names never auto-match.
- `POST /imports`: same input plus `confirm:true`. Returns `{imported,duplicates,items}`; creates pending review identities and evidenced self→identity connections. Idempotent by normalized identity (LinkedIn URL, else email, else complete row) per user/workspace. Does not create fake contact emails.
- `GET /imports`: `{items}` including pending/matched/rejected state and contact_id.
- `POST /imports/:id/match`: `{confirm:true,contact_id:string|null}` explicitly links a workspace contact, or unlinks with null; `{confirm:true,reject:true}` rejects. Matching never merges or changes contact ownership/email. Rejected identities are excluded from intro paths.
- `POST /capture`: `{confirm:true,url:"https://www.linkedin.com/in/...",name,email?,company?,title?}`. Explicit user-invoked capture stages one identity with source evidence. No arbitrary URL fetching or background scraping.
- `GET /edges`: `{items}`.
- `POST /edges`: `{confirm:true,from_node:"self"|"contact:ID"|"import:ID",to_node:...,relationship:"connection"|"colleague"|"referral"|"introduced",evidence:string,source_url?:httpsUrl}`. Returns `{item}`. Requires existing scoped nodes and evidence.
- `DELETE /edges/:id`: removes an owned edge.
- `GET /paths?to=contact:ID&from=self&max_hops=3`: returns `{paths:[{nodes,edges}],notice}`. Up to 10 paths, 3 hops, 500 edges. Every hop carries supplied evidence; paths are suggestions, never an assertion that an introduction is available. Matched import identities resolve to the linked contact.
- `POST /observations`: `{confirm:true,entity_type:"contact"|"account",entity_id,values:{field:string|null},source_url:httpsUrl,evidence:string}`. Allowed fields: name,title,company,location,headline,website,industry. Returns `{observation,alerts}`. Initial snapshot establishes baseline; only subsequently supplied fields generate before/after alerts. Does not update CRM records.
- `GET /observations?entity_type=contact&entity_id=...`: `{items}`.
- `GET /alerts`: `{items}` with before_value,after_value,field,evidence,source_url.
- `POST /alerts/:id/acknowledge`: marks an owned alert read.
- `GET /monitors`: `{configured,items}` (no credentials).
- `POST /monitors`: `{confirm:true,entity_type,entity_id,url:httpsUrl,interval_hours?:24}`. Requires configured provider, minimum 24h; returns `{item}`.
- `DELETE /monitors/:id`: removes an owned monitor.

Exports: `handleRequest`, `runScheduled(env,helpers)`, `findIntroPaths(env,workspaceId,userId,options)`, `recordObservation(env,workspaceId,userId,input)`, `previewImport(env,workspaceId,input)`.

## Provider adapter and scheduler

Optional `env.NETWORK_OBSERVER` is a Cloudflare service binding implementing `fetch(Request)`. The application must supply a real provider-backed adapter; absent it, monitoring reports `configured:false` and cannot be enabled. The adapter receives POST `https://network-observer.internal/observe` with JSON `{entity_type,entity_id,url}` and returns `{values:{...},source_url:httpsUrl,evidence:string}`. Credentials remain in the adapter. No arbitrary client-provided provider endpoint or token is stored. Adapter should validate target URLs against its provider policy. Scheduler uses bounded work (10 monitors/run), timeout, leases, retries on the next cron, and sanitized status. Alerts are in-app only. A failed provider response never invents observations.

## Storage (migration 0051)

`assistant_network_imports`: id,workspace_id,user_id,fingerprint,name,email,linkedin_url,company,title,connected_at,source,contact_id,status,created_at; unique workspace/user/fingerprint.
`assistant_network_edges`: id,workspace_id,user_id,from_node,to_node,relationship,evidence,source_url,created_at; unique workspace/user/from/to/relationship.
`assistant_network_observations`: id,workspace_id,user_id,entity_type,entity_id,values_json,source_url,evidence,created_at.
`assistant_network_alerts`: id,workspace_id,user_id,observation_id,entity_type,entity_id,field,before_value,after_value,evidence,source_url,acknowledged_at,created_at.
`assistant_network_monitors`: id,workspace_id,user_id,entity_type,entity_id,url,interval_hours,next_run_at,lease_until,last_status,last_checked_at; unique workspace/user/entity type/id.

## Implementation plan

- [x] Implement parsing, review queue and capture.
- [x] Implement evidenced graph and observations/provider scheduling.
- [x] Verify with disposable SQLite and commit owned files.

## Verification and limits

`bun test tests/network*.test.js`: SQLite integration and extension validation cover archive bounds, quoting/mappings, idempotency, permissions/token workspace binding, review-safe linking, graph evidence, partial snapshots, concurrent observations, scheduler leases, access revocation and provider retries. Imports and edges commit atomically using JSON-backed SQLite bulk writes; candidate and graph resolution queries are bounded to avoid per-row database calls. Concurrent observation conflicts return HTTP 409 for retry rather than duplicate alerts.

Optional Chrome entry: `chrome-extension/network-capture/` (installation and permissions documented in its README). It captures only the active LinkedIn profile URL and explicitly entered details, with confirmed save and ephemeral token handling. No Chrome Web Store publication, live provider validation, remote migration or production request was performed. Chrome installation/authenticated smoke testing remains an integration check.

No bundled observation provider is claimed. Supply a real `NETWORK_OBSERVER` service binding to enable scheduled updates. Preview candidate results are limited to 10,000 workspace contacts matching input identities and 20 candidates per row; contact matching always requires explicit review. Graph traversal uses at most 500 newest edges, 3 hops, 5,000 expanded states and 10 paths. Imports/listing are limited to 500 rows per request; clients can split large archives into batches. No contact/company CRM fields are overwritten and no outreach is sent.
