const PRIVATE_HEADERS = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
const RECORD_COLUMNS = "r.id, r.source_table, r.source_id, r.workspace_id, r.title, r.created_at, r.updated_at";

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { ...PRIVATE_HEADERS, "content-type": "application/json; charset=utf-8" } });
}

export async function handleMigrationHistory(request, env, helpers) {
  const url = new URL(request.url);
  if (request.method !== "GET") return json({ error: "Read-only history" }, 405);
  if (url.pathname === "/migration-history") {
    return new Response(migrationHistoryHtml(), { headers: { ...PRIVATE_HEADERS, "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" } });
  }
  const auth = await helpers.requireAuth(request, env);
  if (auth.kind !== "session" || auth.user?.status !== "active") return json({ error: "Sign in with your user account to view migrated history" }, 403);
  const userId = auth.user.id;
  const prefix = "/api/migration-history";
  if (url.pathname === prefix) {
    const type = url.searchParams.get("type") || "";
    const search = (url.searchParams.get("search") || "").slice(0, 200);
    const clauses = ["a.user_id = ?"];
    const params = [userId];
    if (type) { clauses.push("r.source_table = ?"); params.push(type); }
    if (search) {
      clauses.push("(r.title LIKE ? ESCAPE '\\' OR r.source_id LIKE ? ESCAPE '\\')");
      const term = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
      params.push(term, term);
    }
    const offset = Math.max(0, Math.min(10000000, Math.floor(Number(url.searchParams.get("offset")) || 0)));
    const limit = Math.max(1, Math.min(100, Math.floor(Number(url.searchParams.get("limit")) || 50)));
    const records = await env.DB.prepare(`SELECT ${RECORD_COLUMNS} FROM legacy_records r JOIN legacy_record_access a ON a.record_id = r.id WHERE ${clauses.join(" AND ")} ORDER BY r.updated_at DESC, r.id LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
    const types = await env.DB.prepare("SELECT r.source_table AS type, COUNT(*) AS count FROM legacy_records r JOIN legacy_record_access a ON a.record_id = r.id WHERE a.user_id = ? GROUP BY r.source_table ORDER BY r.source_table").bind(userId).all();
    return json({ records: records.results, types: types.results, offset, limit, nextOffset: records.results.length === limit ? offset + limit : null });
  }
  if (url.pathname.startsWith(`${prefix}/`)) {
    let id;
    const attachment = url.pathname.endsWith("/attachment");
    const rawId = url.pathname.slice(prefix.length + 1, attachment ? -"/attachment".length : undefined);
    try { id = decodeURIComponent(rawId); } catch { return json({ error: "Not found" }, 404); }
    const record = await env.DB.prepare(`SELECT ${RECORD_COLUMNS}, r.payload_json FROM legacy_records r JOIN legacy_record_access a ON a.record_id = r.id WHERE a.user_id = ? AND r.id = ?`).bind(userId, id).first();
    if (!record) return json({ error: "Not found" }, 404);
    let payload = JSON.parse(record.payload_json);
    if (payload._chunked === true) {
      const chunks = await env.DB.prepare("SELECT data FROM legacy_record_chunks WHERE record_id = ? ORDER BY chunk_index").bind(id).all();
      payload = JSON.parse(chunks.results.map((chunk) => chunk.data).join(""));
    }
    if (attachment) {
      if (payload.attachment_download !== true) return json({ error: "Not found" }, 404);
      const chunks = await env.DB.prepare("SELECT data FROM legacy_record_blobs WHERE record_id = ? ORDER BY chunk_index").bind(id).all();
      const data = Uint8Array.from(atob(chunks.results.map((chunk) => chunk.data).join("")), (character) => character.charCodeAt(0));
      const filename = String(payload.file_name || payload.filename || payload.name || "attachment").replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 150) || "attachment";
      return new Response(data, { headers: { ...PRIVATE_HEADERS, "content-type": "application/octet-stream", "content-disposition": `attachment; filename="${filename}"` } });
    }
    delete record.payload_json;
    return json({ ...record, payload });
  }
  return json({ error: "Not found" }, 404);
}

export function migrationHistoryHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Migrated CRM history</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f6f7f9;color:#202632;font:15px system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:32px 20px}a{color:#4338ca}nav{display:flex;gap:20px}h1{font-size:28px;margin-bottom:8px}p{line-height:1.5;color:#566073}.filters{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}input,select,button{font:inherit;padding:10px 12px;border:1px solid #cbd0da;border-radius:7px;background:white}input{flex:1;min-width:200px}button{cursor:pointer}button:hover{border-color:#4338ca}.layout{display:grid;grid-template-columns:minmax(260px,1fr) minmax(300px,2fr);gap:20px}.panel{background:white;padding:18px;border:1px solid #dfe2e8;border-radius:10px;min-width:0}.record{display:block;width:100%;text-align:left;margin-bottom:8px}.record span{display:block;font-size:12px;color:#667085;margin-top:4px}#detail{overflow-wrap:anywhere}pre{white-space:pre-wrap;word-break:break-word;font:13px ui-monospace,monospace;line-height:1.6;margin:0}#status{min-height:24px}#pages{display:flex;gap:12px;margin-top:16px}@media(max-width:740px){.layout{grid-template-columns:1fr}}
  </style></head><body><main><nav><a href="/app">CRM and sign-in</a><a href="https://gtm.userorb.com" target="_blank" rel="noopener noreferrer">Original CRM</a></nav><h1>Migrated CRM history</h1><p>Browse preserved records from your previous CRM. Access follows your original permissions. These records are read-only.</p><div class="filters"><label for="type">Record type</label><select id="type"><option value="">All types</option></select><input id="search" type="search" aria-label="Search record titles" placeholder="Search titles or original record IDs"><button id="find">Search</button></div><p id="status" role="status"></p><div class="layout"><section class="panel" aria-label="Records"><div id="records"></div><div id="pages"><button id="previous">Previous</button><button id="next">Next</button></div></section><section class="panel" aria-label="Record details"><h2 id="title">Select a record</h2><div id="detail"></div></section></div></main><script>
  const $ = (id) => document.getElementById(id);
  let offset = 0, nextOffset = null;
  async function api(path, binary = false) {
    let token = ''; try { token = localStorage.getItem('crmApiToken') || ''; } catch {}
    const response = await fetch('/api/migration-history' + path, {headers:{authorization:'Bearer ' + token},cache:'no-store'});
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Sign in with your user account through the CRM link above.' : 'Could not load this record. Please try again.');
    return binary ? response.blob() : response.json();
  }
  function displayValue(value, key = '') {
    if (/^(data|bytes|content_bytes|binary|raw_bytes|password_hash|token|secret)$/i.test(key)) return '[Preserved securely; not displayed inline]';
    if (Array.isArray(value)) return value.length > 200 && value.every((item) => Number.isInteger(item) && item >= 0 && item <= 255) ? '[Binary data preserved; not displayed inline]' : value.map((item) => displayValue(item));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([field, item]) => [field, displayValue(item, field)]));
    return value;
  }
  async function show(id) {
    try {
      const record = await api('/' + encodeURIComponent(id));
      $('title').textContent = record.title || record.source_table;
      const detail = document.createElement('pre');
      detail.textContent = JSON.stringify(displayValue(record), null, 2);
      $('detail').replaceChildren(detail);
      if (record.payload.attachment_download) {
        const download = document.createElement('button'); download.textContent = 'Download original attachment';
        download.addEventListener('click', async () => {
          try {
            const blob = await api('/' + encodeURIComponent(id) + '/attachment', true);
            const objectUrl = URL.createObjectURL(blob); const link = document.createElement('a');
            link.href = objectUrl; link.download = record.payload.file_name || record.payload.filename || record.payload.name || 'attachment';
            link.click(); setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
          } catch(error) { $('status').textContent = error.message; }
        });
        $('detail').prepend(download);
      }
    } catch(error) { $('status').textContent = error.message; }
  }
  async function load() {
    $('status').textContent = 'Loading records…';
    try {
      const result = await api('?' + new URLSearchParams({type:$('type').value,search:$('search').value,offset,limit:50}));
      const selected = $('type').value;
      const all = document.createElement('option'); all.value = ''; all.textContent = 'All types';
      $('type').replaceChildren(all);
      for (const type of result.types) { const option = document.createElement('option'); option.value = type.type; option.textContent = type.type + ' (' + type.count + ')'; $('type').append(option); }
      $('type').value = selected;
      $('records').replaceChildren();
      for (const record of result.records) {
        const button = document.createElement('button'); button.className = 'record'; button.textContent = record.title || record.source_id;
        const meta = document.createElement('span'); meta.textContent = record.source_table + ' · ' + (record.updated_at || record.created_at || ''); button.append(meta);
        button.addEventListener('click', () => show(record.id)); $('records').append(button);
      }
      nextOffset = result.nextOffset; $('previous').disabled = offset === 0; $('next').disabled = nextOffset === null;
      $('status').textContent = result.records.length ? 'Showing ' + (offset + 1) + '–' + (offset + result.records.length) : 'No records match your search.';
    } catch(error) { $('status').textContent = error.message; $('records').replaceChildren(); }
  }
  $('find').addEventListener('click', () => { offset = 0; load(); });
  $('type').addEventListener('change', () => { offset = 0; load(); });
  $('search').addEventListener('keydown', (event) => { if (event.key === 'Enter') { offset = 0; load(); } });
  $('previous').addEventListener('click', () => { offset = Math.max(0, offset - 50); load(); });
  $('next').addEventListener('click', () => { if (nextOffset !== null) { offset = nextOffset; load(); } });
  load();
  </script></body></html>`;
}
