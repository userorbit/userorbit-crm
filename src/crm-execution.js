function problem(status, message) { return Object.assign(new Error(message), { status }); }

export function normalizeSuppression(kind, value) {
  const text = String(value || '').trim().toLowerCase();
  if (kind === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return text;
  if (kind === 'domain') {
    const domain = text.replace(/^https?:\/\//, '').replace(/^@/, '').replace(/\/$/, '');
    if (/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain)) return domain;
  }
  if (kind === 'linkedin') {
    try {
      const url = new URL(/^https?:\/\//.test(text) ? text : 'https://' + text);
      if (['linkedin.com','www.linkedin.com'].includes(url.hostname) && /^\/(in|company)\/[^/]+\/?$/.test(url.pathname)) return 'https://www.linkedin.com' + url.pathname.replace(/\/$/, '');
    } catch {}
  }
  throw problem(400, 'Enter a valid email, domain, or LinkedIn profile for the selected suppression type');
}

export async function assertContactOutreachAllowed(env, workspaceId, recipient) {
  let contact = typeof recipient === 'string' ? { email: recipient } : recipient || {};
  if (contact.id) {
    const row = await env.DB.prepare('SELECT c.* FROM contacts c JOIN accounts a ON a.id=c.account_id WHERE c.id=? AND a.workspace_id=?').bind(contact.id, workspaceId).first();
    if (!row) throw problem(404, 'Contact not found');
    contact = { ...contact, ...row };
  }
  const email = String(contact.email || '').trim().toLowerCase();
  if (email) {
    const matched = await env.DB.prepare("SELECT c.* FROM contacts c JOIN accounts a ON a.id=c.account_id WHERE lower(c.email)=? AND a.workspace_id=? LIMIT 1").bind(email, workspaceId).first();
    if (matched && ['unsubscribed','bounced'].includes(matched.status)) throw problem(409, 'Outreach blocked: this recipient has opted out or bounced');
    if (matched) contact = { ...contact, ...matched };
  }
  if (['unsubscribed','bounced'].includes(contact.status)) throw problem(409, 'Outreach blocked: this contact has opted out or bounced');
  const domain = email.split('@')[1] || '';
  let linkedin = '';
  if (contact.linkedin_url || contact.linkedinUrl) {
    try { linkedin = normalizeSuppression('linkedin', contact.linkedin_url || contact.linkedinUrl); } catch {}
  }
  const row = await env.DB.prepare(`SELECT id FROM outreach_suppressions WHERE workspace_id=? AND ((kind='email' AND value=?) OR (kind='domain' AND (?=value OR ? LIKE '%.'||value)) OR (kind='linkedin' AND value=?)) LIMIT 1`).bind(workspaceId, email, domain, domain, linkedin).first();
  if (row) throw problem(409, 'Outreach blocked by a workspace do-not-contact rule');
}

export async function validateTaskExecution(env, workspaceId, input, existing = {}) {
  const owner = input.ownerUserId !== undefined ? input.ownerUserId || null : existing.owner_user_id || null;
  if (owner) {
    const member = await env.DB.prepare("SELECT u.id FROM users u JOIN workspaces w ON w.id=? LEFT JOIN workspace_members m ON m.workspace_id=w.id AND m.user_id=u.id LEFT JOIN team_members t ON t.team_id=w.team_id AND t.user_id=u.id WHERE u.id=? AND u.status='active' AND (m.user_id IS NOT NULL OR t.role IN ('owner','admin'))").bind(workspaceId, owner).first();
    if (!member) throw problem(400, 'Task owner must be a member of this workspace');
  }
  const priority = input.priority || existing.priority || 'normal';
  if (!['low','normal','high','urgent'].includes(priority)) throw problem(400, 'Invalid task priority');
  const status = input.status || existing.status || 'open';
  if (!['open','in_progress','blocked','done'].includes(status)) throw problem(400, 'Invalid task status');
  const blockedReason = input.blockedReason !== undefined ? String(input.blockedReason || '').trim() || null : existing.blocked_reason || null;
  if (status === 'blocked' && !blockedReason) throw problem(400, 'Add a reason when blocking a task');
  return { owner, priority, status, blockedReason, definitionOfDone: input.definitionOfDone !== undefined ? String(input.definitionOfDone || '').trim() || null : existing.definition_of_done || null };
}

export async function linkedLegacyTimeline(env, entity, id, auth) {
  if (auth?.kind !== 'session' || auth.user?.status !== 'active') return [];
  const sourceId = id.replace(/^orbit:(accounts|contacts):/, '');
  const links = await env.DB.prepare('SELECT legacy_entity_id FROM crm_legacy_entity_links WHERE entity=? AND entity_id=?').bind(entity,id).all();
  const sourceIds = [...new Set([...(sourceId !== id ? [sourceId] : []), ...links.results.map(row=>row.legacy_entity_id)])];
  if (!sourceIds.length) return [];
  const key = entity === 'account' ? '$.account_id' : '$.contact_id';
  const rows = await env.DB.prepare(`SELECT r.id,r.source_table,r.title,r.created_at,r.updated_at FROM legacy_records r JOIN legacy_record_access acl ON acl.record_id=r.id
    WHERE acl.user_id=? AND json_valid(r.payload_json) AND (r.id IN (${sourceIds.map(()=>'?').join(',')}) OR json_extract(r.payload_json,?) IN (${sourceIds.map(()=>'?').join(',')}) OR (json_extract(r.payload_json,'$.entity_type')=? AND json_extract(r.payload_json,'$.entity_id') IN (${sourceIds.map(()=>'?').join(',')})))
    AND r.source_table NOT IN ('users','memberships','mailboxes','contact_channel_states') ORDER BY r.updated_at DESC LIMIT 100`).bind(auth.user.id,...sourceIds.map(source=>'orbit:'+(entity==='account'?'accounts':'contacts')+':'+source),key,...sourceIds,entity,...sourceIds).all();
  return rows.results.map(row => ({ id: 'history:' + row.id, type: 'history', title: row.title, detail: 'Original CRM · ' + row.source_table.replaceAll('_', ' '), happenedAt: row.updated_at || row.created_at, historyId: row.id }));
}
