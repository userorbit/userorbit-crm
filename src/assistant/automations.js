import { fail, readBody, rows } from './shared.js';

export const templates = [
  { id: 'attention', name: 'Relationship attention', instructions: 'Review relationships needing attention and suggest next actions with supporting sources.' },
  { id: 'commitments', name: 'Commitment review', instructions: 'Review outstanding commitments, deadlines, and supporting messages. Suggest follow-ups without sending.' },
  { id: 'meeting_brief', name: 'Meeting preparation', instructions: 'Prepare briefs for upcoming meetings with relationship context and source references.' },
  { id: 'network_changes', name: 'Network change review', instructions: 'Review recorded contact and company changes with evidence and suggest useful actions.' },
  { id: 'cited_research', name: 'Cited research', instructions: 'Research recent workspace knowledge relevant to my relationships and cite each finding.' },
].map(template => ({ ...template, schedule: { type: 'daily', time: '09:00' } }));
const iso = time => new Date(time).toISOString();
const LEASE_MS = 300000;
const RUN_MS = 60000;

function zoneFormatter(timezone) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' });
  } catch { throw fail(400, 'Invalid IANA timezone'); }
}

export function validateSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) throw fail(400, 'Schedule is required');
  if (schedule.type === 'interval') {
    if (!Number.isInteger(schedule.minutes) || schedule.minutes < 15 || schedule.minutes > 10080) throw fail(400, 'Interval must be 15–10080 minutes');
    return { type: 'interval', minutes: schedule.minutes };
  }
  if (!['daily', 'weekly'].includes(schedule.type) || typeof schedule.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)) throw fail(400, 'Use a daily or weekly schedule with HH:mm time');
  const normalized = { type: schedule.type, time: schedule.time };
  if (schedule.type === 'weekly') {
    if (!Array.isArray(schedule.days) || !schedule.days.length || schedule.days.length > 7 || schedule.days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw fail(400, 'Weekly days must be numbers 0–6');
    normalized.days = [...new Set(schedule.days)].sort();
  }
  return normalized;
}

export function nextScheduledAt(schedule, timezone = 'UTC', after = Date.now(), previousOccurrence = null) {
  schedule = validateSchedule(schedule);
  const formatter = zoneFormatter(timezone);
  if (!Number.isFinite(after)) throw fail(400, 'Invalid schedule date');
  if (schedule.type === 'interval') return iso(after + schedule.minutes * 60000);
  const parts = time => Object.fromEntries(formatter.formatToParts(time).map(part => [part.type, part.value]));
  const initial = parts(after);
  const localDate = part => `${part.year}-${part.month}-${part.day}`;
  const initialDate = localDate(initial);
  const previous = previousOccurrence === null ? null : parts(previousOccurrence);
  const previousDate = previous && `${previous.hour}:${previous.minute}` === schedule.time ? localDate(previous) : null;
  const alreadyPassed = `${initial.hour}:${initial.minute}` >= schedule.time;
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // Searching UTC minutes also handles fractional timezone offsets and DST gaps.
  for (let minute = Math.floor(after / 60000) * 60000 + 60000, end = after + 15 * 86400000; minute <= end; minute += 60000) {
    const part = parts(minute);
    if (localDate(part) === previousDate || (alreadyPassed && localDate(part) === initialDate)) continue;
    if (`${part.hour}:${part.minute}` === schedule.time && (schedule.type === 'daily' || schedule.days.includes(weekdays.indexOf(part.weekday)))) return iso(minute);
  }
  throw fail(400, 'No occurrence found for schedule');
}

function boundedText(value, field, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw fail(400, `${field} must contain 1–${max} characters`);
  return value.trim();
}
function jobResponse(job) {
  const { lease_token, lease_until, last_result_hash, schedule_json, ...visible } = job;
  return { ...visible, schedule: JSON.parse(schedule_json), enabled: Boolean(job.enabled), running: Boolean(lease_token && lease_until > iso(Date.now())) };
}
function normalize(input, old = null) {
  const template = input.template ?? old?.template ?? 'attention';
  const defaults = templates.find(item => item.id === template);
  if (!defaults) throw fail(400, 'Unknown assistant job template');
  const timezone = input.timezone ?? old?.timezone ?? 'UTC';
  if (typeof timezone !== 'string' || timezone.length > 100) throw fail(400, 'Invalid IANA timezone');
  zoneFormatter(timezone);
  const enabled = input.enabled ?? (old ? Boolean(old.enabled) : true);
  if (typeof enabled !== 'boolean') throw fail(400, 'enabled must be boolean');
  const maxAttempts = input.maxAttempts ?? old?.max_attempts ?? 3;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) throw fail(400, 'maxAttempts must be 1–3');
  return {
    name: boundedText(input.name ?? old?.name ?? defaults.name, 'Name', 120), template,
    instructions: boundedText(input.instructions ?? old?.instructions ?? defaults.instructions, 'Instructions', 8000),
    schedule: validateSchedule(input.schedule ?? (old ? JSON.parse(old.schedule_json) : defaults.schedule)), timezone, enabled, maxAttempts,
  };
}
async function personalJob(env, id, workspaceId, userId) {
  const job = await env.DB.prepare('SELECT * FROM assistant_jobs WHERE id = ? AND workspace_id = ? AND user_id = ?').bind(id, workspaceId, userId).first();
  if (!job) throw fail(404, 'Assistant job not found');
  return job;
}
function assertIdle(job, now) {
  if (job.lease_token && job.lease_until > now) throw fail(409, 'Job is running; try again after it finishes');
}

export async function handleRequest(request, env, context) {
  const { path, workspaceId, auth, helpers } = context;
  if (path !== 'automations' && !path.startsWith('automations/')) return null;
  if (!auth?.user?.id) throw fail(401, 'Authentication required');
  const userId = auth.user.id;
  await helpers.requireWorkspaceRole(env, userId, workspaceId, ['owner', 'admin', 'member', 'viewer']);
  if (!['GET', 'HEAD'].includes(request.method)) await helpers.requireWorkspaceWrite(env, auth, workspaceId);
  const parts = path.split('/');
  const method = request.method;
  const now = iso(Date.now());
  if (path === 'automations/templates' && method === 'GET') return Response.json({ templates });
  if (path === 'automations/jobs' && method === 'GET') {
    return Response.json({ jobs: (await rows(env, 'SELECT * FROM assistant_jobs WHERE workspace_id = ? AND user_id = ? ORDER BY created_at DESC', workspaceId, userId)).map(jobResponse) });
  }
  if (path === 'automations/jobs' && method === 'POST') {
    const input = normalize(await readBody(request, 16384));
    const id = crypto.randomUUID();
    const next = nextScheduledAt(input.schedule, input.timezone);
    await env.DB.prepare(`INSERT INTO assistant_jobs (id, workspace_id, user_id, name, template, instructions, schedule_json, timezone, enabled, max_attempts, next_run_at, next_attempt_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id, workspaceId, userId, input.name, input.template, input.instructions, JSON.stringify(input.schedule), input.timezone, Number(input.enabled), input.maxAttempts, next, next, now, now).run();
    return Response.json({ job: jobResponse(await personalJob(env, id, workspaceId, userId)) }, { status: 201 });
  }
  if (path === 'automations/notifications' && method === 'GET') return Response.json({ notifications: await rows(env, 'SELECT * FROM assistant_job_notifications WHERE workspace_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 100', workspaceId, userId) });
  if (parts[1] === 'notifications' && parts.length === 4 && parts[3] === 'read' && method === 'POST') {
    const notification = await env.DB.prepare('UPDATE assistant_job_notifications SET read_at = COALESCE(read_at, ?) WHERE id = ? AND workspace_id = ? AND user_id = ? RETURNING *').bind(now, parts[2], workspaceId, userId).first();
    if (!notification) throw fail(404, 'Notification not found');
    return Response.json({ notification });
  }
  if (parts[1] !== 'jobs' || !parts[2] || parts.length > 4) throw fail(404, 'Automation route not found');
  const job = await personalJob(env, parts[2], workspaceId, userId);
  if (parts.length === 4 && parts[3] === 'runs' && method === 'GET') {
    const runs = await rows(env, 'SELECT * FROM assistant_job_runs WHERE job_id = ? AND workspace_id = ? AND user_id = ? ORDER BY scheduled_at DESC LIMIT 100', job.id, workspaceId, userId);
    return Response.json({ runs: runs.map(({ result_json, ...run }) => ({ ...run, result: result_json ? JSON.parse(result_json) : null })) });
  }
  if (parts.length === 3 && method === 'GET') return Response.json({ job: jobResponse(job) });
  if (parts.length === 3 && method === 'DELETE') {
    await helpers.requireWorkspaceAdmin(env, auth, workspaceId);
    assertIdle(job, now);
    const result = await env.DB.prepare('DELETE FROM assistant_jobs WHERE id = ? AND workspace_id = ? AND user_id = ? AND (lease_until IS NULL OR lease_until <= ?)').bind(job.id, workspaceId, userId, now).run();
    if (!result.meta.changes) throw fail(409, 'Job is running');
    return Response.json({ deleted: true });
  }
  const manual = parts.length === 4 && parts[3] === 'run' && method === 'POST';
  if ((parts.length === 3 && method === 'PATCH') || manual) {
    assertIdle(job, now);
    if (manual && !job.enabled) throw fail(409, 'Enable the job before running it');
    const input = normalize(manual ? {} : await readBody(request, 16384), job);
    const next = manual ? now : nextScheduledAt(input.schedule, input.timezone);
    const resetHash = input.template !== job.template || input.instructions !== job.instructions;
    // Cancellation and revision are fenced against a concurrent scheduler claim.
    await env.DB.batch([
      env.DB.prepare(`UPDATE assistant_job_runs SET status = 'cancelled', finished_at = ? WHERE job_id = ? AND workspace_id = ? AND user_id = ? AND status IN ('retrying','running') AND EXISTS (SELECT 1 FROM assistant_jobs WHERE id = ? AND (lease_until IS NULL OR lease_until <= ?))`).bind(now, job.id, workspaceId, userId, job.id, now),
      env.DB.prepare(`UPDATE assistant_jobs SET name=?, template=?, instructions=?, schedule_json=?, timezone=?, enabled=?, max_attempts=?, next_run_at=?, next_attempt_at=?, attempts=0, lease_token=NULL, lease_until=NULL, last_result_hash=CASE WHEN ? THEN NULL ELSE last_result_hash END, updated_at=? WHERE id=? AND workspace_id=? AND user_id=? AND (lease_until IS NULL OR lease_until <= ?)`)
        .bind(input.name, input.template, input.instructions, JSON.stringify(input.schedule), input.timezone, Number(input.enabled), input.maxAttempts, next, next, Number(resetHash), now, job.id, workspaceId, userId, now),
    ]).then(results => { if (!results[1].meta.changes) throw fail(409, 'Job is running'); });
    return Response.json({ job: jobResponse(await personalJob(env, job.id, workspaceId, userId)) }, { status: manual ? 202 : 200 });
  }
  throw fail(405, 'Method not allowed');
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
async function resultHash(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
async function dispatch(env, helpers, job, runId) {
  if (typeof helpers.dispatchAssistantJob !== 'function') throw Object.assign(new Error(), { code: 'NOT_CONFIGURED' });
  await helpers.requireWorkspaceWrite(env, { user: { id: job.user_id } }, job.workspace_id);
  const controller = new AbortController();
  let timer;
  try {
    const result = await Promise.race([
      Promise.resolve().then(() => helpers.dispatchAssistantJob(env, {
        template: job.template, instructions: job.instructions, workspaceId: job.workspace_id, userId: job.user_id,
        jobId: job.id, runId, idempotencyKey: runId, scheduledAt: job.next_run_at, signal: controller.signal,
      })),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(Object.assign(new Error(), { code: 'TIMEOUT' })); }, RUN_MS); }),
    ]);
    if (!result || typeof result.summary !== 'string' || !result.summary.trim() || result.summary.length > 4000 || result.data === undefined) throw Object.assign(new Error(), { code: 'INVALID_RESULT' });
    const serialized = JSON.stringify(result);
    if (serialized.length > 262144) throw Object.assign(new Error(), { code: 'RESULT_TOO_LARGE' });
    const clean = JSON.parse(serialized);
    if (clean.data === undefined) throw Object.assign(new Error(), { code: 'INVALID_RESULT' });
    return { summary: clean.summary, data: clean.data, hash: await resultHash(clean.changeKey === undefined ? clean.data : clean.changeKey) };
  } finally { clearTimeout(timer); }
}

async function finish(env, job, runId, now, outcome) {
  const terminal = outcome.status !== 'retrying';
  const next = terminal ? nextScheduledAt(JSON.parse(job.schedule_json), job.timezone, now, Date.parse(job.next_run_at)) : job.next_run_at;
  const nextAttempt = terminal ? next : iso(now + 60000 * 2 ** Math.max(0, job.attempts - 1));
  const guard = 'EXISTS (SELECT 1 FROM assistant_jobs WHERE id = ? AND workspace_id = ? AND user_id = ? AND lease_token = ?)';
  const bindings = [job.id, job.workspace_id, job.user_id, job.lease_token];
  const statements = [env.DB.prepare(`UPDATE assistant_job_runs SET status=?, finished_at=?, summary=?, result_json=?, error_code=? WHERE id=? AND workspace_id=? AND user_id=? AND ${guard}`)
    .bind(outcome.status, iso(now), outcome.result?.summary ?? null, outcome.result ? JSON.stringify(outcome.result.data) : null, outcome.error ?? null, runId, job.workspace_id, job.user_id, ...bindings)];
  if (outcome.status === 'succeeded' || outcome.status === 'failed') {
    statements.push(env.DB.prepare(`INSERT INTO assistant_job_notifications (id, job_id, run_id, workspace_id, user_id, kind, message, created_at) SELECT ?,?,?,?,?,?,?,? WHERE ${guard} ON CONFLICT(run_id) DO NOTHING`)
      .bind(crypto.randomUUID(), job.id, runId, job.workspace_id, job.user_id, outcome.status === 'failed' ? 'failure' : 'result', outcome.result?.summary ?? 'Assistant job failed. Review its run history and configuration.', iso(now), ...bindings));
  }
  statements.push(env.DB.prepare(`UPDATE assistant_jobs SET next_run_at=?, next_attempt_at=?, attempts=?, lease_token=NULL, lease_until=NULL, last_result_hash=COALESCE(?,last_result_hash), updated_at=? WHERE id=? AND workspace_id=? AND user_id=? AND lease_token=?`)
    .bind(next, nextAttempt, terminal ? 0 : job.attempts, outcome.result?.hash ?? null, iso(now), ...bindings));
  const results = await env.DB.batch(statements);
  return Boolean(results.at(-1).meta.changes);
}

export async function runScheduled(env, helpers, options = {}) {
  const clock = () => options.now ?? Date.now();
  const now = clock();
  const limit = Math.min(20, Math.max(1, Math.floor(options.limit || 10)));
  const candidates = await rows(env, 'SELECT id, workspace_id, user_id FROM assistant_jobs WHERE enabled = 1 AND next_attempt_at <= ? AND (lease_until IS NULL OR lease_until <= ?) ORDER BY next_attempt_at LIMIT ?', iso(now), iso(now), limit);
  const counts = { claimed: 0, succeeded: 0, unchanged: 0, retrying: 0, failed: 0 };
  for (const candidate of candidates) {
    const claimedAt = clock();
    const job = await env.DB.prepare(`UPDATE assistant_jobs SET lease_token=?, lease_until=?, attempts=attempts+1 WHERE id=? AND workspace_id=? AND user_id=? AND enabled=1 AND next_attempt_at<=? AND (lease_until IS NULL OR lease_until<=?) RETURNING *`)
      .bind(crypto.randomUUID(), iso(claimedAt + LEASE_MS), candidate.id, candidate.workspace_id, candidate.user_id, iso(claimedAt), iso(claimedAt)).first();
    if (!job) continue;
    counts.claimed++;
    const runId = `${job.id}:${job.next_run_at}`;
    const recorded = await env.DB.prepare(`INSERT INTO assistant_job_runs (id,job_id,workspace_id,user_id,scheduled_at,status,attempts,started_at) SELECT ?,?,?,?,?,'running',?,? WHERE EXISTS (SELECT 1 FROM assistant_jobs WHERE id=? AND workspace_id=? AND user_id=? AND lease_token=?) ON CONFLICT(job_id,scheduled_at) DO UPDATE SET status='running', attempts=excluded.attempts, started_at=excluded.started_at, finished_at=NULL, error_code=NULL`)
      .bind(runId, job.id, job.workspace_id, job.user_id, job.next_run_at, Math.min(job.attempts, job.max_attempts), iso(claimedAt), job.id, job.workspace_id, job.user_id, job.lease_token).run();
    if (!recorded.meta.changes) continue;
    let outcome;
    try {
      if (job.attempts > job.max_attempts) throw Object.assign(new Error(), { code: 'LEASE_EXHAUSTED' });
      const result = await dispatch(env, helpers, job, runId);
      outcome = { status: result.hash === job.last_result_hash ? 'unchanged' : 'succeeded', result };
    } catch (error) {
      const allowed = ['NOT_CONFIGURED', 'TIMEOUT', 'INVALID_RESULT', 'RESULT_TOO_LARGE', 'LEASE_EXHAUSTED'];
      let code = 'DISPATCH_FAILED';
      if (allowed.includes(error?.code)) code = error.code;
      if (error?.status === 403 || error?.status === 404) code = 'ACCESS_REVOKED';
      outcome = { status: job.attempts >= job.max_attempts || ['ACCESS_REVOKED', 'NOT_CONFIGURED', 'INVALID_RESULT', 'RESULT_TOO_LARGE'].includes(code) ? 'failed' : 'retrying', error: code };
    }
    if (await finish(env, job, runId, clock(), outcome)) counts[outcome.status]++;
  }
  return counts;
}
