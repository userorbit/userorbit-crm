# Importing an Orbit CRM snapshot

The importer accepts a consistent read-only PostgreSQL snapshot with `timestamp`,
`schema`, and `data` (table names mapped to rows). Generated SQL and snapshots
contain customer data and credential hashes. Keep them outside the repository,
with owner-only filesystem permissions. The scripts never connect to production.

1. Capture a consistent source snapshot, including schema, functions, triggers,
   indexes, sequence values, constraints, and all rows. Restore the backup into a
   temporary PostgreSQL database and compare every value before proceeding.
2. Apply the target migrations to a staging copy of D1. Generate SQL:
   `python3 scripts/import-orbit-snapshot.py SNAPSHOT PRIVATE_OUTPUT.sql`.
3. Execute the SQL against staging, repeat it to verify idempotence, then run
   `python3 scripts/verify-orbit-import.py SNAPSHOT STAGING.sqlite`.
4. Test every imported user's access, private mail, and the original sign-in hash
   format. Use temporary verification sessions and delete them afterwards.
5. Apply migration support and import into the still-unrouted target. Reconcile
   the final source snapshot before moving the hostname. Preserve the original
   service and database as the fallback.

Run importer regression checks with `python3 tests/orbit-import.test.py` and the
Worker regression suite with `bun test`.

## Native records and permissions

Each source workspace becomes a team, with one execution workspace per owner.
Founders become team owners, managers team admins, and individual contributors
receive membership only in their own execution workspace. This preserves the
visibility boundary through existing queries, exports, AI, and MCP checks.
Company owners remain named explicitly. Individual contributors cannot change
company lifecycle/ownership, import/reassign records, configure administrative
features, or activate outreach automation through the migrated workspace.

Companies, contacts, tasks, and activity notes map into native tables. Missing
email addresses are represented by an empty string; the partial unique index
continues protecting real addresses. No addresses are fabricated. Archived
contacts are prevented from receiving outreach. Original status, ownership,
priority, hierarchy, location, and other source fields remain in history.

Two contacts in the initial migration have an individual contributor as their
contact owner and a founder as their company owner. Their native copies remain
with their company; their contact owner can also read the original through
history. Companies are never duplicated into another owner's workspace.

## Preserved history and remaining workflows

`/migration-history` provides session-authenticated, read-only source records,
including research, approvals, campaigns, goals, draft outreach, mail, and
attachments. Its explicit per-record ACL is independent of target team-admin
permissions: private mail remains visible only to its mailbox owner. Credentials,
sessions, invitations, API tokens, and password hashes are excluded from this API.
Large JSON and binary attachments use ordered chunks and byte checksums.

Source outreach sequences stay in history and never become active native send
jobs. Unsupported source workflows and original unified reports remain available
in the original application at `gtm.userorb.com`; a history copy is not feature
parity. Owner reassignment across native workspaces requires moving related
records and is not automated by this importer. Edits made in the original app
following cutover are not automatically synchronized into the new application.

The importer is intended for the pre-cutover migration window. It refreshes
source ACLs and replaces chunks, and does not overwrite a native record or
upgraded password with an older source revision. It is not a continuous or
bidirectional synchronization service. Importing a fresh snapshot replaces all
source ACLs, so run only against a complete source snapshot, never a partial one.
