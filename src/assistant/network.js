const MAX_ROWS = 500;
const FIELDS = new Set(['name', 'title', 'company', 'location', 'headline', 'website', 'industry']);
const READ_ROLES = ['owner', 'admin', 'member', 'viewer'];
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const clean = (value, limit = 1000) => String(value ?? '').trim().slice(0, limit);
const result = (value, status = 200) => Response.json(value, { status });
const rows = async (env, sql, ...args) => (await env.DB.prepare(sql).bind(...args).all()).results;
const first = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();
const scope = (workspaceId, userId) => [workspaceId, userId];

function httpsUrl(value, linkedIn = false) {
  let url;
  try { url = new URL(value); } catch { fail(400, 'A valid HTTPS source URL is required'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') || url.hostname === 'localhost' || /^(?:\d+\.){3}\d+$/.test(url.hostname) || url.hostname.includes(':')) fail(400, 'A public HTTPS source URL is required');
  if (linkedIn && (!['linkedin.com', 'www.linkedin.com'].includes(url.hostname) || !/^\/in\/[^/]+\/?$/.test(url.pathname))) fail(400, 'Capture requires a LinkedIn profile URL');
  url.hash = '';
  url.search = '';
  if (linkedIn) { url.hostname = 'www.linkedin.com'; url.pathname = url.pathname.replace(/\/$/, ''); }
  return url.toString();
}

function parseCsv(content) {
  const records = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') {
      if (quoted && content[i + 1] === '"') { field += '"'; i++; }
      else if (quoted || !field) quoted = !quoted;
      else fail(400, 'Malformed CSV quote');
    } else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      row.push(field); if (row.some(v => v.trim())) records.push(row);
      row = []; field = ''; if (c === '\r' && content[i + 1] === '\n') i++;
    } else field += c;
  }
  if (quoted) fail(400, 'Unclosed CSV quote');
  row.push(field); if (row.some(v => v.trim())) records.push(row);
  return records;
}

const aliases = {
  name: ['name', 'full name', 'fullname'], first_name: ['first name', 'firstname', 'first_name'],
  last_name: ['last name', 'lastname', 'last_name'], email: ['email', 'email address', 'emailaddress'],
  linkedin_url: ['url', 'linkedin url', 'linkedin_url', 'profile url', 'profileurl'],
  company: ['company', 'company name'], title: ['position', 'title', 'job title'], connected_at: ['connected on', 'connected_at', 'connectedon'],
};
const headerKey = value => clean(value).replace(/^\uFEFF/, '').toLowerCase();

function sourceRows(input) {
  if (!input || !['csv', 'json'].includes(input.format)) fail(400, 'format must be csv or json');
  const serialized = typeof input.content === 'string' ? input.content : JSON.stringify(input.content);
  if (!serialized || new TextEncoder().encode(serialized).length > 1_000_000) fail(400, 'Import must be under 1 MB');
  if (input.mapping && (typeof input.mapping !== 'object' || Array.isArray(input.mapping) || Object.entries(input.mapping).some(([k, v]) => !Object.hasOwn(aliases, k) || typeof v !== 'string'))) fail(400, 'Invalid mapping');
  let data;
  if (input.format === 'csv') {
    const records = parseCsv(serialized.replace(/^\uFEFF/, ''));
    const explicitColumns = Object.values(input.mapping || {});
    const header = records.findIndex(row => explicitColumns.length
      ? explicitColumns.every(key => row.includes(key))
      : row.some(v => [...aliases.name, ...aliases.first_name].includes(headerKey(v))) && row.length > 1);
    if (header < 0) fail(400, 'No CSV header found; provide column mappings');
    const keys = records[header].map(v => v.trim());
    if (new Set(keys).size !== keys.length) fail(400, 'Duplicate CSV columns');
    data = records.slice(header + 1).map(row => {
      if (row.length !== keys.length) fail(400, 'CSV row has wrong number of columns');
      return Object.fromEntries(keys.map((key, i) => [key, row[i]]));
    });
  } else {
    try { data = typeof input.content === 'string' ? JSON.parse(input.content) : input.content; } catch { fail(400, 'Invalid JSON'); }
    if (!Array.isArray(data)) fail(400, 'JSON content must be an array');
  }
  if (!data.length || data.length > MAX_ROWS) fail(400, 'Provide 1–500 import rows');
  return data.map(raw => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail(400, 'Each import row must be an object');
    const values = {};
    for (const [field, names] of Object.entries(aliases)) {
      const key = input.mapping?.[field] ?? Object.keys(raw).find(k => names.includes(headerKey(k)));
      if (key && raw[key] != null && !['string', 'number'].includes(typeof raw[key])) fail(400, 'Import values must be text');
      values[field] = key ? clean(raw[key]) : '';
    }
    values.name ||= `${values.first_name} ${values.last_name}`.trim();
    delete values.first_name; delete values.last_name;
    if (!values.name) fail(400, 'Each row needs a name');
    values.email = values.email.toLowerCase();
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) fail(400, 'Invalid email');
    if (values.linkedin_url) values.linkedin_url = httpsUrl(values.linkedin_url, true);
    return values;
  });
}

async function digest(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(v => v.toString(16).padStart(2, '0')).join('');
}

export async function previewImport(env, workspaceId, input) {
  const normalized = sourceRows(input);
  const contacts = await rows(env, `SELECT c.id,c.name,c.email,c.linkedin_url FROM contacts c JOIN accounts a ON a.id=c.account_id
    WHERE a.workspace_id=? AND (lower(c.email) IN (SELECT value FROM json_each(?))
      OR rtrim(c.linkedin_url,'/') IN (SELECT value FROM json_each(?))
      OR lower(c.name) IN (SELECT value FROM json_each(?))) LIMIT 10000`, workspaceId,
  JSON.stringify(normalized.map(row => row.email).filter(Boolean)),
  JSON.stringify(normalized.map(row => row.linkedin_url).filter(Boolean)),
  JSON.stringify(normalized.map(row => row.name.toLowerCase())));
  const output = [];
  for (const row of normalized) {
    const identity = row.linkedin_url ? `url:${row.linkedin_url}` : row.email ? `email:${row.email}` : `row:${JSON.stringify(row)}`;
    const candidates = contacts.filter(contact =>
      (row.email && contact.email.toLowerCase() === row.email)
      || (row.linkedin_url && contact.linkedin_url?.replace(/\/$/, '') === row.linkedin_url)
      || contact.name.toLowerCase() === row.name.toLowerCase()).slice(0, 20).map(contact => {
      let reason = 'name_only';
      if (row.email && contact.email.toLowerCase() === row.email) reason = 'email';
      else if (row.linkedin_url && contact.linkedin_url?.replace(/\/$/, '') === row.linkedin_url) reason = 'linkedin_url';
      return { id: contact.id, name: contact.name, email: contact.email, reason };
    });
    const warnings = [];
    if (!row.email) warnings.push('No email; identity remains separate from CRM contacts.');
    if (candidates.length > 1) warnings.push('Multiple candidate contacts; review required.');
    output.push({ ...row, fingerprint: await digest(identity), candidates, warnings });
  }
  return { rows: output, count: output.length };
}

async function importRows(env, workspaceId, userId, input, source = 'linkedin_archive') {
  if (input.confirm !== true) fail(400, 'Explicit confirmation is required');
  const preview = await previewImport(env, workspaceId, input);
  const data = JSON.stringify(preview.rows.map(row => ({ ...row, id: id() })));
  const at = now();
  const statements = [env.DB.prepare(`INSERT OR IGNORE INTO assistant_network_imports
    (id,workspace_id,user_id,fingerprint,name,email,linkedin_url,company,title,connected_at,source,status,created_at)
    SELECT json_extract(value,'$.id'),?,?,json_extract(value,'$.fingerprint'),json_extract(value,'$.name'),
      NULLIF(json_extract(value,'$.email'),''),NULLIF(json_extract(value,'$.linkedin_url'),''),
      json_extract(value,'$.company'),json_extract(value,'$.title'),json_extract(value,'$.connected_at'),?,'pending',?
    FROM json_each(?)`).bind(workspaceId, userId, source, at, data)];
  if (source === 'linkedin_archive') statements.push(env.DB.prepare(`INSERT OR IGNORE INTO assistant_network_edges
    (id,workspace_id,user_id,from_node,to_node,relationship,evidence,source_url,created_at)
    SELECT lower(hex(randomblob(16))),workspace_id,user_id,'self','import:'||id,'connection',
      'User-supplied LinkedIn connections archive' || CASE WHEN connected_at<>'' THEN '; connected on '||connected_at ELSE '' END || '. Not independently verified.',
      linkedin_url,? FROM assistant_network_imports WHERE workspace_id=? AND user_id=?
      AND fingerprint IN (SELECT json_extract(value,'$.fingerprint') FROM json_each(?))`).bind(at, workspaceId, userId, data));
  const saved = await env.DB.batch(statements);
  const items = await rows(env, `SELECT * FROM assistant_network_imports WHERE workspace_id=? AND user_id=?
    AND fingerprint IN (SELECT json_extract(value,'$.fingerprint') FROM json_each(?)) ORDER BY created_at,id`, workspaceId, userId, data);
  const imported = saved[0].meta.changes;
  return { imported, duplicates: preview.count - imported, items };
}

async function entity(env, workspaceId, type, entityId) {
  if (!['contact', 'account'].includes(type) || typeof entityId !== 'string' || !entityId) fail(400, 'A contact or account identity is required');
  const item = type === 'contact'
    ? await first(env, 'SELECT c.id FROM contacts c JOIN accounts a ON a.id=c.account_id WHERE c.id=? AND a.workspace_id=?', entityId, workspaceId)
    : await first(env, 'SELECT id FROM accounts WHERE id=? AND workspace_id=?', entityId, workspaceId);
  if (!item) fail(404, 'Entity not found');
}

async function node(env, workspaceId, userId, value) {
  if (value === 'self') return value;
  if (typeof value !== 'string') fail(400, 'Invalid graph node');
  if (value.startsWith('contact:')) { await entity(env, workspaceId, 'contact', value.slice(8)); return value; }
  if (value.startsWith('import:')) {
    const item = await first(env, "SELECT * FROM assistant_network_imports WHERE id=? AND workspace_id=? AND user_id=? AND status<>'rejected'", value.slice(7), workspaceId, userId);
    if (!item) fail(404, 'Identity not found');
    if (item.contact_id) { await entity(env, workspaceId, 'contact', item.contact_id); return `contact:${item.contact_id}`; }
    return value;
  }
  fail(400, 'Invalid graph node');
}

export async function findIntroPaths(env, workspaceId, userId, options = {}) {
  const from = await node(env, workspaceId, userId, options.from || 'self');
  const to = await node(env, workspaceId, userId, options.to);
  const maxHops = Math.min(3, Math.max(1, Number(options.max_hops) || 3));
  const edges = await rows(env, 'SELECT * FROM assistant_network_edges WHERE workspace_id=? AND user_id=? ORDER BY created_at DESC LIMIT 500', ...scope(workspaceId, userId));
  const referenced = [...new Set(edges.flatMap(edge => [edge.from_node, edge.to_node]))];
  const imports = await rows(env, `SELECT id,contact_id,status FROM assistant_network_imports
    WHERE workspace_id=? AND user_id=? AND id IN (SELECT value FROM json_each(?))`,
  workspaceId, userId, JSON.stringify(referenced.filter(value => value.startsWith('import:')).map(value => value.slice(7))));
  const imported = new Map(imports.map(item => [item.id, item]));
  const contactIds = referenced.filter(value => value.startsWith('contact:')).map(value => value.slice(8));
  contactIds.push(...imports.map(item => item.contact_id).filter(Boolean));
  const contacts = new Set((await rows(env, `SELECT c.id FROM contacts c JOIN accounts a ON a.id=c.account_id
    WHERE a.workspace_id=? AND c.id IN (SELECT value FROM json_each(?))`, workspaceId, JSON.stringify(contactIds))).map(item => item.id));
  function resolve(value) {
    if (value === 'self') return value;
    if (value.startsWith('contact:')) return contacts.has(value.slice(8)) ? value : null;
    const item = imported.get(value.slice(7));
    if (!item || item.status === 'rejected') return null;
    if (!item.contact_id) return value;
    return contacts.has(item.contact_id) ? `contact:${item.contact_id}` : null;
  }
  const adjacency = new Map();
  for (const edge of edges) {
    const a = resolve(edge.from_node), b = resolve(edge.to_node);
    if (!a || !b || a === b) continue;
    for (const [start, end] of [[a, b], [b, a]]) {
      if (!adjacency.has(start)) adjacency.set(start, []);
      adjacency.get(start).push({ to: end, edge });
    }
  }
  const paths = [], queue = [{ nodes: [from], edges: [] }];
  let inspected = 0;
  while (queue.length && paths.length < 10 && inspected++ < 5000) {
    const path = queue.shift(), last = path.nodes.at(-1);
    if (last === to && path.edges.length) { paths.push(path); continue; }
    if (path.edges.length >= maxHops) continue;
    for (const next of adjacency.get(last) || []) if (!path.nodes.includes(next.to)) queue.push({ nodes: [...path.nodes, next.to], edges: [...path.edges, next.edge] });
  }
  return { paths, notice: 'Paths use user-supplied evidence and suggest whom to ask. They do not confirm willingness or permission to introduce.' };
}

function observationInput(input) {
  if (!input.values || typeof input.values !== 'object' || Array.isArray(input.values) || !Object.keys(input.values).length) fail(400, 'Observation values are required');
  const values = {};
  for (const [field, value] of Object.entries(input.values)) {
    if (!FIELDS.has(field) || (value !== null && typeof value !== 'string') || (value?.length || 0) > 1000) fail(400, 'Unsupported observation field or value');
    values[field] = value === null ? null : value.trim();
  }
  const evidence = clean(input.evidence, 2000);
  if (!evidence) fail(400, 'Observation evidence is required');
  return { values, evidence, source_url: httpsUrl(input.source_url) };
}

export async function recordObservation(env, workspaceId, userId, input) {
  await entity(env, workspaceId, input.entity_type, input.entity_id);
  const validated = observationInput(input);
  const previous = await first(env, `SELECT * FROM assistant_network_observations WHERE workspace_id=? AND user_id=? AND entity_type=? AND entity_id=? ORDER BY rowid DESC LIMIT 1`, workspaceId, userId, input.entity_type, input.entity_id);
  const before = previous ? JSON.parse(previous.values_json) : {};
  const merged = { ...before, ...validated.values };
  const changes = Object.entries(validated.values).filter(([field, value]) => Object.hasOwn(before, field) && before[field] !== value);
  const observation = { id: id(), workspace_id: workspaceId, user_id: userId, entity_type: input.entity_type, entity_id: input.entity_id, values_json: JSON.stringify(merged), source_url: validated.source_url, evidence: validated.evidence, created_at: now() };
  const alerts = changes.map(([field, value]) => ({ id: id(), workspace_id: workspaceId, user_id: userId, observation_id: observation.id, entity_type: input.entity_type, entity_id: input.entity_id, field, before_value: before[field], after_value: value, evidence: validated.evidence, source_url: validated.source_url, acknowledged_at: null, created_at: observation.created_at }));
  const writes = [env.DB.prepare(`INSERT INTO assistant_network_observations
    (id,workspace_id,user_id,entity_type,entity_id,values_json,source_url,evidence,created_at)
    SELECT ?,?,?,?,?,?,?,?,? WHERE COALESCE((SELECT id FROM assistant_network_observations
      WHERE workspace_id=? AND user_id=? AND entity_type=? AND entity_id=? ORDER BY rowid DESC LIMIT 1),'')=?`)
    .bind(...Object.values(observation), workspaceId, userId, input.entity_type, input.entity_id, previous?.id || '')];
  for (const alert of alerts) writes.push(env.DB.prepare(`INSERT INTO assistant_network_alerts
    (id,workspace_id,user_id,observation_id,entity_type,entity_id,field,before_value,after_value,evidence,source_url,acknowledged_at,created_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM assistant_network_observations WHERE id=?)`)
    .bind(...Object.values(alert), observation.id));
  const saved = await env.DB.batch(writes);
  if (!saved[0].meta.changes) fail(409, 'Observation changed concurrently; retry with the latest snapshot');
  return { observation, alerts };
}

async function readBody(request) {
  if (Number(request.headers.get('content-length') || 0) > 1_100_000) fail(413, 'Request too large');
  const text = await request.text();
  if (new TextEncoder().encode(text).length > 1_100_000) fail(413, 'Request too large');
  let input;
  try { input = JSON.parse(text); } catch { fail(400, 'Invalid JSON body'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'JSON object required');
  return input;
}

export async function handleRequest(request, env, context) {
  const { path, workspaceId, auth, helpers } = context;
  if (path !== 'network' && !path.startsWith('network/')) return null;
  try {
    const userId = auth?.user?.id;
    if (!userId) fail(401, 'Authentication required');
    if (auth.kind === 'workspace_token' && auth.workspaceId !== workspaceId) fail(403, 'Token workspace mismatch');
    await helpers.requireWorkspaceRole(env, userId, workspaceId, READ_ROLES);
    if (!['GET', 'HEAD'].includes(request.method)) await helpers.requireWorkspaceWrite(env, auth, workspaceId);
    const route = path.slice('network'.length) || '/';
    const method = request.method;
    const input = ['POST', 'PUT', 'PATCH'].includes(method) ? await readBody(request) : {};
    if (route === '/imports/preview' && method === 'POST') return result(await previewImport(env, workspaceId, input));
    if (route === '/imports' && method === 'POST') return result(await importRows(env, workspaceId, userId, input));
    if (route === '/imports' && method === 'GET') return result({ items: await rows(env, 'SELECT * FROM assistant_network_imports WHERE workspace_id=? AND user_id=? ORDER BY created_at DESC LIMIT 500', workspaceId, userId) });
    const match = route.match(/^\/imports\/([^/]+)\/match$/);
    if (match && method === 'POST') {
      if (input.confirm !== true) fail(400, 'Explicit confirmation is required');
      const item = await first(env, 'SELECT * FROM assistant_network_imports WHERE id=? AND workspace_id=? AND user_id=?', match[1], workspaceId, userId);
      if (!item) fail(404, 'Identity not found');
      if (input.reject !== true && input.contact_id !== null) await entity(env, workspaceId, 'contact', input.contact_id);
      const contactId = input.reject === true ? null : input.contact_id;
      const status = input.reject === true ? 'rejected' : contactId ? 'matched' : 'pending';
      await run(env, 'UPDATE assistant_network_imports SET contact_id=?,status=? WHERE id=? AND workspace_id=? AND user_id=?', contactId, status, item.id, workspaceId, userId);
      return result({ item: { ...item, contact_id: contactId, status } });
    }
    if (route === '/capture' && method === 'POST') {
      const url = httpsUrl(input.url, true);
      return result(await importRows(env, workspaceId, userId, { confirm: input.confirm, format: 'json', content: [{ name: input.name, email: input.email, linkedin_url: url, company: input.company, title: input.title }] }, 'browser_capture'));
    }
    if (route === '/edges' && method === 'GET') return result({ items: await rows(env, 'SELECT * FROM assistant_network_edges WHERE workspace_id=? AND user_id=? ORDER BY created_at DESC LIMIT 500', workspaceId, userId) });
    if (route === '/edges' && method === 'POST') {
      if (input.confirm !== true) fail(400, 'Explicit confirmation is required');
      const from = await node(env, workspaceId, userId, input.from_node), to = await node(env, workspaceId, userId, input.to_node);
      if (from === to) fail(400, 'Relationship endpoints must differ');
      if (!['connection', 'colleague', 'referral', 'introduced'].includes(input.relationship)) fail(400, 'Invalid relationship');
      const evidence = clean(input.evidence, 2000);
      if (!evidence) fail(400, 'Relationship evidence is required');
      const sourceUrl = input.source_url ? httpsUrl(input.source_url) : null;
      await run(env, `INSERT INTO assistant_network_edges (id,workspace_id,user_id,from_node,to_node,relationship,evidence,source_url,created_at) VALUES (?,?,?,?,?,?,?,?,?)
        ON CONFLICT(workspace_id,user_id,from_node,to_node,relationship) DO UPDATE SET evidence=excluded.evidence,source_url=excluded.source_url`, id(), workspaceId, userId, from, to, input.relationship, evidence, sourceUrl, now());
      return result({ item: await first(env, 'SELECT * FROM assistant_network_edges WHERE workspace_id=? AND user_id=? AND from_node=? AND to_node=? AND relationship=?', workspaceId, userId, from, to, input.relationship) });
    }
    if (route === '/paths' && method === 'GET') return result(await findIntroPaths(env, workspaceId, userId, Object.fromEntries(new URL(request.url).searchParams)));
    if (route === '/observations' && method === 'POST') {
      if (input.confirm !== true) fail(400, 'Explicit confirmation is required');
      return result(await recordObservation(env, workspaceId, userId, input));
    }
    if (route === '/observations' && method === 'GET') {
      const query = new URL(request.url).searchParams;
      const type = query.get('entity_type'), entityId = query.get('entity_id');
      if (type || entityId) await entity(env, workspaceId, type, entityId);
      return result({ items: await rows(env, `SELECT * FROM assistant_network_observations WHERE workspace_id=? AND user_id=?${type ? ' AND entity_type=? AND entity_id=?' : ''} ORDER BY rowid DESC LIMIT 100`, workspaceId, userId, ...(type ? [type, entityId] : [])) });
    }
    if (route === '/alerts' && method === 'GET') return result({ items: await rows(env, 'SELECT * FROM assistant_network_alerts WHERE workspace_id=? AND user_id=? ORDER BY rowid DESC LIMIT 100', workspaceId, userId) });
    const acknowledge = route.match(/^\/alerts\/([^/]+)\/acknowledge$/);
    if (acknowledge && method === 'POST') {
      const updated = await run(env, 'UPDATE assistant_network_alerts SET acknowledged_at=? WHERE id=? AND workspace_id=? AND user_id=?', now(), acknowledge[1], workspaceId, userId);
      if (!updated.meta.changes) fail(404, 'Alert not found');
      return result({ acknowledged: true });
    }
    if (route === '/monitors' && method === 'GET') return result({ configured: Boolean(env.NETWORK_OBSERVER?.fetch), items: await rows(env, 'SELECT * FROM assistant_network_monitors WHERE workspace_id=? AND user_id=? ORDER BY next_run_at LIMIT 100', workspaceId, userId) });
    if (route === '/monitors' && method === 'POST') {
      if (input.confirm !== true) fail(400, 'Explicit confirmation is required');
      if (!env.NETWORK_OBSERVER?.fetch) fail(409, 'Network observation provider is not configured');
      await entity(env, workspaceId, input.entity_type, input.entity_id);
      const url = httpsUrl(input.url), interval = input.interval_hours ?? 24;
      if (!Number.isInteger(interval) || interval < 24 || interval > 8760) fail(400, 'interval_hours must be 24–8760');
      await run(env, `INSERT INTO assistant_network_monitors (id,workspace_id,user_id,entity_type,entity_id,url,interval_hours,next_run_at) VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(workspace_id,user_id,entity_type,entity_id) DO UPDATE SET url=excluded.url,interval_hours=excluded.interval_hours,next_run_at=excluded.next_run_at,last_status='pending'`, id(), workspaceId, userId, input.entity_type, input.entity_id, url, interval, now());
      return result({ item: await first(env, 'SELECT * FROM assistant_network_monitors WHERE workspace_id=? AND user_id=? AND entity_type=? AND entity_id=?', workspaceId, userId, input.entity_type, input.entity_id) });
    }
    const removal = route.match(/^\/(edges|monitors)\/([^/]+)$/);
    if (removal && method === 'DELETE') {
      const table = removal[1] === 'edges' ? 'assistant_network_edges' : 'assistant_network_monitors';
      const removed = await run(env, `DELETE FROM ${table} WHERE id=? AND workspace_id=? AND user_id=?`, removal[2], workspaceId, userId);
      if (!removed.meta.changes) fail(404, 'Item not found');
      return result({ deleted: true });
    }
    return null;
  } catch (error) {
    if (error.status) return result({ error: error.message }, error.status);
    throw error;
  }
}

export async function runScheduled(env, helpers) {
  if (!env.NETWORK_OBSERVER?.fetch) return { configured: false, checked: 0, failed: 0 };
  const due = await rows(env, 'SELECT * FROM assistant_network_monitors WHERE next_run_at<=? AND (lease_until IS NULL OR lease_until<?) ORDER BY next_run_at LIMIT 10', now(), now());
  let checked = 0, failed = 0;
  for (const monitor of due) {
    const lease = new Date(Date.now() + 120_000).toISOString();
    const claimed = await run(env, 'UPDATE assistant_network_monitors SET lease_until=? WHERE id=? AND next_run_at<=? AND (lease_until IS NULL OR lease_until<?)', lease, monitor.id, now(), now());
    if (!claimed.meta.changes) continue;
    let status = 'ok', next = new Date(Date.now() + monitor.interval_hours * 3600_000).toISOString();
    try {
      const user = await first(env, "SELECT id FROM users WHERE id=? AND status='active'", monitor.user_id);
      if (!user) fail(403, 'User is inactive');
      await helpers.requireWorkspaceRole(env, monitor.user_id, monitor.workspace_id, ['owner', 'admin', 'member']);
      await entity(env, monitor.workspace_id, monitor.entity_type, monitor.entity_id);
      const request = new Request('https://network-observer.internal/observe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entity_type: monitor.entity_type, entity_id: monitor.entity_id, url: monitor.url }), signal: AbortSignal.timeout(15_000) });
      const response = await env.NETWORK_OBSERVER.fetch(request);
      if (!response.ok) throw new Error('Provider failed');
      const responseText = await response.text();
      if (responseText.length > 50_000) throw new Error('Provider response too large');
      const data = JSON.parse(responseText);
      await recordObservation(env, monitor.workspace_id, monitor.user_id, { ...data, entity_type: monitor.entity_type, entity_id: monitor.entity_id });
      checked++;
    } catch (error) {
      status = [403, 404].includes(error.status) ? 'access_unavailable' : 'provider_error';
      next = new Date(Date.now() + (status === 'access_unavailable' ? 24 : 1) * 3600_000).toISOString();
      failed++;
    }
    await run(env, 'UPDATE assistant_network_monitors SET last_status=?,last_checked_at=?,next_run_at=?,lease_until=NULL WHERE id=? AND lease_until=?', status, now(), next, monitor.id, lease);
  }
  return { configured: true, checked, failed };
}
