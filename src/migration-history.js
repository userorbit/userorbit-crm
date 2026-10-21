import { designSystemCss, icon } from "./design-system.js";
import { uiControlsCss, uiControlsScript } from "./ui-controls.js";

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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Migrated history · Userorbit</title><style>${designSystemCss}${uiControlsCss}
  *{box-sizing:border-box}body{margin:0;background:var(--bg-main,#171714);color:var(--text-primary,#fafaf8);font:13px/1.5 Inter,Arial,sans-serif}button,input,select{font:inherit}button,a,input{outline-offset:3px}button{cursor:pointer}button:disabled{cursor:default;opacity:.4}a{color:inherit;text-decoration:none}svg{flex-shrink:0;vertical-align:middle}.history-shell{display:grid;grid-template-columns:240px minmax(0,1fr);min-height:100vh}.history-sidebar{background:var(--bg-secondary,#1c1c18);border-right:1px solid var(--border-primary,rgba(250,250,248,.12));padding:20px 12px;display:flex;flex-direction:column;gap:24px}.brand{font-size:16px;font-weight:600;display:flex;align-items:center;gap:10px;padding:0 10px}.brand-mark{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:var(--accent,#f4fa72);color:#171714}.side-label{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--text-tertiary,#929288);padding:0 12px;margin-bottom:8px}.side-link{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:7px;color:var(--text-secondary,#b5b5aa);margin:2px 0}.side-link:hover,.side-link.active{background:var(--bg-tertiary,#30302a);color:var(--text-primary,#fafaf8)}.side-link.active{font-weight:500}.side-foot{margin-top:auto;border-top:1px solid var(--border-primary,rgba(250,250,248,.12));padding-top:12px}.history-main{min-width:0}.history-topbar{height:48px;border-bottom:1px solid var(--border-primary,rgba(250,250,248,.12));display:flex;align-items:center;justify-content:space-between;padding:0 24px;gap:16px;color:var(--text-secondary,#b5b5aa)}.top-context{display:flex;align-items:center;gap:9px;font-size:12px}.top-context span:last-child{color:var(--text-primary,#fafaf8)}.top-utility{display:flex;align-items:center;gap:8px;font-size:12px}.content{padding:24px;max-width:1800px;margin:auto}h1{font-size:20px;font-weight:500;letter-spacing:-.3px;margin:0 0 4px}h2{font-size:16px;font-weight:500;margin:0}p{margin:0;color:var(--text-secondary,#b5b5aa)}.heading{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:24px}.button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:32px;padding:5px 11px;border:1px solid var(--border-primary,rgba(250,250,248,.12));border-radius:8px;background:var(--bg-secondary,#1c1c18);color:var(--text-primary,#fafaf8);white-space:nowrap}.button:hover{background:var(--bg-tertiary,#30302a)}.button.primary{background:var(--accent,#f4fa72);color:#171714;border-color:transparent;font-weight:500}.read-only{font-size:11px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border-primary,rgba(250,250,248,.12));border-radius:5px;padding:3px 7px;color:var(--text-secondary,#b5b5aa)}.filters{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}.search-box{display:flex;align-items:center;gap:8px;border:1px solid var(--border-primary,rgba(250,250,248,.12));background:var(--bg-secondary,#1c1c18);border-radius:8px;height:34px;padding:0 10px;width:min(420px,100%);color:var(--text-secondary,#b5b5aa)}.search-box input{width:100%;min-width:0;border:0;outline:none;background:transparent;color:var(--text-primary,#fafaf8)}.search-box input::placeholder{color:var(--text-tertiary,#929288)}.filter-type{display:flex;align-items:center;gap:7px}.filter-type label{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}#type{min-width:190px}.status-row{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:32px;margin-bottom:8px;font-size:12px;color:var(--text-secondary,#b5b5aa)}#status[data-error=true]{color:#edb8a8}.layout{display:grid;grid-template-columns:minmax(280px,.8fr) minmax(340px,1.4fr);border:1px solid var(--border-primary,rgba(250,250,248,.12));border-radius:10px;overflow:hidden;min-height:600px;background:var(--bg-secondary,#1c1c18)}.list-panel{min-width:0;border-right:1px solid var(--border-primary,rgba(250,250,248,.12));display:flex;flex-direction:column}.panel-header{height:44px;display:flex;align-items:center;gap:8px;padding:0 16px;border-bottom:1px solid var(--border-primary,rgba(250,250,248,.12));font-size:12px;font-weight:500}.count-badge{color:var(--text-secondary,#b5b5aa);font-weight:400}.record{display:flex;align-items:flex-start;gap:11px;width:100%;padding:15px 16px;text-align:left;background:transparent;border:0;border-bottom:1px solid var(--border-primary,rgba(250,250,248,.12));color:var(--text-primary,#fafaf8)}.record:hover,.record[aria-pressed=true]{background:var(--bg-tertiary,#30302a)}.record[aria-pressed=true]{box-shadow:inset 2px 0 var(--accent,#f4fa72)}.record-icon{display:grid;place-items:center;width:30px;height:30px;background:var(--bg-tertiary,#30302a);border:1px solid var(--border-primary,rgba(250,250,248,.12));border-radius:7px;flex-shrink:0;color:var(--text-secondary,#b5b5aa)}.record-copy{min-width:0;flex:1}.record-name{display:block;font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.record-meta{display:block;font-size:11px;color:var(--text-secondary,#b5b5aa);margin-top:4px}#records{flex:1;max-height:720px;overflow:auto}#pages{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;gap:8px;border-top:1px solid var(--border-primary,rgba(250,250,248,.12))}#page-label{font-size:11px;color:var(--text-secondary,#b5b5aa)}.detail-panel{min-width:0}.detail-heading{padding:20px 24px;border-bottom:1px solid var(--border-primary,rgba(250,250,248,.12));display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.detail-heading h2{overflow-wrap:anywhere}.detail-subtitle{font-size:12px;margin-top:5px;color:var(--text-secondary,#b5b5aa)}#detail{padding:20px 24px;overflow-wrap:anywhere}.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:64px 24px;gap:12px;color:var(--text-secondary,#b5b5aa)}.empty-icon{width:46px;height:46px;display:grid;place-items:center;border:1px solid var(--border-primary,rgba(250,250,248,.12));border-radius:12px;color:var(--text-secondary,#b5b5aa)}.empty strong{font-size:14px;font-weight:500;color:var(--text-primary,#fafaf8)}.empty p{font-size:12px;max-width:300px}.detail-section{margin-bottom:24px}.detail-section h3{font-size:12px;font-weight:500;margin:0 0 12px;color:var(--text-secondary,#b5b5aa)}.field-grid{margin:0;display:grid;grid-template-columns:140px minmax(0,1fr);gap:0}.field-grid dt,.field-grid dd{padding:9px 0;border-bottom:1px solid var(--border-primary,rgba(250,250,248,.12));margin:0;font-size:12px;white-space:pre-wrap}.field-grid dt{color:var(--text-secondary,#b5b5aa);padding-right:16px}.field-grid dd{color:var(--text-primary,#fafaf8);max-height:280px;overflow:auto}.field-grid .long-value{line-height:1.7}.raw-data{border:1px solid var(--border-primary,rgba(250,250,248,.12));border-radius:8px}.raw-data summary{cursor:pointer;padding:11px 12px;font-size:12px;color:var(--text-secondary,#b5b5aa)}pre{white-space:pre-wrap;word-break:break-word;font:11px/1.7 ui-monospace,monospace;margin:0;padding:12px;max-height:460px;overflow:auto;border-top:1px solid var(--border-primary,rgba(250,250,248,.12))}.attachment-action{margin-bottom:20px}.back-mobile{display:none}@media(max-width:1000px){.history-shell{grid-template-columns:190px minmax(0,1fr)}.content{padding:20px}.layout{grid-template-columns:minmax(230px,.8fr) minmax(280px,1.2fr)}.field-grid{grid-template-columns:110px minmax(0,1fr)}}@media(max-width:760px){.history-shell{display:block}.history-sidebar{display:none}.history-topbar{padding:0 16px}.content{padding:20px 14px}.heading{align-items:flex-start;margin-bottom:20px}.heading>.read-only{display:none}.layout{grid-template-columns:1fr;min-height:480px}.list-panel{border-right:0}.detail-panel{border-top:1px solid var(--border-primary,rgba(250,250,248,.12))}.detail-heading,#detail{padding:18px}.top-utility{display:none}.back-mobile{display:inline-flex}.filter-type{flex:1}#type{width:100%}.search-box{width:100%}.filters>.button{margin-left:auto}.field-grid{grid-template-columns:110px minmax(0,1fr)}#records{max-height:380px}}
  </style></head><body><div class="history-shell"><aside class="history-sidebar"><a class="brand" href="/app"><span class="brand-mark">${icon("network",18)}</span>Userorbit CRM</a><nav aria-label="CRM navigation"><div class="side-label">Workspace</div><a class="side-link" href="/app">${icon("home")}CRM workspace</a><a class="side-link" href="/assistant">${icon("bot")}Relationship assistant</a><a class="side-link active" href="/migration-history" aria-current="page">${icon("clock")}Migrated history</a></nav><div class="side-foot"><a class="side-link" href="https://gtm.userorb.com" target="_blank" rel="noopener noreferrer">${icon("external")}Original CRM workflows</a></div></aside><main class="history-main"><header class="history-topbar"><div class="top-context"><a href="/app">CRM</a>${icon("chevron-right",13)}<span>Migrated history</span></div><a class="top-utility" href="/app">${icon("arrow-left",14)}Back to workspace</a></header><div class="content"><div class="heading"><div><h1>Migrated history</h1><p>Explore your preserved CRM records and original activity.</p></div><span class="read-only">${icon("shield",13)}Read-only archive</span></div><div class="filters"><div class="search-box">${icon("search",15)}<input id="search" type="search" aria-label="Search record titles" placeholder="Search records or original IDs…"></div><div class="filter-type"><label for="type">Record type</label><select id="type"><option value="">All record types</option></select></div><button class="button primary" id="find">Search</button></div><div class="status-row"><span id="status" role="status" aria-live="polite"></span><span>Original access permissions apply</span></div><div class="layout"><section class="list-panel" aria-label="Records"><div class="panel-header">Records <span id="record-count" class="count-badge"></span></div><div id="records"></div><div id="pages"><button class="button" id="previous" disabled>${icon("arrow-left",14)}Previous</button><span id="page-label">Page 1</span><button class="button" id="next" disabled>Next${icon("arrow-right",14)}</button></div></section><section class="detail-panel" aria-label="Record details"><div class="detail-heading"><div><h2 id="title">Record details</h2><div id="detail-subtitle" class="detail-subtitle">Preserved from your original CRM</div></div>${icon("book",18)}</div><div id="detail"><div class="empty"><span class="empty-icon">${icon("list",22)}</span><strong>Select a record to explore</strong><p>View its details, original identifiers, and preserved source data.</p></div></div></section></div></div></main></div><script>function __name(fn) { return fn; } ${uiControlsScript}\n(${historyBrowser.toString()})();</script></body></html>`;
}

function historyBrowser() {
  const $ = (id) => document.getElementById(id);
  let offset = 0, nextOffset = null, activeId = null, listRequest = 0, detailRequest = 0;
  const humanize = (value) => String(value || '').replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  function date(value) {
    if (!value) return '—';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
  }
  function status(message, error = false) { $('status').textContent = message; $('status').dataset.error = String(error); }
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
  function fields(title, entries) {
    const section = document.createElement('section'); section.className = 'detail-section';
    const heading = document.createElement('h3'); heading.textContent = title; section.append(heading);
    const grid = document.createElement('dl'); grid.className = 'field-grid';
    for (const [key, value] of entries) {
      const term = document.createElement('dt'); term.textContent = humanize(key);
      const description = document.createElement('dd');
      description.textContent = value === null || value === '' ? '—' : typeof value === 'object' ? JSON.stringify(value, null, 2) : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value);
      if (description.textContent.length > 160) description.className = 'long-value';
      grid.append(term, description);
    }
    section.append(grid); return section;
  }
  function empty(container, title, copy) {
    const block = document.createElement('div'); block.className = 'empty';
    const heading = document.createElement('strong'); heading.textContent = title;
    const description = document.createElement('p'); description.textContent = copy;
    block.append(heading, description); container.replaceChildren(block);
  }
  async function show(id) {
    const requestId = ++detailRequest; activeId = id;
    document.querySelectorAll('.record').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.id === id)));
    $('title').textContent = 'Loading record…'; empty($('detail'), 'Loading details', 'Retrieving your preserved source record.');
    try {
      const record = await api('/' + encodeURIComponent(id));
      if (requestId !== detailRequest) return;
      $('title').textContent = record.title || humanize(record.source_table);
      $('detail-subtitle').textContent = humanize(record.source_table) + ' · Updated ' + date(record.updated_at || record.created_at);
      const payload = displayValue(record.payload || {});
      const overview = fields('Record information', Object.entries(payload).filter(([key, value]) => !key.startsWith('_') && key !== 'attachment_download' && typeof value !== 'object' && !/^(id|workspace_id|created_at|updated_at)$/.test(key)));
      const metadata = fields('Source information', [['record_type', humanize(record.source_table)], ['original_record_id', record.source_id], ['workspace_id', record.workspace_id], ['created', date(record.created_at)], ['last_updated', date(record.updated_at)], ['archive_record_id', record.id]]);
      const raw = document.createElement('details'); raw.className = 'raw-data';
      const summary = document.createElement('summary'); summary.textContent = 'View preserved source data';
      const detail = document.createElement('pre');
      detail.textContent = JSON.stringify(displayValue(record), null, 2);
      raw.append(summary, detail);
      $('detail').replaceChildren();
      if (overview.querySelector('dd')) $('detail').append(overview);
      $('detail').append(metadata, raw);
      if (record.payload.attachment_download) {
        const download = document.createElement('button'); download.className = 'button attachment-action'; download.textContent = 'Download original attachment';
        download.addEventListener('click', async () => {
          download.disabled = true; download.textContent = 'Downloading…';
          try {
            const blob = await api('/' + encodeURIComponent(id) + '/attachment', true);
            const objectUrl = URL.createObjectURL(blob); const link = document.createElement('a');
            link.href = objectUrl; link.download = record.payload.file_name || record.payload.filename || record.payload.name || 'attachment';
            link.click(); setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
          } catch(error) { status(error.message, true); }
          finally { download.disabled = false; download.textContent = 'Download original attachment'; }
        });
        $('detail').prepend(download);
      }
    } catch(error) { if (requestId === detailRequest) { status(error.message, true); $('title').textContent = 'Record unavailable'; empty($('detail'), 'Unable to load this record', 'Try selecting it again, or return to the CRM to sign in.'); } }
  }
  async function load() {
    const requestId = ++listRequest; status('Loading records…'); $('find').disabled = true;
    try {
      const result = await api('?' + new URLSearchParams({type:$('type').value,search:$('search').value,offset,limit:50}));
      if (requestId !== listRequest) return;
      const selected = $('type').value;
      const all = document.createElement('option'); all.value = ''; all.textContent = 'All record types';
      $('type').replaceChildren(all);
      for (const type of result.types) { const option = document.createElement('option'); option.value = type.type; option.textContent = humanize(type.type) + ' (' + type.count + ')'; $('type').append(option); }
      $('type').value = selected;
      $('records').replaceChildren();
      for (const record of result.records) {
        const button = document.createElement('button'); button.className = 'record'; button.dataset.id = record.id; button.setAttribute('aria-pressed', String(activeId === record.id));
        const symbol = document.createElement('span'); symbol.className = 'record-icon'; symbol.textContent = humanize(record.source_table).charAt(0); symbol.setAttribute('aria-hidden', 'true');
        const copy = document.createElement('span'); copy.className = 'record-copy';
        const title = document.createElement('span'); title.className = 'record-name'; title.textContent = record.title || record.source_id;
        const meta = document.createElement('span'); meta.className = 'record-meta'; meta.textContent = humanize(record.source_table) + ' · ' + date(record.updated_at || record.created_at); copy.append(title, meta); button.append(symbol, copy);
        button.addEventListener('click', () => show(record.id)); $('records').append(button);
      }
      if (!result.records.length) empty($('records'), 'No records found', 'Try a different search or choose another record type.');
      nextOffset = result.nextOffset; $('previous').disabled = offset === 0; $('next').disabled = nextOffset === null;
      $('record-count').textContent = '(' + result.types.reduce((total, type) => total + Number(type.count), 0).toLocaleString() + ')';
      $('page-label').textContent = 'Page ' + (Math.floor(offset / 50) + 1);
      status(result.records.length ? 'Showing ' + (offset + 1) + '–' + (offset + result.records.length) + (selected ? ' in ' + humanize(selected) : '') : 'No records match your search.');
    } catch(error) { if (requestId === listRequest) { status(error.message, true); empty($('records'), 'Records unavailable', error.message); $('previous').disabled = true; $('next').disabled = true; } }
    finally { if (requestId === listRequest) $('find').disabled = false; }
  }
  $('find').addEventListener('click', () => { offset = 0; load(); });
  $('type').addEventListener('change', () => { offset = 0; load(); });
  $('search').addEventListener('keydown', (event) => { if (event.key === 'Enter') { offset = 0; load(); } });
  $('previous').addEventListener('click', () => { offset = Math.max(0, offset - 50); load(); });
  $('next').addEventListener('click', () => { if (nextOffset !== null) { offset = nextOffset; load(); } });
  load();
}
