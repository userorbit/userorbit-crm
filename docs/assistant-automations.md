# Recurring assistant jobs

## Stable integration API

Module exports `handleRequest(request, env, {path, workspaceId, auth, helpers})` and `runScheduled(env, helpers, options = {})`. Path prefix is `automations`. Pass existing requireWorkspaceRole/Write/Admin helpers. Each job belongs to its creator; list/detail/history/notifications and edits filter both workspace and user. DELETE additionally requires admin. Coordinator must enforce token workspace binding before invoking the module.

- GET `automations/templates` -> `{templates}` (id, name, instructions, schedule).
- GET/POST `automations/jobs` -> `{jobs}` / `{job}` (201).
- GET/PATCH/DELETE `automations/jobs/:id` -> `{job}` / `{deleted:true}`.
- GET `automations/jobs/:id/runs` -> `{runs}` (last 100).
- POST `automations/jobs/:id/run` queues a run now -> `{job}` (202); cron executes it.
- GET `automations/notifications` -> `{notifications}` (last 100).
- POST `automations/notifications/:id/read` -> `{notification}`.

Create/edit fields: `name`, `template` (attention, commitments, meeting_brief, network_changes, cited_research), `instructions`, `schedule`, `timezone` (IANA; default UTC), `enabled` (boolean), `maxAttempts` (1–3; default 3). Schedule is `{type:"daily",time:"09:00"}`, `{type:"weekly",time:"09:00",days:[1,3,5]}` (Sunday=0), or `{type:"interval",minutes:60}` (15–10080). Templates provide sensible default instructions/schedules. Stored job fields use SQL snake_case; response parses `schedule_json` as `schedule`, with boolean `enabled`, and omits internal lease tokens and result hash.

Dispatcher contract: `helpers.dispatchAssistantJob(env, {template, instructions, workspaceId, userId, jobId, runId, idempotencyKey, scheduledAt, signal})`. Return `{summary: string, data: JSONValue, changeKey?: JSONValue}`. `data` contains real source-backed results/citations; optional `changeKey` contains the substantive comparison payload (exclude changing timestamps). Without changeKey, data is compared canonically. Empty data arrays are valid real results. Undefined/malformed return fails; absent dispatcher fails explicitly. Must obey AbortSignal and use idempotencyKey for any persisted suggestions/drafts. Never send outreach. Only access this workspace/user's personal data. Dispatcher must enforce template-specific scope/citation rules. Scheduling provides at-least-once execution across crashed processes; the stable per-slot idempotency key permits downstream deduplication.

`runScheduled` returns `{claimed,succeeded,unchanged,retrying,failed}`. Optional `{now,limit}` supports deterministic tests (now epoch milliseconds; limit max 20). Production omits options. It rechecks creator write access before every execution. Max execution time 60 seconds; lease 5 minutes. Retries wait 1 then 2 minutes, at most three attempts. Successful and failed terminal slots advance to the next future schedule, avoiding catch-up floods. Expired leases can be reclaimed; fenced completion prevents an old runner overwriting a newer attempt. Paused jobs are not claimed. Jobs cannot be edited/deleted or manually queued during an active lease.

Migration 0052 creates `assistant_jobs`, `assistant_job_runs`, and `assistant_job_notifications`. Runs persist genuine summary/data and errors; unchanged successes remain in history but do not notify. Notifications are personal and in-app only, generated for changed successes and terminal failures. Notifications never contain provider errors/credentials. Error codes are sanitized; raw dispatcher exception messages are not persisted or exposed.

Daily/weekly schedules use local wall time. Missing spring-forward times skip that day; repeated fall-back times execute once per local day. Interval schedules use elapsed UTC minutes. Editing schedules recomputes next due time; pending retry is cancelled with its history retained. Changing instructions/template clears the comparison baseline. Manual runs supersede pending retries and recompute the next regular due time after completion.

## Implementation plan

- [x] Persist jobs, runs, notifications and lease state.
- [x] Implement validated schedules, scoped CRUD, dispatcher and fenced finalization.
- [x] Verify schedules, concurrency, retries, permissions and isolation using Bun/SQLite.
- [x] Review and commit only owned files.

## Verification and limitations

`bun test tests/automations.test.js`: 17 tests, 86 assertions, all passing against disposable SQLite with all local migrations applied. Covers IANA zones, spring/fall DST, fall-back completion, invalid schedules, scoped CRUD, viewer/admin access, revoked access, missing/invalid dispatch, non-Error rejection, concurrent claims, delayed history insertion, stale completion, backoff, exhaustion, recovery, unchanged results, notification reads, pause/manual queue/edit. `git diff --check` passes. No remote resources or provider calls used.

No cross-module implementation or UI is included: coordinator must inject the dispatcher and mount the routes/cron. The dispatcher must honor cancellation and persist any suggestions idempotently; a crashed worker cannot provide exactly-once external side effects. No endpoint sends email or invokes legacy sequence sends. The per-slot history aggregates retry attempt count and retains the latest outcome, rather than storing a separate row for every attempt. DELETE removes the personal job and cascades its history/notifications and requires admin membership.

Additional public exports for testing/UI: `templates`, `validateSchedule(schedule)`, `nextScheduledAt(schedule, timezone, afterEpochMs, previousOccurrenceEpochMs?)`. Results are ISO UTC timestamps; passing the prior scheduled occurrence prevents a repeated local-time slot when completion crosses a fall-back boundary.
