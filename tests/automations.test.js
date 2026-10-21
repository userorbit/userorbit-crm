import { afterEach, describe, expect, test } from 'bun:test';
import { createD1 } from './helpers/d1.js';
import { handleRequest, nextScheduledAt, runScheduled, validateSchedule } from '../src/assistant/automations.js';

const databases = [];
afterEach(() => { for (const db of databases.splice(0)) db.close(); });
function setup() {
  const db = createD1();
  databases.push(db);
  const env = { DB: db.DB };
  const roles = new Map([['workspace_default:user_bootstrap', 'owner'], ['workspace_other:user_bootstrap', 'member'], ['workspace_default:user_other', 'member']]);
  db.sqlite.exec(`INSERT INTO workspaces VALUES ('workspace_other','team_default','Other','other','2026-01-01','2026-01-01');
    INSERT INTO users (id,email,name,status,created_at,updated_at) VALUES ('user_other','other@example.com','Other','active','2026-01-01','2026-01-01')`);
  const helpers = {
    async requireWorkspaceRole(env, userId, workspaceId, allowed) {
      if (!allowed.includes(roles.get(`${workspaceId}:${userId}`))) throw Object.assign(new Error('Forbidden'), { status: 403 });
    },
    async requireWorkspaceWrite(env, auth, workspaceId) { return this.requireWorkspaceRole(env, auth.user.id, workspaceId, ['owner','admin','member']); },
    async requireWorkspaceAdmin(env, auth, workspaceId) { return this.requireWorkspaceRole(env, auth.user.id, workspaceId, ['owner','admin']); },
    async dispatchAssistantJob(env, input) { return { summary: 'One commitment', data: [{ id: 'commitment-1', source: 'message-1', userId: input.userId }] }; },
  };
  async function request(method, path, body, workspaceId = 'workspace_default', userId = 'user_bootstrap') {
    return handleRequest(new Request(`https://example.com/api/assistant/${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) }), env, { path, workspaceId, auth: { user: { id: userId } }, helpers });
  }
  async function create(body = {}, workspaceId, userId) {
    return (await (await request('POST', 'automations/jobs', body, workspaceId, userId)).json()).job;
  }
  function due(job, time = Date.parse('2026-10-21T08:00:00Z')) {
    const at = new Date(time).toISOString();
    db.sqlite.prepare('UPDATE assistant_jobs SET next_run_at=?, next_attempt_at=? WHERE id=?').run(at, at, job.id);
    return time;
  }
  return { ...db, env, helpers, roles, request, create, due };
}

describe('schedules', () => {
  test('daily and weekly respect IANA timezone and interval uses elapsed time', () => {
    expect(nextScheduledAt({ type: 'daily', time: '09:00' }, 'Asia/Kolkata', Date.parse('2026-10-20T22:00:00Z'))).toBe('2026-10-21T03:30:00.000Z');
    expect(nextScheduledAt({ type: 'weekly', time: '09:00', days: [1] }, 'UTC', Date.parse('2026-10-21T08:00:00Z'))).toBe('2026-10-26T09:00:00.000Z');
    expect(nextScheduledAt({ type: 'interval', minutes: 15 }, 'UTC', Date.parse('2026-10-21T08:00:00Z'))).toBe('2026-10-21T08:15:00.000Z');
  });
  test('DST missing hour skips day and repeated hour runs once', () => {
    expect(nextScheduledAt({ type: 'daily', time: '02:30' }, 'America/New_York', Date.parse('2026-03-08T05:00:00Z'))).toBe('2026-03-09T06:30:00.000Z');
    expect(nextScheduledAt({ type: 'daily', time: '01:30' }, 'America/New_York', Date.parse('2026-11-01T05:30:00Z'))).toBe('2026-11-02T06:30:00.000Z');
  });
  test('invalid schedule inputs fail clearly', () => {
    for (const schedule of [{ type: 'interval', minutes: 1 }, { type: 'daily', time: '25:00' }, { type: 'weekly', time: '10:00', days: [] }, { type: 'weekly', time: '10:00', days: [7] }]) expect(() => validateSchedule(schedule)).toThrow();
    expect(() => nextScheduledAt({ type: 'daily', time: '09:00' }, 'Made/Up')).toThrow('timezone');
  });
});

test('CRUD validates fields, supports templates, protects viewer/admin routes', async () => {
  const s = setup();
  expect((await (await s.request('GET', 'automations/templates')).json()).templates).toHaveLength(5);
  await expect(s.create({ enabled: 'true' })).rejects.toMatchObject({ status: 400 });
  await expect(s.create({ maxAttempts: 4 })).rejects.toMatchObject({ status: 400 });
  await expect(s.create({ instructions: '' })).rejects.toMatchObject({ status: 400 });
  const job = await s.create({ template: 'cited_research', timezone: 'Asia/Kolkata' });
  expect(job.template).toBe('cited_research');
  expect(job).not.toHaveProperty('lease_token');
  const updated = await (await s.request('PATCH', `automations/jobs/${job.id}`, { instructions: 'Find sourced notes', enabled: false })).json();
  expect(updated.job.instructions).toBe('Find sourced notes');
  await expect(s.request('POST', `automations/jobs/${job.id}/run`)).rejects.toMatchObject({ status: 409 });
  s.roles.set('workspace_default:user_bootstrap', 'viewer');
  expect((await s.request('GET', 'automations/jobs')).status).toBe(200);
  await expect(s.create()).rejects.toMatchObject({ status: 403 });
  await expect(s.request('PATCH', `automations/jobs/${job.id}`, { name: 'No' })).rejects.toMatchObject({ status: 403 });
  s.roles.set('workspace_default:user_bootstrap', 'member');
  await expect(s.request('DELETE', `automations/jobs/${job.id}`)).rejects.toMatchObject({ status: 403 });
  s.roles.set('workspace_default:user_bootstrap', 'admin');
  expect((await s.request('DELETE', `automations/jobs/${job.id}`)).status).toBe(200);
});

test('workspace and personal isolation cover reads, updates, history, and notification acknowledgement', async () => {
  const s = setup();
  const job = await s.create();
  await s.create({}, 'workspace_other');
  await s.create({}, 'workspace_default', 'user_other');
  const now = s.due(job);
  await runScheduled(s.env, s.helpers, { now });
  expect((await (await s.request('GET', 'automations/jobs')).json()).jobs).toHaveLength(1);
  for (const [workspace, user] of [['workspace_other', 'user_bootstrap'], ['workspace_default', 'user_other']]) {
    for (const suffix of ['', '/runs']) await expect(s.request('GET', `automations/jobs/${job.id}${suffix}`, undefined, workspace, user)).rejects.toMatchObject({ status: 404 });
    await expect(s.request('PATCH', `automations/jobs/${job.id}`, { name: 'intrusion' }, workspace, user)).rejects.toMatchObject({ status: 404 });
    expect((await (await s.request('GET', 'automations/notifications', undefined, workspace, user)).json()).notifications).toHaveLength(0);
    const notification = s.sqlite.prepare('SELECT * FROM assistant_job_notifications').get();
    await expect(s.request('POST', `automations/notifications/${notification.id}/read`, {}, workspace, user)).rejects.toMatchObject({ status: 404 });
  }
});

test('concurrent cron invocations claim once and persist actual results', async () => {
  const s = setup();
  const job = await s.create();
  const now = s.due(job, Date.now());
  let calls = 0;
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  s.helpers.dispatchAssistantJob = async (env, input) => { calls++; expect(input.workspaceId).toBe('workspace_default'); expect(input.userId).toBe('user_bootstrap'); expect(input.signal).toBeInstanceOf(AbortSignal); await pending; return { summary: 'Actual finding', data: [{ source: 'note:42' }] }; };
  const first = runScheduled(s.env, s.helpers, { now });
  await new Promise(resolve => setTimeout(resolve, 10));
  const second = await runScheduled(s.env, s.helpers, { now });
  expect(second.claimed).toBe(0);
  await expect(s.request('PATCH', `automations/jobs/${job.id}`, { name: 'Race' })).rejects.toMatchObject({ status: 409 });
  release();
  expect((await first).succeeded).toBe(1);
  expect(calls).toBe(1);
  expect(s.sqlite.prepare('SELECT result_json FROM assistant_job_runs').get().result_json).toBe('[{"source":"note:42"}]');
});

test('identical substantive data stays in history without duplicate notification', async () => {
  const s = setup();
  const job = await s.create();
  const now = s.due(job);
  let invocation = 0;
  s.helpers.dispatchAssistantJob = async () => ({ summary: `Report ${++invocation}`, data: { generatedAt: invocation, findings: [42] }, changeKey: { findings: [42] } });
  expect((await runScheduled(s.env, s.helpers, { now })).succeeded).toBe(1);
  const next = s.due(job, now + 86400000);
  expect((await runScheduled(s.env, s.helpers, { now: next })).unchanged).toBe(1);
  expect(s.sqlite.prepare('SELECT count(*) AS n FROM assistant_job_runs').get().n).toBe(2);
  expect(s.sqlite.prepare('SELECT count(*) AS n FROM assistant_job_notifications').get().n).toBe(1);
  const notice = s.sqlite.prepare('SELECT id FROM assistant_job_notifications').get();
  expect((await (await s.request('POST', `automations/notifications/${notice.id}/read`, {})).json()).notification.read_at).toBeTruthy();
});

test('retry backoff is bounded, preserves idempotency key, and hides provider errors', async () => {
  const s = setup();
  const job = await s.create();
  const now = s.due(job);
  const keys = [];
  s.helpers.dispatchAssistantJob = async (env, input) => { keys.push(input.idempotencyKey); throw new Error('secret access_token=abc'); };
  expect((await runScheduled(s.env, s.helpers, { now })).retrying).toBe(1);
  expect((await runScheduled(s.env, s.helpers, { now: now + 59000 })).claimed).toBe(0);
  expect((await runScheduled(s.env, s.helpers, { now: now + 60000 })).retrying).toBe(1);
  expect((await runScheduled(s.env, s.helpers, { now: now + 180000 })).failed).toBe(1);
  expect(new Set(keys).size).toBe(1);
  expect(keys).toHaveLength(3);
  const runs = await (await s.request('GET', `automations/jobs/${job.id}/runs`)).json();
  expect(runs.runs[0]).toMatchObject({ attempts: 3, status: 'failed', error_code: 'DISPATCH_FAILED' });
  expect(JSON.stringify(runs)).not.toContain('secret');
  expect((await runScheduled(s.env, s.helpers, { now: now + 240000 })).claimed).toBe(0);
});

test('missing dispatcher and malformed results fail explicitly', async () => {
  for (const mode of ['missing', 'invalid']) {
    const s = setup();
    const job = await s.create();
    const now = s.due(job);
    s.helpers.dispatchAssistantJob = mode === 'missing' ? undefined : async () => undefined;
    expect((await runScheduled(s.env, s.helpers, { now })).failed).toBe(1);
    expect(s.sqlite.prepare('SELECT status,error_code FROM assistant_job_runs').get()).toMatchObject({ status: 'failed', error_code: mode === 'missing' ? 'NOT_CONFIGURED' : 'INVALID_RESULT' });
  }
});

test('creator permissions are rechecked before scheduled execution', async () => {
  const s = setup();
  const job = await s.create();
  const now = s.due(job);
  s.roles.delete('workspace_default:user_bootstrap');
  let invoked = false;
  s.helpers.dispatchAssistantJob = async () => { invoked = true; };
  expect((await runScheduled(s.env, s.helpers, { now })).failed).toBe(1);
  expect(invoked).toBe(false);
  expect(s.sqlite.prepare('SELECT error_code FROM assistant_job_runs').get().error_code).toBe('ACCESS_REVOKED');
});

test('expired leases recover with same run ID and stop after exhausted attempts', async () => {
  const s = setup();
  const job = await s.create({ maxAttempts: 1 });
  const now = s.due(job);
  s.sqlite.prepare('UPDATE assistant_jobs SET attempts=1,lease_token=?,lease_until=? WHERE id=?').run('abandoned', new Date(now - 1).toISOString(), job.id);
  let invoked = false;
  s.helpers.dispatchAssistantJob = async () => { invoked = true; };
  expect((await runScheduled(s.env, s.helpers, { now })).failed).toBe(1);
  expect(invoked).toBe(false);
  expect(s.sqlite.prepare('SELECT error_code FROM assistant_job_runs').get().error_code).toBe('LEASE_EXHAUSTED');
});

test('stale runner cannot overwrite reclaimed lease result or create notification', async () => {
  const s = setup();
  const job = await s.create();
  const now = s.due(job);
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  let calls = 0;
  s.helpers.dispatchAssistantJob = async () => { if (++calls === 1) { await wait; return { summary: 'Stale', data: ['stale'] }; } return { summary: 'Current', data: ['current'] }; };
  const stale = runScheduled(s.env, s.helpers, { now });
  await new Promise(resolve => setTimeout(resolve, 10));
  const fresh = await runScheduled(s.env, s.helpers, { now: now + 300001 });
  expect(fresh.succeeded).toBe(1);
  release();
  expect((await stale).succeeded).toBe(0);
  expect(s.sqlite.prepare('SELECT summary FROM assistant_job_runs').get().summary).toBe('Current');
  expect(s.sqlite.prepare('SELECT message FROM assistant_job_notifications').all()).toEqual([{ message: 'Current' }]);
});

test('paused jobs stay idle; manual run queues and schedule edit cancels retry', async () => {
  const s = setup();
  const job = await s.create({ enabled: false });
  s.due(job);
  expect((await runScheduled(s.env, s.helpers)).claimed).toBe(0);
  await s.request('PATCH', `automations/jobs/${job.id}`, { enabled: true });
  expect((await s.request('POST', `automations/jobs/${job.id}/run`)).status).toBe(202);
  s.helpers.dispatchAssistantJob = async () => { throw new Error('temporary'); };
  expect((await runScheduled(s.env, s.helpers)).retrying).toBe(1);
  await s.request('PATCH', `automations/jobs/${job.id}`, { schedule: { type: 'weekly', days: [2], time: '17:00' } });
  expect(s.sqlite.prepare('SELECT status FROM assistant_job_runs').get().status).toBe('cancelled');
  expect(s.sqlite.prepare('SELECT attempts FROM assistant_jobs').get().attempts).toBe(0);
});

test('completion after fall-back cannot schedule the repeated occurrence', () => {
  expect(nextScheduledAt({ type: 'daily', time: '01:59' }, 'America/New_York', Date.parse('2026-11-01T06:00:00Z'), Date.parse('2026-11-01T05:59:00Z'))).toBe('2026-11-02T06:59:00.000Z');
});

test('non-Error dispatcher rejection is persisted as a retry', async () => {
  const s = setup();
  const job = await s.create();
  const now = s.due(job);
  s.helpers.dispatchAssistantJob = async () => { throw null; };
  expect((await runScheduled(s.env, s.helpers, { now })).retrying).toBe(1);
});

test('a runner delayed before history insertion cannot overwrite a reclaimed run', async () => {
  const s = setup();
  const job = await s.create();
  const now = s.due(job);
  const original = s.env.DB;
  let release;
  const delayed = new Promise(resolve => { release = resolve; });
  let inserts = 0;
  s.env.DB = { ...original, prepare(sql) {
    const statement = original.prepare(sql);
    if (!sql.startsWith('INSERT INTO assistant_job_runs')) return statement;
    return { bind(...values) {
      const bound = statement.bind(...values);
      return { ...bound, async run() { if (++inserts === 1) await delayed; return bound.run(); } };
    } };
  } };
  let calls = 0;
  s.helpers.dispatchAssistantJob = async () => { calls++; return { summary: 'New lease result', data: [42] }; };
  const old = runScheduled(s.env, s.helpers, { now });
  await new Promise(resolve => setTimeout(resolve, 10));
  expect((await runScheduled(s.env, s.helpers, { now: now + 300001 })).succeeded).toBe(1);
  release();
  expect((await old).succeeded).toBe(0);
  expect(calls).toBe(1);
  expect(s.sqlite.prepare('SELECT status,summary FROM assistant_job_runs').get()).toEqual({ status: 'succeeded', summary: 'New lease result' });
});

test('temporary failure recovers under the original idempotency key', async () => {
  const s = setup();
  const job = await s.create();
  const now = s.due(job);
  const keys = [];
  s.helpers.dispatchAssistantJob = async (env, input) => {
    keys.push(input.idempotencyKey);
    if (keys.length === 1) throw new Error('temporary');
    return { summary: 'Recovered', data: { sourceId: 'note-2' } };
  };
  expect((await runScheduled(s.env, s.helpers, { now })).retrying).toBe(1);
  expect((await runScheduled(s.env, s.helpers, { now: now + 60000 })).succeeded).toBe(1);
  expect(keys[0]).toBe(keys[1]);
  expect(s.sqlite.prepare('SELECT attempts,status FROM assistant_job_runs').get()).toEqual({ attempts: 2, status: 'succeeded' });
  expect(s.sqlite.prepare('SELECT count(*) AS n FROM assistant_job_notifications').get().n).toBe(1);
});
