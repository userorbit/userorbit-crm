import { connect } from "cloudflare:sockets";
import { appHtml, landingHtml } from "./ui.js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,x-workspace-id",
};

const SEGMENTS = new Set(["product", "growth", "success"]);
const ACCOUNT_STATUSES = new Set(["target", "researching", "contacted", "replied", "qualified", "disqualified"]);
const CONTACT_STATUSES = new Set(["new", "active", "replied", "bounced", "unsubscribed"]);
const OPPORTUNITY_STAGES = new Set(["research", "conversation", "demo", "proposal", "won", "lost"]);
const WARMUP_PLAN_STATUSES = new Set(["active", "paused", "cancelled", "completed"]);
const WARMUP_INTERACTIONS = new Set(["inbox", "spam", "not_spam", "reply", "important"]);
const CUSTOM_FIELD_ENTITIES = new Set(["account"]);
const CUSTOM_FIELD_TYPES = new Set(["text", "number", "date", "select", "url"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: JSON_HEADERS });
    }

    try {
      if (url.pathname === "/" || url.pathname === "/index.html") {
        return new Response(landingHtml, { headers: { "content-type": "text/html; charset=utf-8" } });
      }

      if (url.pathname === "/app") {
        return new Response(appHtml, { headers: { "content-type": "text/html; charset=utf-8" } });
      }

      if (url.pathname.startsWith("/api/")) {
        const auth = await requireAuth(request, env);
        return await routeApi(request, env, url, auth);
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      const status = Number(error.status || 500);
      return json({ error: error.message || "Internal server error" }, status);
    }
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(processScheduledJobs(env));
  },
};

async function routeApi(request, env, url, auth) {
  const path = url.pathname.replace(/^\/api\/?/, "");
  const workspaceId = await resolveWorkspaceId(env, request, auth);

  if (request.method === "GET" && path === "health") {
    return json({ ok: true, provider: "cloudflare-workers-d1", smtp: smtpConfigured(env) });
  }

  if (request.method === "GET" && path === "me") {
    return json(await getTenantContext(env, workspaceId, auth));
  }

  if (request.method === "POST" && path === "teams") {
    return json(await createTeam(env, await readJson(request), auth), 201);
  }

  if (request.method === "POST" && path === "workspaces") {
    return json(await createWorkspace(env, await readJson(request), auth), 201);
  }

  if (request.method === "POST" && path === "workspace-tokens") {
    return json(await createWorkspaceToken(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "GET" && path === "workspace-tokens") {
    return json(await listWorkspaceTokens(env, workspaceId, auth));
  }

  if (request.method === "DELETE" && path.startsWith("workspace-tokens/")) {
    return json(await revokeWorkspaceToken(env, path.split("/")[1], workspaceId, auth));
  }

  if (request.method === "GET" && path === "audit-logs") {
    return json(await listAuditLogs(env, workspaceId, auth));
  }

  if (request.method === "GET" && path === "summary") {
    return json(await getSummary(env, workspaceId));
  }

  if (request.method === "GET" && path === "reports") {
    return json(await getReports(env, workspaceId));
  }

  if (request.method === "GET" && path === "saved-views") {
    return json(await listSavedViews(env, workspaceId, auth, url));
  }

  if (request.method === "GET" && path === "custom-fields") {
    return json(await listCustomFields(env, workspaceId, url));
  }

  if (request.method === "POST" && path === "custom-fields") {
    return json(await createCustomField(env, { ...(await readJson(request)), workspaceId }), 201);
  }

  if (request.method === "DELETE" && path.startsWith("custom-fields/")) {
    return json(await deleteCustomField(env, path.split("/")[1], workspaceId));
  }

  if (request.method === "POST" && path === "saved-views") {
    return json(await createSavedView(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "DELETE" && path.startsWith("saved-views/")) {
    return json(await deleteSavedView(env, path.split("/")[1], workspaceId, auth));
  }

  if (request.method === "GET" && path === "export/accounts.csv") {
    return csv(await exportAccountsCsv(env, workspaceId), "userorbit-accounts.csv");
  }

  if (request.method === "GET" && path === "accounts") {
    return json(await listAccounts(env, url, workspaceId, auth));
  }

  if (request.method === "GET" && path.startsWith("accounts/")) {
    return json(await getAccount(env, path.split("/")[1], workspaceId));
  }

  if (request.method === "POST" && path === "accounts") {
    return json(await createAccount(env, { ...(await readJson(request)), workspaceId }), 201);
  }

  if (request.method === "PATCH" && path.startsWith("accounts/")) {
    return json(await updateAccount(env, path.split("/")[1], await readJson(request)));
  }

  if (request.method === "POST" && path === "contacts") {
    return json(await createContact(env, await readJson(request)), 201);
  }

  if (request.method === "GET" && path.startsWith("contacts/")) {
    return json(await getContact(env, path.split("/")[1], workspaceId));
  }

  if (request.method === "POST" && path === "opportunities") {
    return json(await createOpportunity(env, { ...(await readJson(request)), workspaceId }), 201);
  }

  if (request.method === "GET" && path === "opportunities") {
    return json(await listOpportunities(env, workspaceId));
  }

  if (request.method === "PATCH" && path.startsWith("opportunities/")) {
    return json(await updateOpportunity(env, path.split("/")[1], { ...(await readJson(request)), workspaceId }));
  }

  if (request.method === "GET" && path === "tasks") {
    return json(await listTasks(env, workspaceId));
  }

  if (request.method === "POST" && path === "tasks") {
    return json(await createTask(env, { ...(await readJson(request)), workspaceId }), 201);
  }

  if (request.method === "PATCH" && path.startsWith("tasks/")) {
    return json(await updateTask(env, path.split("/")[1], await readJson(request)));
  }

  if (request.method === "GET" && path === "sequences") {
    return json(await listSequences(env));
  }

  if (request.method === "POST" && path === "enrollments") {
    return json(await enrollContact(env, await readJson(request)), 201);
  }

  if (request.method === "POST" && path === "email/send") {
    return json(await sendManualEmail(env, await readJson(request)), 201);
  }

  if (request.method === "POST" && path === "sequence/run") {
    return json(await processDueSequenceEmails(env, { limit: 20 }));
  }

  if (request.method === "GET" && path === "warmup") {
    return json(await getWarmupOverview(env));
  }

  if (request.method === "POST" && path === "warmup/mailboxes") {
    return json(await upsertWarmupMailbox(env, await readJson(request)), 201);
  }

  if (request.method === "POST" && path === "warmup/plans") {
    return json(await createWarmupPlan(env, await readJson(request)), 201);
  }

  if (request.method === "PATCH" && path.startsWith("warmup/plans/")) {
    return json(await updateWarmupPlan(env, path.split("/")[2], await readJson(request)));
  }

  if (request.method === "POST" && path === "warmup/run") {
    const input = await readJson(request);
    return json(await processDueWarmupEmails(env, { limit: input.limit || 1 }));
  }

  if (request.method === "POST" && path.startsWith("warmup/messages/") && path.endsWith("/interaction")) {
    return json(await recordWarmupInteraction(env, path.split("/")[2], await readJson(request)), 201);
  }

  if (request.method === "POST" && path === "agent/command") {
    return json(await runAgentCommand(env, { ...(await readJson(request)), workspaceId }));
  }

  return json({ error: "Not found" }, 404);
}

async function getSummary(env, workspaceId) {
  const [accounts, contacts, activeEnrollments, dueTasks, openPipeline] = await Promise.all([
    scalar(env, "SELECT COUNT(*) FROM accounts WHERE workspace_id = ?", workspaceId),
    scalar(env, "SELECT COUNT(*) FROM contacts c JOIN accounts a ON a.id = c.account_id WHERE a.workspace_id = ?", workspaceId),
    scalar(env, "SELECT COUNT(*) FROM sequence_enrollments se JOIN contacts c ON c.id = se.contact_id JOIN accounts a ON a.id = c.account_id WHERE se.status = 'active' AND a.workspace_id = ?", workspaceId),
    scalar(env, "SELECT COUNT(*) FROM tasks WHERE status = 'open' AND workspace_id = ?", workspaceId),
    scalar(env, "SELECT COALESCE(SUM(value_cents), 0) FROM opportunities WHERE stage NOT IN ('won', 'lost') AND workspace_id = ?", workspaceId),
  ]);

  return { accounts, contacts, activeEnrollments, dueTasks, openPipelineCents: openPipeline };
}

async function getReports(env, workspaceId) {
  const [pipeline, accountStatus, taskStatus, sequencePerformance, activity, stalledOpportunities] = await Promise.all([
    env.DB.prepare(`
      SELECT stage, COUNT(*) AS opportunities, COALESCE(SUM(value_cents), 0) AS value_cents, AVG(confidence) AS avg_confidence
      FROM opportunities
      WHERE workspace_id = ?
      GROUP BY stage
      ORDER BY CASE stage
        WHEN 'research' THEN 1
        WHEN 'conversation' THEN 2
        WHEN 'demo' THEN 3
        WHEN 'proposal' THEN 4
        WHEN 'won' THEN 5
        WHEN 'lost' THEN 6
        ELSE 7
      END
    `).bind(workspaceId).all(),
    env.DB.prepare(`
      SELECT status, COUNT(*) AS accounts
      FROM accounts
      WHERE workspace_id = ?
      GROUP BY status
      ORDER BY accounts DESC
    `).bind(workspaceId).all(),
    env.DB.prepare(`
      SELECT
        status,
        COUNT(*) AS tasks,
        SUM(CASE WHEN due_at IS NOT NULL AND due_at < datetime('now') AND status != 'done' THEN 1 ELSE 0 END) AS overdue
      FROM tasks
      WHERE workspace_id = ?
      GROUP BY status
      ORDER BY tasks DESC
    `).bind(workspaceId).all(),
    env.DB.prepare(`
      SELECT
        s.id,
        s.name,
        COUNT(DISTINCT CASE WHEN a.workspace_id = ? THEN se.id END) AS enrollments,
        SUM(CASE WHEN a.workspace_id = ? AND se.status = 'active' THEN 1 ELSE 0 END) AS active_enrollments,
        SUM(CASE WHEN a.workspace_id = ? AND se.status = 'completed' THEN 1 ELSE 0 END) AS completed_enrollments,
        COUNT(ee.id) AS emails,
        SUM(CASE WHEN ee.status = 'sent' THEN 1 ELSE 0 END) AS sent,
        SUM(CASE WHEN ee.status = 'drafted' THEN 1 ELSE 0 END) AS drafted,
        SUM(CASE WHEN ee.status = 'failed' THEN 1 ELSE 0 END) AS failed
      FROM sequences s
      LEFT JOIN sequence_enrollments se ON se.sequence_id = s.id
      LEFT JOIN contacts c ON c.id = se.contact_id
      LEFT JOIN accounts a ON a.id = c.account_id AND a.workspace_id = ?
      LEFT JOIN email_events ee ON ee.sequence_id = s.id AND ee.account_id = a.id
      GROUP BY s.id
      ORDER BY emails DESC, enrollments DESC
    `).bind(workspaceId, workspaceId, workspaceId, workspaceId).all(),
    env.DB.prepare(`
      SELECT
        COUNT(*) AS emails,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
        SUM(CASE WHEN status = 'drafted' THEN 1 ELSE 0 END) AS drafted,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
        MAX(created_at) AS last_activity_at
      FROM email_events
      WHERE account_id IN (SELECT id FROM accounts WHERE workspace_id = ?)
    `).bind(workspaceId).first(),
    env.DB.prepare(`
      SELECT o.*, a.name AS account_name, MAX(ee.created_at) AS last_activity_at
      FROM opportunities o
      JOIN accounts a ON a.id = o.account_id
      LEFT JOIN email_events ee ON ee.account_id = a.id
      WHERE o.workspace_id = ? AND o.stage NOT IN ('won', 'lost')
      GROUP BY o.id
      HAVING last_activity_at IS NULL OR last_activity_at < datetime('now', '-14 days')
      ORDER BY COALESCE(last_activity_at, o.created_at) ASC
      LIMIT 20
    `).bind(workspaceId).all(),
  ]);

  return {
    pipeline: pipeline.results,
    accountStatus: accountStatus.results,
    taskStatus: taskStatus.results,
    sequencePerformance: sequencePerformance.results,
    activity,
    stalledOpportunities: stalledOpportunities.results,
  };
}

async function exportAccountsCsv(env, workspaceId) {
  const rows = await env.DB.prepare(`
    SELECT
      a.id,
      a.name,
      a.domain,
      a.segment,
      a.status,
      a.source,
      a.owner,
      a.observation,
      COUNT(DISTINCT c.id) AS contacts_count,
      COUNT(DISTINCT o.id) AS opportunities_count,
      COALESCE(SUM(o.value_cents), 0) AS open_pipeline_cents,
      MAX(ee.created_at) AS last_activity_at,
      a.created_at,
      a.updated_at
    FROM accounts a
    LEFT JOIN contacts c ON c.account_id = a.id
    LEFT JOIN opportunities o ON o.account_id = a.id AND o.stage NOT IN ('won', 'lost')
    LEFT JOIN email_events ee ON ee.account_id = a.id
    WHERE a.workspace_id = ?
    GROUP BY a.id
    ORDER BY a.updated_at DESC
  `).bind(workspaceId).all();
  return toCsv(rows.results, [
    "id",
    "name",
    "domain",
    "segment",
    "status",
    "source",
    "owner",
    "observation",
    "contacts_count",
    "opportunities_count",
    "open_pipeline_cents",
    "last_activity_at",
    "created_at",
    "updated_at",
  ]);
}

async function listSavedViews(env, workspaceId, auth, url) {
  const resource = url.searchParams.get("resource") || "accounts";
  const rows = await env.DB.prepare(`
    SELECT * FROM saved_views
    WHERE workspace_id = ? AND user_id = ? AND resource = ?
    ORDER BY updated_at DESC
  `).bind(workspaceId, auth.user.id, resource).all();
  return rows.results.map((row) => ({ ...row, filters: parseJsonObject(row.filters_json) }));
}

async function createSavedView(env, input, auth) {
  requireFields(input, ["name"]);
  const resource = input.resource || "accounts";
  if (resource !== "accounts") throw httpError(400, "Only account saved views are supported");
  const filters = normalizeAccountFilters(input.filters || {});
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO saved_views (id, workspace_id, user_id, name, resource, filters_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, input.workspaceId, auth.user.id, input.name.trim(), resource, JSON.stringify(filters), now, now).run();
  return { ...(await getRequired(env, "SELECT * FROM saved_views WHERE id = ?", id)), filters };
}

async function deleteSavedView(env, id, workspaceId, auth) {
  await env.DB.prepare("DELETE FROM saved_views WHERE id = ? AND workspace_id = ? AND user_id = ?")
    .bind(id, workspaceId, auth.user.id)
    .run();
  return { ok: true };
}

async function recordAuditLog(env, { workspaceId, userId, action, resource, resourceId, metadata = {} }) {
  await env.DB.prepare(`
    INSERT INTO audit_logs (id, workspace_id, user_id, action, resource, resource_id, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    cleanNullable(workspaceId),
    cleanNullable(userId),
    action,
    resource,
    cleanNullable(resourceId),
    JSON.stringify(metadata),
    new Date().toISOString(),
  ).run();
}

async function listCustomFields(env, workspaceId, url) {
  const entity = url.searchParams.get("entity") || "account";
  if (!CUSTOM_FIELD_ENTITIES.has(entity)) throw httpError(400, "Unsupported custom field entity");
  const rows = await env.DB.prepare(`
    SELECT * FROM custom_fields
    WHERE workspace_id = ? AND entity = ?
    ORDER BY created_at ASC
  `).bind(workspaceId, entity).all();
  return rows.results.map((row) => ({ ...row, options: parseJsonArray(row.options_json) }));
}

async function createCustomField(env, input) {
  requireFields(input, ["name"]);
  const entity = input.entity || "account";
  if (!CUSTOM_FIELD_ENTITIES.has(entity)) throw httpError(400, "Unsupported custom field entity");
  const type = input.type || "text";
  if (!CUSTOM_FIELD_TYPES.has(type)) throw httpError(400, "Unsupported custom field type");
  const key = slugify(input.key || input.name).replaceAll("-", "_");
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  const options = Array.isArray(input.options) ? input.options.map((option) => String(option).trim()).filter(Boolean) : [];
  await env.DB.prepare(`
    INSERT INTO custom_fields (id, workspace_id, entity, name, key, type, options_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, input.workspaceId, entity, input.name.trim(), key, type, options.length ? JSON.stringify(options) : null, now, now).run();
  return { ...(await getRequired(env, "SELECT * FROM custom_fields WHERE id = ?", id)), options };
}

async function deleteCustomField(env, id, workspaceId) {
  await env.DB.prepare("DELETE FROM custom_fields WHERE id = ? AND workspace_id = ?").bind(id, workspaceId).run();
  return { ok: true };
}

async function listAccounts(env, url, workspaceId, auth) {
  const filters = await resolveAccountFilters(env, url, workspaceId, auth);
  const search = `%${filters.q || ""}%`;
  const segment = filters.segment;
  const status = filters.status;
  const params = [workspaceId, search, search, search];
  let where = "WHERE a.workspace_id = ? AND (a.name LIKE ? OR a.domain LIKE ? OR c.email LIKE ?)";

  if (segment) {
    where += " AND a.segment = ?";
    params.push(segment);
  }
  if (status) {
    where += " AND a.status = ?";
    params.push(status);
  }

  const rows = await env.DB.prepare(`
    SELECT
      a.*,
      COUNT(DISTINCT c.id) AS contacts_count,
      COUNT(DISTINCT o.id) AS opportunities_count,
      COALESCE(SUM(o.value_cents), 0) AS pipeline_cents,
      MAX(e.created_at) AS last_email_at
    FROM accounts a
    LEFT JOIN contacts c ON c.account_id = a.id
    LEFT JOIN opportunities o ON o.account_id = a.id AND o.stage NOT IN ('won', 'lost')
    LEFT JOIN email_events e ON e.account_id = a.id
    ${where}
    GROUP BY a.id
    ORDER BY a.updated_at DESC
    LIMIT 100
  `)
    .bind(...params)
    .all();

  return rows.results;
}

async function resolveAccountFilters(env, url, workspaceId, auth) {
  const savedViewId = cleanNullable(url.searchParams.get("viewId"));
  if (savedViewId) {
    const view = await getRequired(env, "SELECT * FROM saved_views WHERE id = ? AND workspace_id = ? AND user_id = ? AND resource = 'accounts'", savedViewId, workspaceId, auth.user.id);
    return normalizeAccountFilters(parseJsonObject(view.filters_json));
  }
  return normalizeAccountFilters({
    q: url.searchParams.get("q"),
    segment: url.searchParams.get("segment"),
    status: url.searchParams.get("status"),
  });
}

function normalizeAccountFilters(input = {}) {
  return {
    q: cleanNullable(input.q) || "",
    segment: SEGMENTS.has(input.segment) ? input.segment : "",
    status: ACCOUNT_STATUSES.has(input.status) ? input.status : "",
  };
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function createAccount(env, input) {
  requireFields(input, ["name"]);
  const workspaceId = input.workspaceId || (await resolveDefaultWorkspaceId(env));
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  const segment = normalizeEnum(input.segment || "product", SEGMENTS, "segment");
  const status = normalizeEnum(input.status || "target", ACCOUNT_STATUSES, "status");

  await env.DB.prepare(`
    INSERT INTO accounts (id, workspace_id, name, domain, segment, source, observation, status, owner, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      id,
      workspaceId,
      input.name.trim(),
      cleanNullable(input.domain),
      segment,
      cleanNullable(input.source),
      cleanNullable(input.observation),
      status,
      cleanNullable(input.owner),
      now,
      now,
    )
    .run();

  if (Array.isArray(input.contacts)) {
    for (const contact of input.contacts) {
      await createContact(env, { ...contact, accountId: id });
    }
  }

  if (input.customFields && typeof input.customFields === "object") {
    await upsertCustomFieldValues(env, workspaceId, "account", id, input.customFields);
  }

  return getAccount(env, id, workspaceId);
}

async function updateAccount(env, id, input) {
  const existing = await getRequired(env, "SELECT * FROM accounts WHERE id = ?", id);
  const next = {
    name: input.name?.trim() || existing.name,
    domain: input.domain !== undefined ? cleanNullable(input.domain) : existing.domain,
    segment: input.segment ? normalizeEnum(input.segment, SEGMENTS, "segment") : existing.segment,
    source: input.source !== undefined ? cleanNullable(input.source) : existing.source,
    observation: input.observation !== undefined ? cleanNullable(input.observation) : existing.observation,
    status: input.status ? normalizeEnum(input.status, ACCOUNT_STATUSES, "status") : existing.status,
    owner: input.owner !== undefined ? cleanNullable(input.owner) : existing.owner,
  };

  await env.DB.prepare(`
    UPDATE accounts
    SET name = ?, domain = ?, segment = ?, source = ?, observation = ?, status = ?, owner = ?, updated_at = ?
    WHERE id = ?
  `)
    .bind(next.name, next.domain, next.segment, next.source, next.observation, next.status, next.owner, new Date().toISOString(), id)
    .run();

  if (input.customFields && typeof input.customFields === "object") {
    await upsertCustomFieldValues(env, existing.workspace_id, "account", id, input.customFields);
  }

  return getAccount(env, id, existing.workspace_id);
}

async function createContact(env, input) {
  requireFields(input, ["accountId", "name", "email"]);
  await getRequired(env, "SELECT id FROM accounts WHERE id = ?", input.accountId);
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  const status = normalizeEnum(input.status || "new", CONTACT_STATUSES, "status");

  await env.DB.prepare(`
    INSERT INTO contacts (id, account_id, name, email, title, linkedin_url, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      id,
      input.accountId,
      input.name.trim(),
      input.email.trim().toLowerCase(),
      cleanNullable(input.title),
      cleanNullable(input.linkedinUrl),
      status,
      cleanNullable(input.notes),
      now,
      now,
    )
    .run();

  await touchAccount(env, input.accountId);
  return getRequired(env, "SELECT * FROM contacts WHERE id = ?", id);
}

async function createOpportunity(env, input) {
  requireFields(input, ["accountId", "name"]);
  await getRequired(env, "SELECT id FROM accounts WHERE id = ?", input.accountId);
  const workspaceId = input.workspaceId || (await resolveDefaultWorkspaceId(env));
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  const stage = normalizeEnum(input.stage || "research", OPPORTUNITY_STAGES, "stage");

  await env.DB.prepare(`
    INSERT INTO opportunities (id, workspace_id, account_id, contact_id, name, stage, value_cents, confidence, close_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      id,
      workspaceId,
      input.accountId,
      cleanNullable(input.contactId),
      input.name.trim(),
      stage,
      Number(input.valueCents || 0),
      Number(input.confidence || 25),
      cleanNullable(input.closeDate),
      now,
      now,
    )
    .run();

  await touchAccount(env, input.accountId);
  return getRequired(env, "SELECT * FROM opportunities WHERE id = ?", id);
}

async function listOpportunities(env, workspaceId) {
  const rows = await env.DB.prepare(`
    SELECT
      o.*,
      a.name AS account_name,
      a.domain AS account_domain,
      c.name AS contact_name,
      c.email AS contact_email,
      MAX(ee.created_at) AS last_activity_at
    FROM opportunities o
    JOIN accounts a ON a.id = o.account_id
    LEFT JOIN contacts c ON c.id = o.contact_id
    LEFT JOIN email_events ee ON ee.account_id = a.id
    WHERE o.workspace_id = ?
    GROUP BY o.id
    ORDER BY
      CASE o.stage
        WHEN 'research' THEN 1
        WHEN 'conversation' THEN 2
        WHEN 'demo' THEN 3
        WHEN 'proposal' THEN 4
        WHEN 'won' THEN 5
        WHEN 'lost' THEN 6
        ELSE 7
      END,
      o.updated_at DESC
  `).bind(workspaceId).all();
  return rows.results;
}

async function updateOpportunity(env, id, input) {
  const existing = await getRequired(env, "SELECT * FROM opportunities WHERE id = ? AND workspace_id = ?", id, input.workspaceId);
  const next = {
    name: input.name?.trim() || existing.name,
    stage: input.stage ? normalizeEnum(input.stage, OPPORTUNITY_STAGES, "stage") : existing.stage,
    valueCents: input.valueCents !== undefined ? Number(input.valueCents || 0) : existing.value_cents,
    confidence: input.confidence !== undefined ? Number(input.confidence || 0) : existing.confidence,
    closeDate: input.closeDate !== undefined ? cleanNullable(input.closeDate) : existing.close_date,
  };
  await env.DB.prepare(`
    UPDATE opportunities
    SET name = ?, stage = ?, value_cents = ?, confidence = ?, close_date = ?, updated_at = ?
    WHERE id = ? AND workspace_id = ?
  `).bind(next.name, next.stage, next.valueCents, next.confidence, next.closeDate, new Date().toISOString(), id, input.workspaceId).run();
  await touchAccount(env, existing.account_id);
  return getRequired(env, "SELECT * FROM opportunities WHERE id = ? AND workspace_id = ?", id, input.workspaceId);
}

async function listTasks(env, workspaceId) {
  const rows = await env.DB.prepare(`
    SELECT t.*, a.name AS account_name, c.name AS contact_name
    FROM tasks t
    LEFT JOIN accounts a ON a.id = t.account_id
    LEFT JOIN contacts c ON c.id = t.contact_id
    WHERE t.workspace_id = ?
    ORDER BY COALESCE(t.due_at, t.created_at) ASC
    LIMIT 100
  `).bind(workspaceId).all();
  return rows.results;
}

async function createTask(env, input) {
  requireFields(input, ["title"]);
  const workspaceId = input.workspaceId || (await resolveDefaultWorkspaceId(env));
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO tasks (id, workspace_id, account_id, contact_id, title, kind, due_at, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      id,
      workspaceId,
      cleanNullable(input.accountId),
      cleanNullable(input.contactId),
      input.title.trim(),
      input.kind || "research",
      cleanNullable(input.dueAt),
      input.status || "open",
      cleanNullable(input.notes),
      now,
      now,
    )
    .run();

  return getRequired(env, "SELECT * FROM tasks WHERE id = ?", id);
}

async function updateTask(env, id, input) {
  const task = await getRequired(env, "SELECT * FROM tasks WHERE id = ?", id);
  await env.DB.prepare(`
    UPDATE tasks
    SET title = ?, kind = ?, due_at = ?, status = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `)
    .bind(
      input.title?.trim() || task.title,
      input.kind || task.kind,
      input.dueAt !== undefined ? cleanNullable(input.dueAt) : task.due_at,
      input.status || task.status,
      input.notes !== undefined ? cleanNullable(input.notes) : task.notes,
      new Date().toISOString(),
      id,
    )
    .run();
  return getRequired(env, "SELECT * FROM tasks WHERE id = ?", id);
}

async function listSequences(env) {
  const sequences = await env.DB.prepare(`
    SELECT s.*, COUNT(ss.id) AS steps_count
    FROM sequences s
    LEFT JOIN sequence_steps ss ON ss.sequence_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).all();

  const steps = await env.DB.prepare(`
    SELECT ss.*, et.name AS template_name, et.subject
    FROM sequence_steps ss
    JOIN email_templates et ON et.id = ss.template_id
    ORDER BY ss.sequence_id, ss.step_order
  `).all();

  return sequences.results.map((sequence) => ({
    ...sequence,
    steps: steps.results.filter((step) => step.sequence_id === sequence.id),
  }));
}

async function enrollContact(env, input) {
  requireFields(input, ["sequenceId", "contactId"]);
  await getRequired(env, "SELECT id FROM sequences WHERE id = ?", input.sequenceId);
  await getRequired(env, "SELECT id FROM contacts WHERE id = ?", input.contactId);
  const now = new Date().toISOString();
  const nextSendAt = input.nextSendAt || now;
  const id = input.id || crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO sequence_enrollments (id, sequence_id, contact_id, status, current_step_order, next_send_at, created_at, updated_at)
    VALUES (?, ?, ?, 'active', 1, ?, ?, ?)
  `)
    .bind(id, input.sequenceId, input.contactId, nextSendAt, now, now)
    .run();

  return getRequired(env, "SELECT * FROM sequence_enrollments WHERE id = ?", id);
}

async function sendManualEmail(env, input) {
  requireFields(input, ["contactId", "subject", "body"]);
  const contact = await getContactWithAccount(env, input.contactId);
  const result = await sendEmail(env, {
    to: contact.email,
    toName: contact.name,
    subject: input.subject,
    body: input.body,
  });

  const event = await recordEmailEvent(env, {
    contact,
    status: result.status,
    subject: input.subject,
    body: input.body,
    providerMessageId: result.providerMessageId,
    error: result.error,
    sentAt: result.status === "sent" ? new Date().toISOString() : null,
  });

  return { ...event, provider: result };
}

async function processDueSequenceEmails(env, options = {}) {
  const limit = Number(options.limit || 10);
  const now = new Date().toISOString();
  const due = await env.DB.prepare(`
    SELECT
      se.*,
      ss.id AS step_id,
      ss.delay_days,
      et.subject,
      et.body,
      c.name AS contact_name,
      c.email,
      c.account_id,
      a.name AS account_name,
      a.domain,
      a.observation,
      a.segment
    FROM sequence_enrollments se
    JOIN sequence_steps ss ON ss.sequence_id = se.sequence_id AND ss.step_order = se.current_step_order
    JOIN email_templates et ON et.id = ss.template_id
    JOIN contacts c ON c.id = se.contact_id
    JOIN accounts a ON a.id = c.account_id
    WHERE se.status = 'active' AND se.next_send_at <= ?
    ORDER BY se.next_send_at ASC
    LIMIT ?
  `)
    .bind(now, limit)
    .all();

  const sent = [];
  for (const item of due.results) {
    const contact = {
      id: item.contact_id,
      name: item.contact_name,
      email: item.email,
      account_id: item.account_id,
      account_name: item.account_name,
      observation: item.observation,
    };
    const rendered = renderTemplate(
      { subject: item.subject, body: item.body },
      {
        contact: { name: item.contact_name, email: item.email },
        account: {
          name: item.account_name,
          domain: item.domain,
          observation: item.observation || "your team recently shipped a product update",
          segment: item.segment,
        },
        sender: { name: env.CRM_FROM_NAME || "UserOrbit" },
      },
    );

    const result = await sendEmail(env, {
      to: item.email,
      toName: item.contact_name,
      subject: rendered.subject,
      body: rendered.body,
    });

    await recordEmailEvent(env, {
      contact,
      sequenceId: item.sequence_id,
      sequenceStepId: item.step_id,
      status: result.status,
      subject: rendered.subject,
      body: rendered.body,
      providerMessageId: result.providerMessageId,
      error: result.error,
      sentAt: result.status === "sent" ? new Date().toISOString() : null,
    });

    const nextStep = await env.DB.prepare(`
      SELECT * FROM sequence_steps WHERE sequence_id = ? AND step_order = ?
    `)
      .bind(item.sequence_id, Number(item.current_step_order) + 1)
      .first();

    if (nextStep) {
      const nextSendAt = new Date(Date.now() + Number(nextStep.delay_days || 1) * 24 * 60 * 60 * 1000).toISOString();
      await env.DB.prepare(`
        UPDATE sequence_enrollments
        SET current_step_order = ?, next_send_at = ?, last_sent_at = ?, updated_at = ?
        WHERE id = ?
      `)
        .bind(nextStep.step_order, nextSendAt, now, now, item.id)
        .run();
    } else {
      await env.DB.prepare(`
        UPDATE sequence_enrollments
        SET status = 'completed', last_sent_at = ?, updated_at = ?
        WHERE id = ?
      `)
        .bind(now, now, item.id)
        .run();
    }

    sent.push({ enrollmentId: item.id, contactId: item.contact_id, status: result.status, subject: rendered.subject });
  }

  return { processed: sent.length, items: sent };
}

async function processScheduledJobs(env) {
  const [sequences, warmup] = await Promise.all([
    processDueSequenceEmails(env, { limit: 20 }),
    processDueWarmupEmails(env, { limit: 1 }),
  ]);
  return { sequences, warmup };
}

async function getWarmupOverview(env) {
  const now = new Date().toISOString();
  const mailboxes = await env.DB.prepare(`
    SELECT * FROM warmup_mailboxes ORDER BY created_at DESC
  `).all();

  const plans = await env.DB.prepare(`
    SELECT
      p.*,
      m.email AS mailbox_email,
      m.display_name AS mailbox_display_name,
      COUNT(wm.id) AS total_messages,
      SUM(CASE WHEN wm.status = 'sent' THEN 1 ELSE 0 END) AS sent_messages,
      SUM(CASE WHEN wm.status = 'failed' THEN 1 ELSE 0 END) AS failed_messages,
      SUM(CASE WHEN p.status = 'active' AND wm.status = 'pending' AND wm.scheduled_for <= ? THEN 1 ELSE 0 END) AS due_messages
    FROM warmup_plans p
    JOIN warmup_mailboxes m ON m.id = p.mailbox_id
    LEFT JOIN warmup_messages wm ON wm.plan_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `)
    .bind(now)
    .all();

  const todayStart = startOfTodayIso();
  const tomorrowStart = addDaysIso(todayStart, 1);
  const [sentToday, scheduledToday, dueNow] = await Promise.all([
    scalar(env, "SELECT COUNT(*) FROM warmup_messages WHERE status = 'sent' AND sent_at >= ? AND sent_at < ?", todayStart, tomorrowStart),
    scalar(env, "SELECT COUNT(*) FROM warmup_messages WHERE scheduled_for >= ? AND scheduled_for < ?", todayStart, tomorrowStart),
    scalar(env, `
      SELECT COUNT(*)
      FROM warmup_messages wm
      JOIN warmup_plans p ON p.id = wm.plan_id
      WHERE wm.status = 'pending'
        AND wm.scheduled_for <= ?
        AND p.status = 'active'
    `, now),
  ]);

  const recentMessages = await env.DB.prepare(`
    SELECT
      wm.*,
      mb.email AS mailbox_email,
      wr.email AS recipient_email,
      wr.name AS recipient_name
    FROM warmup_messages wm
    JOIN warmup_mailboxes mb ON mb.id = wm.mailbox_id
    JOIN warmup_recipients wr ON wr.id = wm.recipient_id
    ORDER BY wm.scheduled_for ASC
    LIMIT 50
  `).all();

  return {
    smtpConfigured: smtpConfigured(env),
    summary: { mailboxes: mailboxes.results.length, sentToday, scheduledToday, dueNow },
    mailboxes: await Promise.all(mailboxes.results.map((mailbox) => getWarmupMailbox(env, mailbox.id))),
    plans: plans.results.map((plan) => ({
      ...plan,
      progress: computeWarmupProgress(plan),
    })),
    recentMessages: recentMessages.results,
  };
}

async function upsertWarmupMailbox(env, input) {
  const email = cleanEmail(input.email || env.CRM_FROM_EMAIL || env.SMTP_USERNAME);
  if (!email) throw httpError(400, "Missing required field: email");
  ensureConfiguredWarmupSender(env, email);

  const now = new Date().toISOString();
  const existing = await env.DB.prepare("SELECT * FROM warmup_mailboxes WHERE email = ?").bind(email).first();
  const dailyMin = clampInteger(input.dailyMin ?? existing?.daily_min ?? 5, 1, 20, "dailyMin");
  const dailyMax = clampInteger(input.dailyMax ?? existing?.daily_max ?? 10, dailyMin, 20, "dailyMax");
  const sendWindowStart = normalizeTime(input.sendWindowStart || existing?.send_window_start || "09:30", "sendWindowStart");
  const sendWindowEnd = normalizeTime(input.sendWindowEnd || existing?.send_window_end || "18:30", "sendWindowEnd");
  const id = existing?.id || input.id || crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO warmup_mailboxes (
      id, email, display_name, smtp_host, status, daily_min, daily_max,
      send_window_start, send_window_end, timezone, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      display_name = excluded.display_name,
      smtp_host = excluded.smtp_host,
      status = excluded.status,
      daily_min = excluded.daily_min,
      daily_max = excluded.daily_max,
      send_window_start = excluded.send_window_start,
      send_window_end = excluded.send_window_end,
      timezone = excluded.timezone,
      updated_at = excluded.updated_at
  `)
    .bind(
      id,
      email,
      cleanNullable(input.displayName || existing?.display_name || env.CRM_FROM_NAME),
      cleanNullable(env.SMTP_HOST),
      input.status || existing?.status || "active",
      dailyMin,
      dailyMax,
      sendWindowStart,
      sendWindowEnd,
      input.timezone || existing?.timezone || "Asia/Kolkata",
      existing?.created_at || now,
      now,
    )
    .run();

  if (Array.isArray(input.recipients)) {
    await upsertWarmupRecipients(env, id, input.recipients);
  }

  return getWarmupMailbox(env, id);
}

async function createWarmupPlan(env, input) {
  requireFields(input, ["mailboxId"]);
  const mailbox = await getWarmupMailbox(env, input.mailboxId);
  ensureConfiguredWarmupSender(env, mailbox.email);
  if (mailbox.status !== "active") throw httpError(400, "Warmup mailbox is not active");

  if (Array.isArray(input.recipients) && input.recipients.length) {
    await upsertWarmupRecipients(env, mailbox.id, input.recipients);
  }

  const recipients = await env.DB.prepare(`
    SELECT * FROM warmup_recipients WHERE mailbox_id = ? AND status = 'active' ORDER BY created_at ASC
  `)
    .bind(mailbox.id)
    .all();
  if (recipients.results.length < 3) throw httpError(400, "Warmup requires at least 3 active recipients");

  const durationDays = clampInteger(input.durationDays || 14, 14, 90, "durationDays");
  const startsOn = normalizeDate(input.startsOn || new Date().toISOString().slice(0, 10), "startsOn");
  const endsOn = addDaysDate(startsOn, durationDays - 1);
  const dailyMin = clampInteger(input.dailyMin ?? mailbox.daily_min, 1, 20, "dailyMin");
  const dailyMax = clampInteger(input.dailyMax ?? mailbox.daily_max, dailyMin, 20, "dailyMax");
  const now = new Date().toISOString();
  const planId = input.id || crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO warmup_plans (id, mailbox_id, status, starts_on, ends_on, daily_min, daily_max, created_at, updated_at)
    VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?)
  `)
    .bind(planId, mailbox.id, startsOn, endsOn, dailyMin, dailyMax, now, now)
    .run();

  const messages = generateWarmupMessages({
    planId,
    mailbox,
    recipients: recipients.results,
    startsOn,
    durationDays,
    dailyMin,
    dailyMax,
  });

  for (const message of messages) {
    await env.DB.prepare(`
      INSERT INTO warmup_messages (
        id, plan_id, mailbox_id, recipient_id, scheduled_for, subject, body,
        status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `)
      .bind(message.id, planId, mailbox.id, message.recipientId, message.scheduledFor, message.subject, message.body, now, now)
      .run();
  }

  return getWarmupPlan(env, planId);
}

async function updateWarmupPlan(env, id, input) {
  const status = normalizeEnum(input.status, WARMUP_PLAN_STATUSES, "status");
  await getRequired(env, "SELECT id FROM warmup_plans WHERE id = ?", id);
  await env.DB.prepare("UPDATE warmup_plans SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, new Date().toISOString(), id)
    .run();
  return getWarmupPlan(env, id);
}

async function processDueWarmupEmails(env, options = {}) {
  const limit = Number(options.limit || 10);
  const now = new Date().toISOString();
  const due = await env.DB.prepare(`
    SELECT
      wm.*,
      p.status AS plan_status,
      mb.email AS mailbox_email,
      mb.display_name AS mailbox_display_name,
      wr.email AS recipient_email,
      wr.name AS recipient_name
    FROM warmup_messages wm
    JOIN warmup_plans p ON p.id = wm.plan_id
    JOIN warmup_mailboxes mb ON mb.id = wm.mailbox_id
    JOIN warmup_recipients wr ON wr.id = wm.recipient_id
    WHERE wm.status = 'pending'
      AND wm.scheduled_for <= ?
      AND p.status = 'active'
      AND mb.status = 'active'
      AND wr.status = 'active'
    ORDER BY wm.scheduled_for ASC
    LIMIT ?
  `)
    .bind(now, limit)
    .all();

  const items = [];
  for (const item of due.results) {
    ensureConfiguredWarmupSender(env, item.mailbox_email);
    const result = await sendEmail(env, {
      to: item.recipient_email,
      toName: item.recipient_name,
      subject: item.subject,
      body: item.body,
    });
    const sentAt = result.status === "sent" ? new Date().toISOString() : null;

    await env.DB.prepare(`
      UPDATE warmup_messages
      SET status = ?, provider_message_id = ?, error = ?, sent_at = ?, updated_at = ?
      WHERE id = ?
    `)
      .bind(result.status, cleanNullable(result.providerMessageId), cleanNullable(result.error), cleanNullable(sentAt), new Date().toISOString(), item.id)
      .run();

    await maybeCompleteWarmupPlan(env, item.plan_id);
    items.push({ messageId: item.id, planId: item.plan_id, to: item.recipient_email, status: result.status, error: result.error });
  }

  return { processed: items.length, items };
}

async function recordWarmupInteraction(env, messageId, input) {
  const kind = normalizeEnum(input.kind, WARMUP_INTERACTIONS, "kind");
  await getRequired(env, "SELECT id FROM warmup_messages WHERE id = ?", messageId);
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO warmup_interactions (id, message_id, kind, source, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
    .bind(id, messageId, kind, input.source || "manual", cleanNullable(input.notes), now)
    .run();

  return getRequired(env, "SELECT * FROM warmup_interactions WHERE id = ?", id);
}

async function runAgentCommand(env, input) {
  if (input.command === "create_account") {
    return { result: await createAccount(env, { ...(input.account || input.payload || {}), workspaceId: input.workspaceId }) };
  }
  if (input.command === "enroll_contact") {
    return { result: await enrollContact(env, input.payload || {}) };
  }
  if (input.command === "send_email") {
    return { result: await sendManualEmail(env, input.payload || {}) };
  }
  if (input.command === "run_sequences") {
    return { result: await processDueSequenceEmails(env, { limit: input.limit || 20 }) };
  }
  if (input.command === "run_warmup") {
    return { result: await processDueWarmupEmails(env, { limit: input.limit || 20 }) };
  }
  if (input.command === "create_task") {
    return { result: await createTask(env, { ...(input.payload || {}), workspaceId: input.workspaceId }) };
  }
  throw httpError(400, "Unsupported agent command");
}

async function getTenantContext(env, workspaceId, auth) {
  const teams = await env.DB.prepare(`
    SELECT t.*, tm.role
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    ORDER BY t.created_at ASC
  `).bind(auth.user.id).all();
  const workspaces = await env.DB.prepare(`
    SELECT w.*, t.name AS team_name
    FROM workspaces w
    JOIN teams t ON t.id = w.team_id
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    ORDER BY t.created_at ASC, w.created_at ASC
  `).bind(auth.user.id).all();
  return {
    user: auth.user,
    teams: teams.results,
    workspaces: workspaces.results,
    currentWorkspaceId: workspaceId,
  };
}

async function createTeam(env, input, auth) {
  requireFields(input, ["name"]);
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  await env.DB.prepare("INSERT INTO teams (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, input.name.trim(), slugify(input.slug || input.name), now, now)
    .run();
  await env.DB.prepare("INSERT INTO team_members (id, team_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, 'owner', ?, ?)")
    .bind(crypto.randomUUID(), id, auth.user.id, now, now)
    .run();
  const workspace = await createWorkspace(env, { teamId: id, name: input.defaultWorkspaceName || "Sales" }, auth);
  await recordAuditLog(env, { workspaceId: workspace.id, userId: auth.user.id, action: "team.create", resource: "team", resourceId: id, metadata: { name: input.name } });
  return { ...(await getRequired(env, "SELECT * FROM teams WHERE id = ?", id)), defaultWorkspace: workspace };
}

async function createWorkspace(env, input, auth) {
  requireFields(input, ["name"]);
  const teamId = input.teamId || (await resolveDefaultTeamId(env, auth));
  await getRequired(env, "SELECT id FROM teams WHERE id = ?", teamId);
  await requireTeamRole(env, auth.user.id, teamId, ["owner", "admin"]);
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  await env.DB.prepare("INSERT INTO workspaces (id, team_id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, teamId, input.name.trim(), slugify(input.slug || input.name), now, now)
    .run();
  await recordAuditLog(env, { workspaceId: id, userId: auth.user.id, action: "workspace.create", resource: "workspace", resourceId: id, metadata: { name: input.name, teamId } });
  return getRequired(env, "SELECT * FROM workspaces WHERE id = ?", id);
}

async function listWorkspaceTokens(env, workspaceId, auth) {
  const workspace = await getRequired(env, "SELECT w.*, t.id AS team_id FROM workspaces w JOIN teams t ON t.id = w.team_id WHERE w.id = ?", workspaceId);
  await requireTeamRole(env, auth.user.id, workspace.team_id, ["owner", "admin"]);
  const rows = await env.DB.prepare(`
    SELECT wat.id, wat.workspace_id, wat.created_by_user_id, wat.name, wat.last_used_at, wat.revoked_at, wat.created_at, wat.updated_at, u.name AS created_by_name
    FROM workspace_api_tokens wat
    JOIN users u ON u.id = wat.created_by_user_id
    WHERE wat.workspace_id = ?
    ORDER BY wat.created_at DESC
  `).bind(workspaceId).all();
  return rows.results;
}

async function createWorkspaceToken(env, input, auth) {
  const workspace = await getRequired(env, "SELECT w.*, t.id AS team_id FROM workspaces w JOIN teams t ON t.id = w.team_id WHERE w.id = ?", input.workspaceId);
  await requireTeamRole(env, auth.user.id, workspace.team_id, ["owner", "admin"]);
  const token = `uocrm_${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO workspace_api_tokens (id, workspace_id, created_by_user_id, name, token_hash, last_used_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, NULL, ?, ?)
  `).bind(id, workspace.id, auth.user.id, cleanNullable(input.name) || "Agent token", await sha256Hex(token), now, now).run();
  await recordAuditLog(env, { workspaceId: workspace.id, userId: auth.user.id, action: "workspace_token.create", resource: "workspace_api_token", resourceId: id, metadata: { name: cleanNullable(input.name) || "Agent token" } });
  return { id, workspaceId: workspace.id, name: cleanNullable(input.name) || "Agent token", token, createdAt: now };
}

async function revokeWorkspaceToken(env, id, workspaceId, auth) {
  const workspace = await getRequired(env, "SELECT w.*, t.id AS team_id FROM workspaces w JOIN teams t ON t.id = w.team_id WHERE w.id = ?", workspaceId);
  await requireTeamRole(env, auth.user.id, workspace.team_id, ["owner", "admin"]);
  const existing = await getRequired(env, "SELECT * FROM workspace_api_tokens WHERE id = ? AND workspace_id = ?", id, workspaceId);
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE workspace_api_tokens SET revoked_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?")
    .bind(now, now, id, workspaceId)
    .run();
  await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "workspace_token.revoke", resource: "workspace_api_token", resourceId: id, metadata: { name: existing.name } });
  return { ok: true, revokedAt: now };
}

async function listAuditLogs(env, workspaceId, auth) {
  const workspace = await getRequired(env, "SELECT w.*, t.id AS team_id FROM workspaces w JOIN teams t ON t.id = w.team_id WHERE w.id = ?", workspaceId);
  await requireTeamRole(env, auth.user.id, workspace.team_id, ["owner", "admin"]);
  const rows = await env.DB.prepare(`
    SELECT al.*, u.name AS user_name, u.email AS user_email
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE al.workspace_id = ?
    ORDER BY al.created_at DESC
    LIMIT 100
  `).bind(workspaceId).all();
  return rows.results.map((row) => ({ ...row, metadata: parseJsonObject(row.metadata_json) }));
}

async function resolveWorkspaceId(env, request, auth) {
  const requested = cleanNullable(request.headers.get("x-workspace-id"));
  if (requested) {
    const workspace = await getRequired(env, "SELECT w.*, t.id AS team_id FROM workspaces w JOIN teams t ON t.id = w.team_id WHERE w.id = ?", requested);
    await requireTeamRole(env, auth.user.id, workspace.team_id, ["owner", "admin", "member"]);
    return requested;
  }
  return auth.workspaceId || resolveDefaultWorkspaceId(env, auth);
}

async function resolveDefaultWorkspaceId(env, auth) {
  const workspace = await env.DB.prepare(`
    SELECT w.id
    FROM workspaces w
    JOIN team_members tm ON tm.team_id = w.team_id
    WHERE tm.user_id = ?
    ORDER BY w.created_at ASC
    LIMIT 1
  `).bind(auth.user.id).first();
  if (workspace?.id) return workspace.id;
  const teamId = await resolveDefaultTeamId(env, auth);
  const created = await createWorkspace(env, { teamId, name: "Sales" }, auth);
  return created.id;
}

async function resolveDefaultTeamId(env, auth) {
  const team = await env.DB.prepare(`
    SELECT t.id
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    ORDER BY t.created_at ASC
    LIMIT 1
  `).bind(auth.user.id).first();
  if (team?.id) return team.id;
  const created = await createTeam(env, { name: "Default Team", defaultWorkspaceName: "Sales" }, auth);
  return created.id;
}

async function sendEmail(env, message) {
  if (!smtpConfigured(env)) {
    return {
      status: "drafted",
      providerMessageId: null,
      error: "SMTP credentials are not configured; email saved as drafted.",
    };
  }

  try {
    const response = await smtpSend(env, message);
    return { status: "sent", providerMessageId: response || null, error: null };
  } catch (error) {
    return { status: "failed", providerMessageId: null, error: error.message || String(error) };
  }
}

async function smtpSend(env, message) {
  const port = Number(env.SMTP_PORT || 465);
  const secure = String(env.SMTP_SECURE || "true") === "true";
  let socket = connect(
    { hostname: env.SMTP_HOST || "smtp.zoho.com", port },
    { secureTransport: secure ? "on" : "starttls" },
  );
  let reader = socket.readable.getReader();
  let writer = socket.writable.getWriter();

  await readSmtp(reader, 220);
  await writeSmtp(writer, `EHLO ${smtpIdentityDomain(env)}\r\n`);
  await readSmtp(reader, 250);

  if (!secure) {
    await writeSmtp(writer, "STARTTLS\r\n");
    await readSmtp(reader, 220);
    writer.releaseLock();
    reader.releaseLock();
    socket = socket.startTls();
    reader = socket.readable.getReader();
    writer = socket.writable.getWriter();
    await writeSmtp(writer, `EHLO ${smtpIdentityDomain(env)}\r\n`);
    await readSmtp(reader, 250);
  }

  await writeSmtp(writer, "AUTH LOGIN\r\n");
  await readSmtp(reader, 334);
  await writeSmtp(writer, `${btoa(env.SMTP_USERNAME)}\r\n`);
  await readSmtp(reader, 334);
  await writeSmtp(writer, `${btoa(env.SMTP_PASSWORD)}\r\n`);
  await readSmtp(reader, 235);

  const from = env.CRM_FROM_EMAIL || env.SMTP_USERNAME;
  await writeSmtp(writer, `MAIL FROM:<${from}>\r\n`);
  await readSmtp(reader, 250);
  await writeSmtp(writer, `RCPT TO:<${message.to}>\r\n`);
  await readSmtp(reader, 250);
  await writeSmtp(writer, "DATA\r\n");
  await readSmtp(reader, 354);

  const raw = buildMimeMessage(env, message);
  await writeSmtp(writer, `${raw}\r\n.\r\n`);
  const accepted = await readSmtp(reader, 250);
  await writeSmtp(writer, "QUIT\r\n");
  writer.releaseLock();
  reader.releaseLock();
  socket.close();
  return accepted;
}

function buildMimeMessage(env, message) {
  const fromEmail = env.CRM_FROM_EMAIL || env.SMTP_USERNAME;
  const fromName = env.CRM_FROM_NAME || "UserOrbit";
  const messageDomain = emailDomain(fromEmail) || smtpIdentityDomain(env);
  const headers = [
    `From: ${formatAddress(fromName, fromEmail)}`,
    `To: ${formatAddress(message.toName, message.to)}`,
    `Reply-To: ${formatAddress(fromName, fromEmail)}`,
    `Subject: ${encodeHeader(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${messageDomain}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
  ];
  return `${headers.join("\r\n")}\r\n\r\n${escapeSmtpBody(message.body)}`;
}

function smtpIdentityDomain(env) {
  return emailDomain(env.CRM_FROM_EMAIL || env.SMTP_USERNAME) || "userorb.com";
}

function emailDomain(email) {
  return String(email || "").split("@")[1]?.trim() || "";
}

async function readSmtp(reader, expectedCode) {
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) throw new Error("SMTP connection closed");
    buffer += decoder.decode(value);
    const lines = buffer.split(/\r?\n/).filter(Boolean);
    const last = lines[lines.length - 1] || "";
    if (/^\d{3} /.test(last)) {
      const code = Number(last.slice(0, 3));
      if (expectedCode && code !== expectedCode) {
        throw new Error(`SMTP expected ${expectedCode}, got ${buffer.trim()}`);
      }
      return buffer.trim();
    }
  }
}

async function writeSmtp(writer, line) {
  await writer.write(new TextEncoder().encode(line));
}

async function recordEmailEvent(env, input) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO email_events (
      id, contact_id, account_id, sequence_id, sequence_step_id, direction, status,
      subject, body, provider_message_id, error, sent_at, created_at
    )
    VALUES (?, ?, ?, ?, ?, 'outbound', ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      id,
      input.contact.id,
      input.contact.account_id,
      cleanNullable(input.sequenceId),
      cleanNullable(input.sequenceStepId),
      input.status,
      input.subject,
      input.body,
      cleanNullable(input.providerMessageId),
      cleanNullable(input.error),
      cleanNullable(input.sentAt),
      now,
    )
    .run();

  return getRequired(env, "SELECT * FROM email_events WHERE id = ?", id);
}

async function getWarmupMailbox(env, id) {
  const mailbox = await getRequired(env, "SELECT * FROM warmup_mailboxes WHERE id = ?", id);
  const recipients = await env.DB.prepare(`
    SELECT * FROM warmup_recipients WHERE mailbox_id = ? ORDER BY created_at ASC
  `)
    .bind(id)
    .all();
  return { ...mailbox, recipients: recipients.results };
}

async function getWarmupPlan(env, id) {
  const plan = await getRequired(
    env,
    `SELECT p.*, mb.email AS mailbox_email, mb.display_name AS mailbox_display_name
     FROM warmup_plans p
     JOIN warmup_mailboxes mb ON mb.id = p.mailbox_id
     WHERE p.id = ?`,
    id,
  );
  const messages = await env.DB.prepare(`
    SELECT wm.*, wr.email AS recipient_email, wr.name AS recipient_name
    FROM warmup_messages wm
    JOIN warmup_recipients wr ON wr.id = wm.recipient_id
    WHERE wm.plan_id = ?
    ORDER BY wm.scheduled_for ASC
  `)
    .bind(id)
    .all();

  return {
    ...plan,
    messages: messages.results,
    progress: computeWarmupProgress({
      ...plan,
      total_messages: messages.results.length,
      sent_messages: messages.results.filter((message) => message.status === "sent").length,
      failed_messages: messages.results.filter((message) => message.status === "failed").length,
      due_messages: messages.results.filter((message) => message.status === "pending" && message.scheduled_for <= new Date().toISOString()).length,
    }),
  };
}

async function upsertWarmupRecipients(env, mailboxId, recipients) {
  const now = new Date().toISOString();
  for (const recipient of recipients) {
    const email = cleanEmail(typeof recipient === "string" ? recipient : recipient.email);
    if (!email) continue;
    const existing = await env.DB.prepare("SELECT * FROM warmup_recipients WHERE mailbox_id = ? AND email = ?").bind(mailboxId, email).first();
    const id = existing?.id || crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO warmup_recipients (id, mailbox_id, email, name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(mailbox_id, email) DO UPDATE SET
        name = excluded.name,
        status = excluded.status,
        updated_at = excluded.updated_at
    `)
      .bind(
        id,
        mailboxId,
        email,
        cleanNullable(typeof recipient === "string" ? null : recipient.name),
        typeof recipient === "string" ? "active" : recipient.status || "active",
        existing?.created_at || now,
        now,
      )
      .run();
  }
}

async function maybeCompleteWarmupPlan(env, planId) {
  const remaining = await scalar(env, "SELECT COUNT(*) FROM warmup_messages WHERE plan_id = ? AND status = 'pending'", planId);
  if (remaining > 0) return;
  await env.DB.prepare(`
    UPDATE warmup_plans
    SET status = 'completed', updated_at = ?
    WHERE id = ? AND status = 'active'
  `)
    .bind(new Date().toISOString(), planId)
    .run();
}

async function getAccount(env, id, workspaceId) {
  const account = await getRequired(env, "SELECT * FROM accounts WHERE id = ? AND workspace_id = ?", id, workspaceId);
  const [contacts, opportunities, tasks, emails, customFields] = await Promise.all([
    env.DB.prepare("SELECT * FROM contacts WHERE account_id = ? ORDER BY created_at DESC").bind(id).all(),
    env.DB.prepare("SELECT * FROM opportunities WHERE account_id = ? ORDER BY created_at DESC").bind(id).all(),
    env.DB.prepare(`
      SELECT t.*, c.name AS contact_name
      FROM tasks t
      LEFT JOIN contacts c ON c.id = t.contact_id
      WHERE t.account_id = ? AND t.workspace_id = ?
      ORDER BY COALESCE(t.due_at, t.created_at) ASC
    `).bind(id, workspaceId).all(),
    env.DB.prepare(`
      SELECT ee.*, c.name AS contact_name, c.email AS contact_email, s.name AS sequence_name
      FROM email_events ee
      LEFT JOIN contacts c ON c.id = ee.contact_id
      LEFT JOIN sequences s ON s.id = ee.sequence_id
      WHERE ee.account_id = ?
      ORDER BY ee.created_at DESC
      LIMIT 100
    `).bind(id).all(),
    getCustomFieldValues(env, workspaceId, "account", id),
  ]);

  return {
    ...account,
    contacts: contacts.results,
    opportunities: opportunities.results,
    tasks: tasks.results,
    emails: emails.results,
    customFields,
    timeline: buildAccountTimeline({ account, contacts: contacts.results, opportunities: opportunities.results, tasks: tasks.results, emails: emails.results }),
  };
}

async function getContact(env, id, workspaceId) {
  const contact = await getRequired(
    env,
    `SELECT c.*, a.name AS account_name, a.domain AS account_domain, a.status AS account_status, a.segment AS account_segment
     FROM contacts c
     JOIN accounts a ON a.id = c.account_id
     WHERE c.id = ? AND a.workspace_id = ?`,
    id,
    workspaceId,
  );
  const [tasks, opportunities, enrollments, emails] = await Promise.all([
    env.DB.prepare(`
      SELECT * FROM tasks
      WHERE contact_id = ? AND workspace_id = ?
      ORDER BY COALESCE(due_at, created_at) ASC
    `).bind(id, workspaceId).all(),
    env.DB.prepare(`
      SELECT * FROM opportunities
      WHERE contact_id = ? AND workspace_id = ?
      ORDER BY updated_at DESC
    `).bind(id, workspaceId).all(),
    env.DB.prepare(`
      SELECT se.*, s.name AS sequence_name, s.description AS sequence_description
      FROM sequence_enrollments se
      JOIN sequences s ON s.id = se.sequence_id
      WHERE se.contact_id = ?
      ORDER BY se.updated_at DESC
    `).bind(id).all(),
    env.DB.prepare(`
      SELECT ee.*, s.name AS sequence_name
      FROM email_events ee
      LEFT JOIN sequences s ON s.id = ee.sequence_id
      WHERE ee.contact_id = ?
      ORDER BY ee.created_at DESC
      LIMIT 100
    `).bind(id).all(),
  ]);
  return {
    ...contact,
    tasks: tasks.results,
    opportunities: opportunities.results,
    enrollments: enrollments.results,
    emails: emails.results,
    timeline: buildContactTimeline({ contact, tasks: tasks.results, opportunities: opportunities.results, enrollments: enrollments.results, emails: emails.results }),
  };
}

async function getCustomFieldValues(env, workspaceId, entity, entityId) {
  const rows = await env.DB.prepare(`
    SELECT cf.id, cf.name, cf.key, cf.type, cf.options_json, cfv.value
    FROM custom_fields cf
    LEFT JOIN custom_field_values cfv ON cfv.field_id = cf.id AND cfv.entity_id = ?
    WHERE cf.workspace_id = ? AND cf.entity = ?
    ORDER BY cf.created_at ASC
  `).bind(entityId, workspaceId, entity).all();
  return rows.results.map((row) => ({ ...row, options: parseJsonArray(row.options_json), value: row.value || "" }));
}

async function upsertCustomFieldValues(env, workspaceId, entity, entityId, values) {
  const fields = await env.DB.prepare("SELECT * FROM custom_fields WHERE workspace_id = ? AND entity = ?").bind(workspaceId, entity).all();
  const byKey = new Map(fields.results.map((field) => [field.key, field]));
  const now = new Date().toISOString();
  for (const [key, rawValue] of Object.entries(values)) {
    const field = byKey.get(key);
    if (!field) continue;
    const value = normalizeCustomFieldValue(field, rawValue);
    const existing = await env.DB.prepare("SELECT id FROM custom_field_values WHERE field_id = ? AND entity_id = ?").bind(field.id, entityId).first();
    const id = existing?.id || crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO custom_field_values (id, workspace_id, field_id, entity, entity_id, value, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(field_id, entity_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).bind(id, workspaceId, field.id, entity, entityId, value, now, now).run();
  }
}

function normalizeCustomFieldValue(field, value) {
  if (value === undefined || value === null || value === "") return "";
  if (field.type === "number") return String(Number(value));
  if (field.type === "select") {
    const options = parseJsonArray(field.options_json);
    const selected = String(value).trim();
    if (options.length && !options.includes(selected)) throw httpError(400, `Invalid option for ${field.name}`);
    return selected;
  }
  return String(value).trim();
}

function buildAccountTimeline({ account, contacts, opportunities, tasks, emails }) {
  const items = [
    {
      id: `account:${account.id}`,
      type: "account",
      title: "Account created",
      detail: account.source ? `Source: ${account.source}` : account.observation || "",
      happenedAt: account.created_at,
    },
    ...contacts.map((contact) => ({
      id: `contact:${contact.id}`,
      type: "contact",
      title: `Contact added: ${contact.name}`,
      detail: [contact.title, contact.email].filter(Boolean).join(" · "),
      happenedAt: contact.created_at,
    })),
    ...opportunities.map((opportunity) => ({
      id: `opportunity:${opportunity.id}`,
      type: "opportunity",
      title: `Opportunity: ${opportunity.name}`,
      detail: `${opportunity.stage} · ${formatCents(opportunity.value_cents)} · ${opportunity.confidence}% confidence`,
      happenedAt: opportunity.updated_at || opportunity.created_at,
    })),
    ...tasks.map((task) => ({
      id: `task:${task.id}`,
      type: "task",
      title: `Task: ${task.title}`,
      detail: [task.status, task.kind, task.due_at ? `due ${task.due_at}` : ""].filter(Boolean).join(" · "),
      happenedAt: task.updated_at || task.created_at,
    })),
    ...emails.map((email) => ({
      id: `email:${email.id}`,
      type: "email",
      title: `${email.status}: ${email.subject}`,
      detail: [email.contact_name || email.contact_email, email.sequence_name].filter(Boolean).join(" · "),
      happenedAt: email.sent_at || email.created_at,
    })),
  ];
  return items.sort((a, b) => String(b.happenedAt || "").localeCompare(String(a.happenedAt || "")));
}

function buildContactTimeline({ contact, tasks, opportunities, enrollments, emails }) {
  const items = [
    {
      id: `contact:${contact.id}`,
      type: "contact",
      title: "Contact created",
      detail: [contact.title, contact.email, contact.account_name].filter(Boolean).join(" · "),
      happenedAt: contact.created_at,
    },
    ...tasks.map((task) => ({
      id: `task:${task.id}`,
      type: "task",
      title: `Task: ${task.title}`,
      detail: [task.status, task.kind, task.due_at ? `due ${task.due_at}` : ""].filter(Boolean).join(" · "),
      happenedAt: task.updated_at || task.created_at,
    })),
    ...opportunities.map((opportunity) => ({
      id: `opportunity:${opportunity.id}`,
      type: "opportunity",
      title: `Opportunity: ${opportunity.name}`,
      detail: `${opportunity.stage} · ${formatCents(opportunity.value_cents)} · ${opportunity.confidence}% confidence`,
      happenedAt: opportunity.updated_at || opportunity.created_at,
    })),
    ...enrollments.map((enrollment) => ({
      id: `enrollment:${enrollment.id}`,
      type: "sequence",
      title: `Sequence: ${enrollment.sequence_name}`,
      detail: `${enrollment.status} · step ${enrollment.current_step_order}`,
      happenedAt: enrollment.updated_at || enrollment.created_at,
    })),
    ...emails.map((email) => ({
      id: `email:${email.id}`,
      type: "email",
      title: `${email.status}: ${email.subject}`,
      detail: email.sequence_name || "",
      happenedAt: email.sent_at || email.created_at,
    })),
  ];
  return items.sort((a, b) => String(b.happenedAt || "").localeCompare(String(a.happenedAt || "")));
}

function formatCents(cents) {
  return `$${Math.round(Number(cents || 0) / 100).toLocaleString("en-US")}`;
}

async function getContactWithAccount(env, id) {
  return getRequired(
    env,
    `SELECT c.*, a.name AS account_name, a.observation
     FROM contacts c
     JOIN accounts a ON a.id = c.account_id
     WHERE c.id = ?`,
    id,
  );
}

async function touchAccount(env, accountId) {
  await env.DB.prepare("UPDATE accounts SET updated_at = ? WHERE id = ?").bind(new Date().toISOString(), accountId).run();
}

async function scalar(env, sql, ...params) {
  const statement = env.DB.prepare(sql);
  const row = params.length ? await statement.bind(...params).first() : await statement.first();
  return Number(Object.values(row || { value: 0 })[0] || 0);
}

async function getRequired(env, sql, ...params) {
  const row = await env.DB.prepare(sql).bind(...params).first();
  if (!row) throw httpError(404, "Resource not found");
  return row;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw httpError(400, "Expected JSON body");
  }
}

function renderTemplate(template, data) {
  const replace = (value) =>
    String(value).replace(/\\n/g, "\n").replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (_match, path) => {
      const resolved = path.split(".").reduce((cursor, key) => cursor?.[key], data);
      return resolved === undefined || resolved === null ? "" : String(resolved);
    });

  return { subject: replace(template.subject), body: replace(template.body) };
}

function generateWarmupMessages({ planId, mailbox, recipients, startsOn, durationDays, dailyMin, dailyMax }) {
  const subjects = [
    "Quick check-in",
    "Following up from today",
    "Small update",
    "Inbox check",
    "Checking email delivery",
    "Sharing a note",
    "Warmup note",
    "Plain text check",
  ];
  const bodyTemplates = [
    "Hi {{name}},\n\nSending a quick plain-text note while we warm up this mailbox. Please mark it as inbox if needed and reply when you get a chance.\n\nBest,\n{{sender}}",
    "Hi {{name}},\n\nThis is part of the mailbox warmup flow for UserOrbit. A short human reply helps confirm the inbox is behaving normally.\n\nBest,\n{{sender}}",
    "Hi {{name}},\n\nQuick internal delivery check from the UserOrbit mailbox. No links or tracking here, just a normal plain-text message.\n\nBest,\n{{sender}}",
    "Hi {{name}},\n\nChecking that this message reaches the inbox cleanly. If it lands in spam, please move it back and mark it as not spam.\n\nBest,\n{{sender}}",
  ];

  const messages = [];
  let recipientIndex = 0;
  for (let day = 0; day < durationDays; day += 1) {
    const date = addDaysDate(startsOn, day);
    const count = randomInt(dailyMin, dailyMax);
    const times = randomTimesForDay(date, count, mailbox.send_window_start, mailbox.send_window_end, mailbox.timezone);
    for (let index = 0; index < count; index += 1) {
      const recipient = recipients[recipientIndex % recipients.length];
      recipientIndex += 1;
      const name = recipient.name || recipient.email.split("@")[0];
      const template = bodyTemplates[(day + index) % bodyTemplates.length];
      const subject = subjects[(day * 3 + index) % subjects.length];
      messages.push({
        id: crypto.randomUUID(),
        planId,
        recipientId: recipient.id,
        scheduledFor: times[index],
        subject,
        body: template.replaceAll("{{name}}", name).replaceAll("{{sender}}", mailbox.display_name || "Mukesh"),
      });
    }
  }
  return messages.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}

function randomTimesForDay(date, count, start, end, timezone) {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  const windowMinutes = Math.max(endMinutes - startMinutes, count);
  const offset = timezone === "Asia/Kolkata" ? "+05:30" : "Z";
  const times = [];
  for (let index = 0; index < count; index += 1) {
    const minute = startMinutes + Math.floor(((index + Math.random()) / count) * windowMinutes);
    const hh = String(Math.floor(minute / 60)).padStart(2, "0");
    const mm = String(minute % 60).padStart(2, "0");
    const localIso = offset === "Z" ? `${date}T${hh}:${mm}:00Z` : `${date}T${hh}:${mm}:00${offset}`;
    times.push(new Date(localIso).toISOString());
  }
  return times.sort();
}

function computeWarmupProgress(plan) {
  const total = Number(plan.total_messages || 0);
  const sent = Number(plan.sent_messages || 0);
  const failed = Number(plan.failed_messages || 0);
  if (!total) return 0;
  const sendRatio = sent / total;
  const failurePenalty = failed ? Math.min(failed / total, 0.5) : 0;
  return Math.max(0, Math.min(100, Math.round((sendRatio - failurePenalty) * 100)));
}

function ensureConfiguredWarmupSender(env, email) {
  const configuredEmail = cleanEmail(env.CRM_FROM_EMAIL || env.SMTP_USERNAME);
  if (!configuredEmail) throw httpError(400, "SMTP sender email is not configured");
  if (cleanEmail(email) !== configuredEmail) {
    throw httpError(400, "Warmup mailbox must match the configured SMTP sender");
  }
}

async function requireAuth(request, env) {
  await ensureBootstrapIdentity(env);
  const header = request.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token) throw httpError(401, "Unauthorized");

  if (env.CRM_API_TOKEN && token === env.CRM_API_TOKEN) {
    return {
      kind: "bootstrap",
      workspaceId: null,
      user: await getRequired(env, "SELECT id, email, name, status, created_at FROM users WHERE id = 'user_bootstrap'"),
    };
  }

  const apiToken = await env.DB.prepare(`
    SELECT wat.*, u.id AS user_id, u.email, u.name AS user_name, u.status AS user_status
    FROM workspace_api_tokens wat
    JOIN users u ON u.id = wat.created_by_user_id
    WHERE wat.token_hash = ?
      AND wat.revoked_at IS NULL
  `).bind(await sha256Hex(token)).first();
  if (!apiToken) throw httpError(401, "Unauthorized");

  await env.DB.prepare("UPDATE workspace_api_tokens SET last_used_at = ?, updated_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), new Date().toISOString(), apiToken.id)
    .run();

  return {
    kind: "workspace_token",
    workspaceId: apiToken.workspace_id,
    user: {
      id: apiToken.user_id,
      email: apiToken.email,
      name: apiToken.user_name,
      status: apiToken.user_status,
    },
  };
}

async function ensureBootstrapIdentity(env) {
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, status, created_at, updated_at)
    VALUES ('user_bootstrap', 'admin@localhost', 'Bootstrap Admin', 'active', ?, ?)
  `).bind(now, now).run();
  await env.DB.prepare(`
    INSERT OR IGNORE INTO team_members (id, team_id, user_id, role, created_at, updated_at)
    SELECT 'member_bootstrap_default', id, 'user_bootstrap', 'owner', ?, ?
    FROM teams
    WHERE id = 'team_default'
  `).bind(now, now).run();
}

async function requireTeamRole(env, userId, teamId, roles) {
  const membership = await env.DB.prepare("SELECT role FROM team_members WHERE user_id = ? AND team_id = ?")
    .bind(userId, teamId)
    .first();
  if (!membership || !roles.includes(membership.role)) throw httpError(403, "Forbidden");
  return membership;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requireFields(input, fields) {
  for (const field of fields) {
    if (!input?.[field]) throw httpError(400, `Missing required field: ${field}`);
  }
}

function normalizeEnum(value, allowed, field) {
  if (!allowed.has(value)) throw httpError(400, `Invalid ${field}: ${value}`);
  return value;
}

function cleanNullable(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim();
  return cleaned ? cleaned : null;
}

function cleanEmail(value) {
  const cleaned = cleanNullable(value);
  return cleaned ? cleaned.toLowerCase() : "";
}

function slugify(value) {
  return String(value || "workspace")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "workspace";
}

function clampInteger(value, min, max, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw httpError(400, `${field} must be an integer between ${min} and ${max}`);
  }
  return number;
}

function normalizeTime(value, field) {
  const time = String(value || "").trim();
  if (!/^\d{2}:\d{2}$/.test(time)) throw httpError(400, `${field} must use HH:mm format`);
  const minutes = timeToMinutes(time);
  if (minutes < 0 || minutes > 23 * 60 + 59) throw httpError(400, `${field} is out of range`);
  return time;
}

function normalizeDate(value, field) {
  const date = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
    throw httpError(400, `${field} must use YYYY-MM-DD format`);
  }
  return date;
}

function addDaysDate(date, days) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function startOfTodayIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function addDaysIso(iso, days) {
  const next = new Date(iso);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function smtpConfigured(env) {
  return Boolean(env.SMTP_HOST && env.SMTP_USERNAME && env.SMTP_PASSWORD);
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), { status, headers: JSON_HEADERS });
}

function csv(body, filename) {
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "access-control-allow-origin": "*",
    },
  });
}

function toCsv(rows, fields) {
  const escapeCell = (value) => {
    const cell = value === undefined || value === null ? "" : String(value);
    return /[",\n\r]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
  };
  return [fields.join(","), ...rows.map((row) => fields.map((field) => escapeCell(row[field])).join(","))].join("\n");
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function formatAddress(name, email) {
  return name ? `"${String(name).replaceAll('"', "'")}" <${email}>` : `<${email}>`;
}

function encodeHeader(value) {
  return String(value).replace(/\r|\n/g, " ");
}

function escapeSmtpBody(value) {
  return String(value).replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}
