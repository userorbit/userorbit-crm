import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { handleRequest, previewImport, runScheduled } from '../src/assistant/network.js';

let sqlite, env;
const error = (status, message) => Object.assign(new Error(message), { status });
const helpers = {
  json: (body, status = 200) => Response.json(body, { status }),
  readJson: request => request.json(),
  httpError: error,
  async requireWorkspaceRole(env, userId, workspaceId, roles) {
    const row = await env.DB.prepare('SELECT role FROM workspace_members WHERE user_id=? AND workspace_id=?').bind(userId, workspaceId).first();
    if (!row || !roles.includes(row.role)) throw error(403, 'Forbidden');
    return row;
  },
  async requireWorkspaceWrite(env, auth, workspaceId) { return helpers.requireWorkspaceRole(env, auth.user.id, workspaceId, ['owner', 'admin', 'member']); },
};
beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  for (const file of readdirSync(new URL('../migrations/', import.meta.url)).filter(f => f.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  const statement = (sql, values = []) => ({
    bind: (...args) => statement(sql, args),
    async first(column) { const row = sqlite.prepare(sql).get(...values); return column ? row?.[column] ?? null : row; },
    async all() { return { results: sqlite.prepare(sql).all(...values) }; },
    run() { const result = sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: result.changes } }; },
  });
  env = { DB: { prepare: sql => statement(sql), async batch(statements) { sqlite.exec('BEGIN'); try { const results = []; for (const s of statements) results.push(s.run()); sqlite.exec('COMMIT'); return results; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } } } };
  sqlite.exec(`INSERT INTO workspaces(id,team_id,name,slug,created_at,updated_at) VALUES('other','team_default','Other','other','2026','2026');
    INSERT INTO users(id,email,name,created_at,updated_at) VALUES('u','u@example.test','User','2026','2026'),('v','v@example.test','Viewer','2026','2026'),('peer','peer@example.test','Peer','2026','2026');
    INSERT INTO workspace_members(id,workspace_id,user_id,role,created_at,updated_at) VALUES('mu','workspace_default','u','member','2026','2026'),('mv','workspace_default','v','viewer','2026','2026'),('mp','workspace_default','peer','member','2026','2026');
    INSERT INTO accounts(id,workspace_id,name,created_at,updated_at) VALUES('a','workspace_default','Example','2026','2026'),('foreign-a','other','Foreign','2026','2026');
    INSERT INTO contacts(id,account_id,name,email,linkedin_url,created_at,updated_at) VALUES('c','a','Alice Smith','alice@example.test','https://www.linkedin.com/in/alice','2026','2026'),('target','a','Bob Jones','bob@example.test',NULL,'2026','2026'),('foreign-c','foreign-a','Alice Smith','foreign@example.test',NULL,'2026','2026');`);
});
afterEach(() => sqlite.close());
async function request(path, body, options = {}) {
  const method = options.method || (body === undefined ? 'GET' : 'POST');
  const req = new Request(`https://crm.example/api/assistant/network${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }) });
  try {
    const response = await handleRequest(req, env, { path: `network${path.split('?')[0]}`, workspaceId: options.workspaceId || 'workspace_default', auth: options.auth === null ? null : options.auth || { user: { id: options.userId || 'u' } }, helpers });
    return { status: response.status, body: await response.json() };
  } catch (e) { if (!e.status) throw e; return { status: e.status, body: { error: e.message } }; }
}
const archive = [{ 'First Name': 'Alice', 'Last Name': 'Smith', 'Email Address': 'alice@example.test', URL: 'https://www.linkedin.com/in/alice/', Company: 'Example', Position: 'Engineer' }];
const observation = values => ({ confirm: true, entity_type: 'contact', entity_id: 'c', values, source_url: 'https://www.linkedin.com/in/alice', evidence: 'User reviewed profile on October 21' });

describe('network archive and review', () => {
  test('parses LinkedIn preamble, BOM, escaped quotes and multiline CSV without writing CRM', async () => {
    const csv = '\uFEFFNotes:\nExported connections\n\nFirst Name,Last Name,Email Address,URL,Company,Position\nAlice,Smith,alice@example.test,https://www.linkedin.com/in/alice,"Example, Inc","Lead ""Platform""\nEngineer"';
    const result = await previewImport(env, 'workspace_default', { format: 'csv', content: csv });
    expect(result.count).toBe(1);
    expect(result.rows[0].company).toBe('Example, Inc');
    expect(result.rows[0].title).toBe('Lead "Platform"\nEngineer');
    expect(result.rows[0].candidates.map(c => c.id)).toEqual(['c']);
    expect(sqlite.query('SELECT COUNT(*) AS n FROM assistant_network_imports').get().n).toBe(0);
  });
  test('honors explicit mapping and leaves ambiguous names for review', async () => {
    const result = await previewImport(env, 'workspace_default', { format: 'json', content: [{ Person: 'Alice Smith', Employer: 'Example' }], mapping: { name: 'Person', company: 'Employer' } });
    expect(result.rows[0].name).toBe('Alice Smith');
    expect(result.rows[0].company).toBe('Example');
    expect(result.rows[0].email).toBeFalsy();
    expect(result.rows[0].candidates.every(c => c.id !== 'foreign-c')).toBe(true);
  });
  test('imports idempotently per user, retains no-email identities and never creates contacts', async () => {
    const input = { format: 'json', content: [...archive, { 'First Name': 'No', 'Last Name': 'Email', URL: 'https://www.linkedin.com/in/noemail' }], confirm: true };
    const first = await request('/imports', input);
    expect(first.status).toBeLessThan(300);
    expect(first.body.imported).toBe(2);
    const second = await request('/imports', input);
    expect(second.body.imported).toBe(0);
    expect(second.body.duplicates).toBe(2);
    expect(sqlite.query('SELECT COUNT(*) AS n FROM contacts').get().n).toBe(3);
    expect((await request('/imports', undefined, { userId: 'peer' })).body.items).toEqual([]);
    expect((await request('/imports', input, { userId: 'peer' })).body.imported).toBe(2);
  });
  test('imports the full 500-row bound atomically and deduplicates within a batch', async () => {
    const content = Array.from({ length: 500 }, (_, index) => ({ name: `Person ${index}`, linkedin_url: `https://www.linkedin.com/in/person-${index}` }));
    const imported = await request('/imports', { format: 'json', content, confirm: true });
    expect(imported.body.imported).toBe(500);
    expect(sqlite.query('SELECT COUNT(*) AS n FROM assistant_network_edges').get().n).toBe(500);
    const duplicate = await request('/imports', { format: 'json', content: [content[0], content[0]], confirm: true });
    expect(duplicate.body.duplicates).toBe(2);
    expect(duplicate.body.items).toHaveLength(1);
  });
  test('capture requires explicit intent and a real HTTPS LinkedIn profile URL', async () => {
    expect((await request('/capture', { name: 'Alice', url: 'https://www.linkedin.com/in/alice' })).status).toBe(400);
    for (const url of ['http://www.linkedin.com/in/alice', 'https://linkedin.com.evil.test/in/alice', 'https://www.linkedin.com/feed', 'javascript:alert(1)']) expect((await request('/capture', { confirm: true, name: 'Alice', url })).status).toBe(400);
    expect((await request('/capture', { confirm: true, name: 'Alice', url: 'https://www.linkedin.com/in/alice' })).status).toBeLessThan(300);
  });
  test('normalizes profile URL identity and does not imply a captured profile is a connection', async () => {
    expect((await request('/capture', { confirm: true, name: 'Alice', url: 'https://linkedin.com/in/alice/?trk=feed#profile' })).body.imported).toBe(1);
    expect((await request('/capture', { confirm: true, name: 'Alice', url: 'https://www.linkedin.com/in/alice' })).body.duplicates).toBe(1);
    expect((await request('/edges')).body.items).toEqual([]);
  });
  test('explicit matching denies foreign contacts and keeps existing contact fields unchanged', async () => {
    const initial = sqlite.query('SELECT * FROM contacts WHERE id=?').get('c');
    const imported = await request('/imports', { confirm: true, format: 'json', content: archive });
    const id = imported.body.items[0].id;
    expect((await request(`/imports/${id}/match`, { confirm: true, contact_id: 'foreign-c' })).status).toBeGreaterThanOrEqual(400);
    expect((await request(`/imports/${id}/match`, { confirm: true, contact_id: 'c' })).status).toBeLessThan(300);
    expect(sqlite.query('SELECT * FROM contacts WHERE id=?').get('c')).toEqual(initial);
    expect((await request(`/imports/${id}/match`, { confirm: true, contact_id: 'c' }, { userId: 'peer' })).status).toBeGreaterThanOrEqual(400);
  });
  test('rejects malformed or oversized archives and tokens crossing their bound workspace', async () => {
    expect((await request('/imports/preview', { format: 'json', content: '{invalid' })).status).toBe(400);
    expect((await request('/imports/preview', { format: 'json', content: Array.from({ length: 501 }, (_, i) => ({ name: `Person ${i}` })) })).status).toBeGreaterThanOrEqual(400);
    expect((await request('/imports', undefined, { auth: { kind: 'workspace_token', workspaceId: 'other', user: { id: 'u' } } })).status).toBe(403);
  });
  test('denies anonymous, nonmember and viewer writes', async () => {
    expect((await request('/imports', undefined, { auth: null })).status).toBe(401);
    expect((await request('/imports', undefined, { workspaceId: 'other' })).status).toBe(403);
    expect((await request('/imports', { confirm: true, format: 'json', content: archive }, { userId: 'v' })).status).toBe(403);
    expect((await request('/imports', undefined, { userId: 'v' })).status).toBe(200);
  });
});

describe('evidenced introductions and observations', () => {
  test('matched archive connections form evidenced paths, excluded after rejection', async () => {
    const imported = await request('/imports', { confirm: true, format: 'json', content: archive });
    const id = imported.body.items[0].id;
    await request(`/imports/${id}/match`, { confirm: true, contact_id: 'c' });
    expect((await request('/edges', { confirm: true, from_node: 'contact:c', to_node: 'contact:target', relationship: 'colleague', evidence: 'Alice confirmed they worked together', source_url: 'https://example.test/team' })).status).toBeLessThan(300);
    const result = await request('/paths?to=contact:target');
    expect(result.body.paths).toHaveLength(1);
    expect(result.body.paths[0].nodes).toEqual(['self', 'contact:c', 'contact:target']);
    expect(result.body.paths[0].edges.every(edge => edge.evidence.length > 0)).toBe(true);
    expect((await request('/paths?to=contact:target', undefined, { userId: 'peer' })).body.paths).toEqual([]);
    await request(`/imports/${id}/match`, { confirm: true, reject: true });
    expect((await request('/paths?to=contact:target')).body.paths).toEqual([]);
  });
  test('edges need evidence and reject cross-workspace nodes', async () => {
    expect((await request('/edges', { confirm: true, from_node: 'self', to_node: 'contact:c', relationship: 'connection' })).status).toBe(400);
    expect((await request('/edges', { confirm: true, from_node: 'self', to_node: 'contact:foreign-c', relationship: 'connection', evidence: 'Known connection' })).status).toBeGreaterThanOrEqual(400);
  });
  test('partial snapshots establish baselines, then alert exact changes only once', async () => {
    expect((await request('/observations', observation({ title: 'Engineer', company: 'Example' }))).body.alerts).toEqual([]);
    expect((await request('/observations', observation({ company: 'Example' }))).body.alerts).toEqual([]);
    const changed = await request('/observations', observation({ title: 'Director' }));
    expect(changed.body.alerts).toHaveLength(1);
    expect(changed.body.alerts[0]).toMatchObject({ field: 'title', before_value: 'Engineer', after_value: 'Director' });
    expect((await request('/observations', observation({ title: 'Director' }))).body.alerts).toEqual([]);
    expect((await request('/alerts')).body.items).toHaveLength(1);
    expect((await request('/alerts', undefined, { userId: 'peer' })).body.items).toEqual([]);
    expect(sqlite.query('SELECT title FROM contacts WHERE id=?').get('c').title).toBeNull();
  });
  test('concurrent observations cannot duplicate change alerts', async () => {
    await request('/observations', observation({ title: 'Engineer' }));
    const responses = await Promise.all([request('/observations', observation({ title: 'Director' })), request('/observations', observation({ title: 'Director' }))]);
    expect(responses.some(r => r.status === 200)).toBe(true);
    expect(responses.every(r => r.status === 200 || r.status === 409)).toBe(true);
    expect((await request('/alerts')).body.items).toHaveLength(1);
  });
  test('explicit null clears a field with an alert; acknowledgement is private', async () => {
    await request('/observations', observation({ title: 'Engineer' }));
    const changed = await request('/observations', observation({ title: null }));
    expect(changed.body.alerts[0]).toMatchObject({ before_value: 'Engineer', after_value: null });
    const id = changed.body.alerts[0].id;
    expect((await request(`/alerts/${id}/acknowledge`, {}, { userId: 'peer' })).status).toBe(404);
    expect((await request(`/alerts/${id}/acknowledge`, {})).status).toBe(200);
    expect((await request('/alerts')).body.items[0].acknowledged_at).toBeTruthy();
  });
  test('observations reject unsupported fields and foreign entities', async () => {
    expect((await request('/observations', observation({ email: 'overwrite@example.test' }))).status).toBe(400);
    expect((await request('/observations', { ...observation({ title: 'CEO' }), entity_id: 'foreign-c' })).status).toBeGreaterThanOrEqual(400);
  });
});

describe('optional real observation provider', () => {
  const monitor = { confirm: true, entity_type: 'contact', entity_id: 'c', url: 'https://www.linkedin.com/in/alice', interval_hours: 24 };
  test('reports unconfigured and cannot enable pretend monitoring', async () => {
    expect((await request('/monitors')).body.configured).toBe(false);
    expect((await request('/monitors', monitor)).status).toBeGreaterThanOrEqual(400);
    await runScheduled(env, helpers);
    expect(sqlite.query('SELECT COUNT(*) AS n FROM assistant_network_observations').get().n).toBe(0);
  });
  test('concurrent scheduler runs claim a due monitor only once', async () => {
    let calls = 0;
    env.NETWORK_OBSERVER = { async fetch() { calls++; await new Promise(resolve => setTimeout(resolve, 5)); return Response.json({ values: { title: 'Engineer' }, source_url: monitor.url, evidence: 'Profile response' }); } };
    await request('/monitors', monitor);
    await Promise.all([runScheduled(env, helpers), runScheduled(env, helpers)]);
    expect(calls).toBe(1);
    expect(sqlite.query('SELECT COUNT(*) AS n FROM assistant_network_observations').get().n).toBe(1);
  });
  test('active leases and revoked membership prevent provider access', async () => {
    let calls = 0;
    env.NETWORK_OBSERVER = { async fetch() { calls++; return Response.json({ values: { title: 'Engineer' }, source_url: monitor.url, evidence: 'Profile response' }); } };
    await request('/monitors', monitor);
    sqlite.exec("UPDATE assistant_network_monitors SET next_run_at='2000-01-01T00:00:00.000Z',lease_until='2999-01-01T00:00:00.000Z'");
    await runScheduled(env, helpers);
    expect(calls).toBe(0);
    sqlite.exec("UPDATE assistant_network_monitors SET lease_until=NULL; DELETE FROM workspace_members WHERE user_id='u'");
    await runScheduled(env, helpers);
    expect(calls).toBe(0);
    expect(sqlite.query('SELECT last_status FROM assistant_network_monitors').get().last_status).toBe('access_unavailable');
  });
  test('provider cannot inject another entity or create evidence-free observations', async () => {
    env.NETWORK_OBSERVER = { async fetch() { return Response.json({ values: { title: 'Engineer' }, entity_id: 'foreign-c', source_url: monitor.url }); } };
    await request('/monitors', monitor);
    await runScheduled(env, helpers);
    expect(sqlite.query('SELECT COUNT(*) AS n FROM assistant_network_observations').get().n).toBe(0);
    env.NETWORK_OBSERVER.fetch = async () => Response.json({ values: { title: 'Engineer' }, entity_id: 'foreign-c', source_url: monitor.url, evidence: 'Profile response' });
    sqlite.exec("UPDATE assistant_network_monitors SET next_run_at='2000-01-01T00:00:00.000Z'");
    await runScheduled(env, helpers);
    expect(sqlite.query('SELECT entity_id FROM assistant_network_observations').get().entity_id).toBe('c');
  });
  test('disabled users cannot trigger scheduled provider calls despite membership', async () => {
    let calls = 0;
    env.NETWORK_OBSERVER = { fetch: async () => { calls++; return Response.json({}); } };
    expect((await request('/monitors', { confirm: true, entity_type: 'contact', entity_id: 'c', url: 'https://www.linkedin.com/in/alice' })).status).toBe(200);
    sqlite.exec("UPDATE users SET status='disabled' WHERE id='u'");
    const outcome = await runScheduled(env, helpers);
    expect(calls).toBe(0);
    expect(outcome.failed).toBe(1);
    expect(sqlite.query('SELECT last_status FROM assistant_network_monitors').get().last_status).toBe('access_unavailable');
  });
  test('provider failure creates no fabricated data and can retry successfully', async () => {
    let calls = 0;
    env.NETWORK_OBSERVER = { async fetch(req) { calls++; expect(await req.json()).toMatchObject({ entity_type: 'contact', entity_id: 'c', url: monitor.url }); return new Response('upstream secret failure', { status: 503 }); } };
    expect((await request('/monitors', monitor)).status).toBeLessThan(300);
    sqlite.exec("UPDATE assistant_network_monitors SET next_run_at='2000-01-01T00:00:00.000Z'");
    await runScheduled(env, helpers);
    expect(calls).toBe(1);
    expect(sqlite.query('SELECT COUNT(*) AS n FROM assistant_network_observations').get().n).toBe(0);
    expect(JSON.stringify((await request('/monitors')).body)).not.toContain('upstream secret');
    env.NETWORK_OBSERVER.fetch = async () => Response.json({ values: { title: 'Engineer' }, source_url: monitor.url, evidence: 'Provider profile response profile-123' });
    sqlite.exec("UPDATE assistant_network_monitors SET next_run_at='2000-01-01T00:00:00.000Z',lease_until=NULL");
    await runScheduled(env, helpers);
    expect(sqlite.query('SELECT COUNT(*) AS n FROM assistant_network_observations').get().n).toBe(1);
    await runScheduled(env, helpers);
    expect(sqlite.query('SELECT COUNT(*) AS n FROM assistant_network_observations').get().n).toBe(1);
  });
});
