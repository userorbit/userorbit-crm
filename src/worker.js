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
const DEFAULT_OPPORTUNITY_STAGES = [
  { key: "research", label: "Research", position: 10, is_won: 0, is_lost: 0 },
  { key: "conversation", label: "Conversation", position: 20, is_won: 0, is_lost: 0 },
  { key: "demo", label: "Demo", position: 30, is_won: 0, is_lost: 0 },
  { key: "proposal", label: "Proposal", position: 40, is_won: 0, is_lost: 0 },
  { key: "won", label: "Won", position: 50, is_won: 1, is_lost: 0 },
  { key: "lost", label: "Lost", position: 60, is_won: 0, is_lost: 1 },
];
const WARMUP_PLAN_STATUSES = new Set(["active", "paused", "cancelled", "completed"]);
const WARMUP_INTERACTIONS = new Set(["inbox", "spam", "not_spam", "reply", "important"]);
const CUSTOM_FIELD_ENTITIES = new Set(["account"]);
const CUSTOM_FIELD_TYPES = new Set(["text", "number", "date", "select", "url"]);
const TEAM_ROLES = new Set(["owner", "admin", "member", "viewer"]);
const WORKSPACE_READ_ROLES = ["owner", "admin", "member", "viewer"];
const WORKSPACE_WRITE_ROLES = ["owner", "admin", "member"];
const WORKSPACE_ADMIN_ROLES = ["owner", "admin"];
const COMMUNICATION_TYPES = new Set(["call", "meeting", "sms", "whatsapp", "note"]);
const COMMUNICATION_DIRECTIONS = new Set(["inbound", "outbound", "internal"]);
const COMMUNICATION_OUTCOMES = new Set(["connected", "left_message", "no_answer", "scheduled", "completed", "cancelled", "positive", "negative", "neutral"]);
const INTEGRATION_TYPES = new Set(["slack"]);
const MESSAGE_CHANNEL_TYPES = new Set(["sms", "whatsapp"]);
const MESSAGE_CHANNEL_PROVIDERS = new Set(["twilio"]);
const EMAIL_INBOUND_SOURCE_PROVIDERS = new Set(["generic", "postmark", "sendgrid", "mailgun"]);
const CALENDAR_SOURCE_TYPES = new Set(["ics_feed"]);

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

      if (request.method === "GET" && url.pathname.startsWith("/t/open/")) {
        return await recordEmailOpen(env, url.pathname.split("/").pop());
      }

      if (request.method === "GET" && url.pathname.startsWith("/t/click/")) {
        return await recordEmailClick(env, url.pathname.split("/").pop(), url.searchParams.get("u"));
      }

      if (url.pathname.startsWith("/forms/")) {
        return await handlePublicLeadForm(request, env, url);
      }

      if (request.method === "POST" && url.pathname.startsWith("/hooks/messages/")) {
        return await handleInboundMessageWebhook(request, env, url);
      }

      if (request.method === "POST" && url.pathname.startsWith("/hooks/email/")) {
        return await handleInboundEmailWebhook(request, env, url);
      }

      if (request.method === "POST" && url.pathname === "/api/auth/login") {
        return json(await loginWithPassword(env, await readJson(request)));
      }

      if (request.method === "GET" && url.pathname === "/api/auth/oauth/start") {
        return await startOAuthLogin(request, env, url);
      }

      if (request.method === "GET" && url.pathname === "/api/auth/oauth/callback") {
        return await completeOAuthLogin(request, env, url);
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

  if (request.method === "POST" && path === "auth/password") {
    return json(await setOwnPassword(env, { ...(await readJson(request)), workspaceId }, auth));
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

  if (request.method === "GET" && path === "team-invitations") {
    return json(await listTeamInvitations(env, workspaceId, auth));
  }

  if (request.method === "POST" && path === "team-invitations") {
    return json(await createTeamInvitation(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "GET" && path === "webhooks") {
    return json(await listWebhooks(env, workspaceId, auth));
  }

  if (request.method === "GET" && path === "integrations") {
    return json(await listIntegrations(env, workspaceId, auth));
  }

  if (request.method === "GET" && path === "message-channels") {
    const access = await requireWorkspaceRole(env, auth.user.id, workspaceId, WORKSPACE_WRITE_ROLES);
    return json(await listMessageChannels(env, workspaceId, ["owner", "admin"].includes(access.role)));
  }

  if (request.method === "GET" && path === "lead-forms") {
    return json(await listLeadForms(env, workspaceId, auth));
  }

  if (request.method === "POST" && path === "lead-forms") {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    return json(await createLeadForm(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "DELETE" && path.startsWith("lead-forms/")) {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    return json(await disableLeadForm(env, path.split("/")[1], workspaceId, auth));
  }

  if (request.method === "GET" && path === "email/settings") {
    return json(await getEmailSettings(env, workspaceId));
  }

  if (request.method === "GET" && path === "email/senders") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await listEmailSenders(env, workspaceId));
  }

  if (request.method === "GET" && path === "email/inbound-sources") {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    return json(await listEmailInboundSources(env, workspaceId, true));
  }

  if (request.method === "PATCH" && path === "email/settings") {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    return json(await updateEmailSettings(env, workspaceId, await readJson(request), auth));
  }

  if (request.method === "POST" && path === "email/senders") {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    return json(await createEmailSender(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "POST" && path === "email/inbound-sources") {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    return json(await createEmailInboundSource(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "DELETE" && path.startsWith("email/senders/")) {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    return json(await disableEmailSender(env, path.split("/")[2], workspaceId, auth));
  }

  if (request.method === "DELETE" && path.startsWith("email/inbound-sources/")) {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    return json(await disableEmailInboundSource(env, path.split("/")[2], workspaceId, auth));
  }

  if (request.method === "POST" && path === "webhooks") {
    return json(await createWebhook(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "DELETE" && path.startsWith("webhooks/")) {
    return json(await disableWebhook(env, path.split("/")[1], workspaceId, auth));
  }

  if (request.method === "POST" && path === "integrations") {
    return json(await createIntegration(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "DELETE" && path.startsWith("integrations/")) {
    return json(await disableIntegration(env, path.split("/")[1], workspaceId, auth));
  }

  if (request.method === "POST" && path === "message-channels") {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    return json(await createMessageChannel(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "DELETE" && path.startsWith("message-channels/")) {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    return json(await disableMessageChannel(env, path.split("/")[1], workspaceId, auth));
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
    return json(await getReports(env, workspaceId, auth));
  }

  if (request.method === "GET" && path === "saved-views") {
    return json(await listSavedViews(env, workspaceId, auth, url));
  }

  if (request.method === "GET" && path === "custom-fields") {
    return json(await listCustomFields(env, workspaceId, url, auth));
  }

  if (request.method === "POST" && path === "custom-fields") {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    return json(await createCustomField(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "DELETE" && path.startsWith("custom-fields/")) {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    return json(await deleteCustomField(env, path.split("/")[1], workspaceId, auth));
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

  if (request.method === "GET" && path === "duplicates/accounts") {
    return json(await listAccountDuplicates(env, workspaceId));
  }

  if (request.method === "POST" && path === "import/accounts.csv") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    const contentType = request.headers.get("content-type") || "";
    const input = contentType.includes("application/json") ? await readJson(request) : await request.text();
    return json(await importAccountsCsv(env, workspaceId, input, auth), 201);
  }

  if (request.method === "GET" && path === "accounts") {
    return json(await listAccounts(env, url, workspaceId, auth));
  }

  if (request.method === "POST" && path.startsWith("accounts/") && path.endsWith("/merge")) {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await mergeAccount(env, path.split("/")[1], { ...(await readJson(request)), workspaceId }, auth));
  }

  if (request.method === "GET" && path.startsWith("accounts/")) {
    return json(await getAccount(env, path.split("/")[1], workspaceId, auth));
  }

  if (request.method === "POST" && path.startsWith("accounts/") && path.endsWith("/ai-insights")) {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await createAiInsight(env, { entity: "account", entityId: path.split("/")[1], workspaceId }, auth), 201);
  }

  if (request.method === "POST" && path === "accounts") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await createAccount(env, { ...(await readJson(request)), workspaceId, auth, auditUserId: auth.user.id }), 201);
  }

  if (request.method === "PATCH" && path.startsWith("accounts/")) {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await updateAccount(env, path.split("/")[1], { ...(await readJson(request)), workspaceId, auth, auditUserId: auth.user.id }));
  }

  if (request.method === "POST" && path === "contacts") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await createContact(env, { ...(await readJson(request)), workspaceId, auditUserId: auth.user.id }), 201);
  }

  if (request.method === "POST" && path.startsWith("contacts/") && path.endsWith("/reply")) {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await markContactReplied(env, path.split("/")[1], workspaceId, auth));
  }

  if (request.method === "POST" && path.startsWith("contacts/") && path.endsWith("/unsubscribe")) {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await unsubscribeContact(env, path.split("/")[1], workspaceId, auth));
  }

  if (request.method === "GET" && path.startsWith("contacts/")) {
    return json(await getContact(env, path.split("/")[1], workspaceId));
  }

  if (request.method === "POST" && path.startsWith("contacts/") && path.endsWith("/ai-insights")) {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await createAiInsight(env, { entity: "contact", entityId: path.split("/")[1], workspaceId }, auth), 201);
  }

  if (request.method === "POST" && path === "opportunities") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await createOpportunity(env, { ...(await readJson(request)), workspaceId, auditUserId: auth.user.id }), 201);
  }

  if (request.method === "GET" && path === "opportunities") {
    return json(await listOpportunities(env, workspaceId));
  }

  if (request.method === "PATCH" && path.startsWith("opportunities/")) {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await updateOpportunity(env, path.split("/")[1], { ...(await readJson(request)), workspaceId, auditUserId: auth.user.id }));
  }

  if (request.method === "GET" && path === "opportunity-stages") {
    return json(await listOpportunityStages(env, workspaceId));
  }

  if (request.method === "POST" && path === "opportunity-stages") {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    return json(await createOpportunityStage(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "GET" && path === "tasks") {
    return json(await listTasks(env, workspaceId));
  }

  if (request.method === "POST" && path === "tasks") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await createTask(env, { ...(await readJson(request)), workspaceId, auditUserId: auth.user.id }), 201);
  }

  if (request.method === "GET" && path === "communications") {
    return json(await listCommunications(env, workspaceId));
  }

  if (request.method === "POST" && path === "communications") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await createCommunication(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "POST" && path === "messages/send") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await sendProviderMessage(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "GET" && path === "calendar/events") {
    return json(await listCalendarEvents(env, workspaceId));
  }

  if (request.method === "GET" && path === "calendar/sources") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await listCalendarSources(env, workspaceId));
  }

  if (request.method === "POST" && path === "calendar/events") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await createCalendarEvent(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "POST" && path === "calendar/sources") {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    return json(await createCalendarSource(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "POST" && path.startsWith("calendar/sources/") && path.endsWith("/run")) {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await syncCalendarSource(env, path.split("/")[2], workspaceId, auth), 201);
  }

  if (request.method === "DELETE" && path.startsWith("calendar/sources/")) {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    return json(await disableCalendarSource(env, path.split("/")[2], workspaceId, auth));
  }

  if (request.method === "POST" && path === "calendar/import.ics") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await importCalendarIcs(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "PATCH" && path.startsWith("tasks/")) {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await updateTask(env, path.split("/")[1], { ...(await readJson(request)), workspaceId, auditUserId: auth.user.id }));
  }

  if (request.method === "GET" && path === "sequences") {
    return json(await listSequences(env));
  }

  if (request.method === "POST" && path === "enrollments") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await enrollContact(env, { ...(await readJson(request)), workspaceId, auditUserId: auth.user.id }), 201);
  }

  if (request.method === "POST" && path === "email/send") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await sendManualEmail(env, { ...(await readJson(request)), workspaceId, baseUrl: url.origin, auditUserId: auth.user.id }), 201);
  }

  if (request.method === "POST" && path === "email/inbound") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await recordInboundEmail(env, { ...(await readJson(request)), workspaceId }, auth), 201);
  }

  if (request.method === "POST" && path === "sequence/run") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await processDueSequenceEmails(env, { limit: 20 }));
  }

  if (request.method === "GET" && path === "warmup") {
    return json(await getWarmupOverview(env));
  }

  if (request.method === "POST" && path === "warmup/mailboxes") {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    const mailbox = await upsertWarmupMailbox(env, await readJson(request));
    await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "warmup_mailbox.upsert", resource: "warmup_mailbox", resourceId: mailbox.id, metadata: { email: mailbox.email, status: mailbox.status } });
    return json(mailbox, 201);
  }

  if (request.method === "POST" && path === "warmup/plans") {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    const plan = await createWarmupPlan(env, await readJson(request));
    await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "warmup_plan.create", resource: "warmup_plan", resourceId: plan.id, metadata: { mailboxId: plan.mailbox_id, startsOn: plan.starts_on, endsOn: plan.ends_on } });
    return json(plan, 201);
  }

  if (request.method === "PATCH" && path.startsWith("warmup/plans/")) {
    await requireWorkspaceAdmin(env, auth, workspaceId);
    const plan = await updateWarmupPlan(env, path.split("/")[2], await readJson(request));
    await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "warmup_plan.update", resource: "warmup_plan", resourceId: plan.id, metadata: { status: plan.status } });
    return json(plan);
  }

  if (request.method === "POST" && path === "warmup/run") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    const input = await readJson(request);
    return json(await processDueWarmupEmails(env, { limit: input.limit || 1 }));
  }

  if (request.method === "POST" && path.startsWith("warmup/messages/") && path.endsWith("/interaction")) {
    await requireWorkspaceWrite(env, auth, workspaceId);
    const interaction = await recordWarmupInteraction(env, path.split("/")[2], await readJson(request));
    await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "warmup_interaction.create", resource: "warmup_interaction", resourceId: interaction.id, metadata: { messageId: interaction.message_id, kind: interaction.kind } });
    return json(interaction, 201);
  }

  if (request.method === "POST" && path === "agent/command") {
    await requireWorkspaceWrite(env, auth, workspaceId);
    return json(await runAgentCommand(env, { ...(await readJson(request)), workspaceId }, auth));
  }

  return json({ error: "Not found" }, 404);
}

async function getSummary(env, workspaceId) {
  const closedStages = await getClosedOpportunityStages(env, workspaceId);
  const [accounts, contacts, activeEnrollments, dueTasks, openPipeline] = await Promise.all([
    scalar(env, "SELECT COUNT(*) FROM accounts WHERE workspace_id = ?", workspaceId),
    scalar(env, "SELECT COUNT(*) FROM contacts c JOIN accounts a ON a.id = c.account_id WHERE a.workspace_id = ?", workspaceId),
    scalar(env, "SELECT COUNT(*) FROM sequence_enrollments se JOIN contacts c ON c.id = se.contact_id JOIN accounts a ON a.id = c.account_id WHERE se.status = 'active' AND a.workspace_id = ?", workspaceId),
    scalar(env, "SELECT COUNT(*) FROM tasks WHERE status = 'open' AND workspace_id = ?", workspaceId),
    scalar(env, `SELECT COALESCE(SUM(value_cents), 0) FROM opportunities WHERE ${stageNotInClause(closedStages)} AND workspace_id = ?`, ...closedStages, workspaceId),
  ]);

  return { accounts, contacts, activeEnrollments, dueTasks, openPipelineCents: openPipeline };
}

async function getReports(env, workspaceId, auth) {
  const closedStages = await getClosedOpportunityStages(env, workspaceId);
  const [pipeline, forecast, accountStatus, taskStatus, sequencePerformance, activity, stalledOpportunities, ownerPerformance, sourceConversion, customFieldBreakdowns] = await Promise.all([
    env.DB.prepare(`
      SELECT o.stage, COALESCE(os.label, o.stage) AS stage_label, COUNT(*) AS opportunities, COALESCE(SUM(o.value_cents), 0) AS value_cents, AVG(o.confidence) AS avg_confidence
      FROM opportunities o
      LEFT JOIN opportunity_stages os ON os.workspace_id = o.workspace_id AND os.key = o.stage
      WHERE o.workspace_id = ?
      GROUP BY o.stage
      ORDER BY COALESCE(os.position, 999), o.stage
    `).bind(workspaceId).all(),
    env.DB.prepare(`
      SELECT
        COALESCE(substr(close_date, 1, 7), 'No close date') AS period,
        COUNT(*) AS opportunities,
        COALESCE(SUM(value_cents), 0) AS value_cents,
        COALESCE(SUM(value_cents * confidence / 100), 0) AS weighted_value_cents,
        AVG(confidence) AS avg_confidence
      FROM opportunities
      WHERE workspace_id = ? AND ${stageNotInClause(closedStages)}
      GROUP BY period
      ORDER BY CASE WHEN period = 'No close date' THEN 1 ELSE 0 END, period ASC
    `).bind(workspaceId, ...closedStages).all(),
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
        SUM(CASE WHEN ee.status = 'failed' THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN ee.open_count > 0 THEN 1 ELSE 0 END) AS opened,
        SUM(CASE WHEN ee.click_count > 0 THEN 1 ELSE 0 END) AS clicked
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
        SUM(open_count) AS opens,
        SUM(click_count) AS clicks,
        SUM(CASE WHEN open_count > 0 THEN 1 ELSE 0 END) AS opened_emails,
        SUM(CASE WHEN click_count > 0 THEN 1 ELSE 0 END) AS clicked_emails,
        MAX(created_at) AS last_activity_at
      FROM email_events
      WHERE account_id IN (SELECT id FROM accounts WHERE workspace_id = ?)
    `).bind(workspaceId).first(),
    env.DB.prepare(`
      SELECT o.*, a.name AS account_name, MAX(ee.created_at) AS last_activity_at
      FROM opportunities o
      JOIN accounts a ON a.id = o.account_id
      LEFT JOIN email_events ee ON ee.account_id = a.id
      WHERE o.workspace_id = ? AND ${stageNotInClause(closedStages, "o.stage")}
      GROUP BY o.id
      HAVING last_activity_at IS NULL OR last_activity_at < datetime('now', '-14 days')
      ORDER BY COALESCE(last_activity_at, o.created_at) ASC
      LIMIT 20
    `).bind(workspaceId, ...closedStages).all(),
    env.DB.prepare(`
      WITH account_metrics AS (
        SELECT
          a.id,
          COALESCE(NULLIF(a.owner, ''), 'Unassigned') AS owner,
          (SELECT COUNT(*) FROM contacts c WHERE c.account_id = a.id) AS contacts,
          (SELECT COUNT(*) FROM tasks t WHERE t.account_id = a.id AND t.workspace_id = ?) AS tasks,
          (SELECT COUNT(*) FROM tasks t WHERE t.account_id = a.id AND t.workspace_id = ? AND t.status != 'done') AS open_tasks,
          (SELECT COUNT(*) FROM email_events ee WHERE ee.account_id = a.id) AS emails,
          (SELECT COALESCE(SUM(open_count), 0) FROM email_events ee WHERE ee.account_id = a.id) AS opens,
          (SELECT COALESCE(SUM(click_count), 0) FROM email_events ee WHERE ee.account_id = a.id) AS clicks,
          (SELECT COUNT(*) FROM opportunities o WHERE o.account_id = a.id AND o.workspace_id = ?) AS opportunities,
          (
            SELECT COALESCE(SUM(o.value_cents), 0)
            FROM opportunities o
            LEFT JOIN opportunity_stages os ON os.workspace_id = o.workspace_id AND os.key = o.stage
            WHERE o.account_id = a.id
              AND o.workspace_id = ?
              AND COALESCE(os.is_won, CASE WHEN o.stage = 'won' THEN 1 ELSE 0 END) = 0
              AND COALESCE(os.is_lost, CASE WHEN o.stage = 'lost' THEN 1 ELSE 0 END) = 0
          ) AS open_pipeline_cents,
          (
            SELECT COALESCE(SUM(o.value_cents), 0)
            FROM opportunities o
            LEFT JOIN opportunity_stages os ON os.workspace_id = o.workspace_id AND os.key = o.stage
            WHERE o.account_id = a.id
              AND o.workspace_id = ?
              AND COALESCE(os.is_won, CASE WHEN o.stage = 'won' THEN 1 ELSE 0 END) = 1
          ) AS won_value_cents,
          (
            SELECT COUNT(*)
            FROM opportunities o
            LEFT JOIN opportunity_stages os ON os.workspace_id = o.workspace_id AND os.key = o.stage
            WHERE o.account_id = a.id
              AND o.workspace_id = ?
              AND COALESCE(os.is_lost, CASE WHEN o.stage = 'lost' THEN 1 ELSE 0 END) = 1
          ) AS lost_opportunities
        FROM accounts a
        WHERE a.workspace_id = ?
      )
      SELECT
        owner,
        COUNT(*) AS accounts,
        SUM(contacts) AS contacts,
        SUM(tasks) AS tasks,
        SUM(open_tasks) AS open_tasks,
        SUM(emails) AS emails,
        SUM(opens) AS opens,
        SUM(clicks) AS clicks,
        SUM(opportunities) AS opportunities,
        SUM(open_pipeline_cents) AS open_pipeline_cents,
        SUM(won_value_cents) AS won_value_cents,
        SUM(lost_opportunities) AS lost_opportunities
      FROM account_metrics
      GROUP BY owner
      ORDER BY won_value_cents DESC, open_pipeline_cents DESC, accounts DESC
    `).bind(workspaceId, workspaceId, workspaceId, workspaceId, workspaceId, workspaceId, workspaceId).all(),
    env.DB.prepare(`
      WITH account_metrics AS (
        SELECT
          a.id,
          COALESCE(NULLIF(a.source, ''), 'Unknown') AS source,
          a.status,
          (SELECT COUNT(*) FROM email_events ee WHERE ee.account_id = a.id) AS emails,
          (SELECT COUNT(*) FROM opportunities o WHERE o.account_id = a.id AND o.workspace_id = ?) AS opportunities,
          (
            SELECT COUNT(*)
            FROM opportunities o
            LEFT JOIN opportunity_stages os ON os.workspace_id = o.workspace_id AND os.key = o.stage
            WHERE o.account_id = a.id
              AND o.workspace_id = ?
              AND COALESCE(os.is_won, CASE WHEN o.stage = 'won' THEN 1 ELSE 0 END) = 1
          ) AS won_opportunities,
          (
            SELECT COUNT(*)
            FROM opportunities o
            LEFT JOIN opportunity_stages os ON os.workspace_id = o.workspace_id AND os.key = o.stage
            WHERE o.account_id = a.id
              AND o.workspace_id = ?
              AND COALESCE(os.is_lost, CASE WHEN o.stage = 'lost' THEN 1 ELSE 0 END) = 1
          ) AS lost_opportunities,
          (
            SELECT COALESCE(SUM(o.value_cents), 0)
            FROM opportunities o
            LEFT JOIN opportunity_stages os ON os.workspace_id = o.workspace_id AND os.key = o.stage
            WHERE o.account_id = a.id
              AND o.workspace_id = ?
              AND COALESCE(os.is_won, CASE WHEN o.stage = 'won' THEN 1 ELSE 0 END) = 1
          ) AS won_value_cents
        FROM accounts a
        WHERE a.workspace_id = ?
      )
      SELECT
        source,
        COUNT(*) AS accounts,
        SUM(CASE WHEN emails > 0 OR status IN ('contacted', 'replied', 'qualified') THEN 1 ELSE 0 END) AS contacted_accounts,
        SUM(CASE WHEN status IN ('replied', 'qualified') THEN 1 ELSE 0 END) AS replied_accounts,
        SUM(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END) AS qualified_accounts,
        SUM(opportunities) AS opportunities,
        SUM(won_opportunities) AS won_opportunities,
        SUM(lost_opportunities) AS lost_opportunities,
        SUM(won_value_cents) AS won_value_cents
      FROM account_metrics
      GROUP BY source
      ORDER BY won_value_cents DESC, qualified_accounts DESC, accounts DESC
      LIMIT 20
    `).bind(workspaceId, workspaceId, workspaceId, workspaceId, workspaceId).all(),
    getCustomFieldBreakdowns(env, workspaceId, auth),
  ]);

  return {
    pipeline: pipeline.results,
    forecast: forecast.results,
    accountStatus: accountStatus.results,
    taskStatus: taskStatus.results,
    sequencePerformance: sequencePerformance.results,
    activity,
    stalledOpportunities: stalledOpportunities.results,
    ownerPerformance: ownerPerformance.results,
    sourceConversion: sourceConversion.results,
    customFieldBreakdowns,
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

async function listAccountDuplicates(env, workspaceId) {
  const [domainRows, nameRows] = await Promise.all([
    env.DB.prepare(`
      SELECT lower(domain) AS key, id, name, domain, updated_at
      FROM accounts
      WHERE workspace_id = ?
        AND domain IS NOT NULL
        AND trim(domain) != ''
        AND lower(domain) IN (
          SELECT lower(domain)
          FROM accounts
          WHERE workspace_id = ? AND domain IS NOT NULL AND trim(domain) != ''
          GROUP BY lower(domain)
          HAVING COUNT(*) > 1
        )
      ORDER BY key ASC, updated_at DESC
    `).bind(workspaceId, workspaceId).all(),
    env.DB.prepare(`
      SELECT lower(name) AS key, id, name, domain, updated_at
      FROM accounts
      WHERE workspace_id = ?
        AND lower(name) IN (
          SELECT lower(name)
          FROM accounts
          WHERE workspace_id = ?
          GROUP BY lower(name)
          HAVING COUNT(*) > 1
        )
      ORDER BY key ASC, updated_at DESC
    `).bind(workspaceId, workspaceId).all(),
  ]);
  return { domains: groupDuplicateAccounts(domainRows.results), names: groupDuplicateAccounts(nameRows.results) };
}

function groupDuplicateAccounts(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.key)) groups.set(row.key, []);
    groups.get(row.key).push({ id: row.id, name: row.name, domain: row.domain, updatedAt: row.updated_at });
  }
  return [...groups.entries()]
    .map(([key, items]) => ({ key, accounts: items.length, names: items.map((item) => item.name).join(", "), items }))
    .filter((group) => group.accounts > 1)
    .slice(0, 25);
}

async function importAccountsCsv(env, workspaceId, input, auth = null) {
  const body = typeof input === "string" ? input : input.csv;
  const mapping = normalizeImportMapping(typeof input === "string" ? {} : input.mapping || {});
  const rows = parseCsv(body);
  if (!rows.length) throw httpError(400, "CSV must include a header row and at least one account row");
  const results = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    try {
      const customFields = mappedCustomFields(row, mapping);
      const name = readMapped(row, mapping, "name", ["name", "account", "account_name", "company", "company_name"]);
      if (!name) throw new Error("Missing account name");
      const domain = readMapped(row, mapping, "domain", ["domain", "website", "url", "account_domain", "company_domain"]);
      const contactName = readMapped(row, mapping, "contactName", ["contact_name", "contact", "name_contact", "person", "lead_name"]);
      const contactEmail = cleanEmail(readMapped(row, mapping, "contactEmail", ["contact_email", "email", "person_email", "lead_email"]));
      const contactTitle = readMapped(row, mapping, "contactTitle", ["contact_title", "title", "job_title", "role"]);
      const contactPhone = readMapped(row, mapping, "contactPhone", ["contact_phone", "phone", "mobile", "phone_number"]);
      const existing = await findImportAccountMatch(env, workspaceId, { name, domain });
      if (existing) {
        if (Object.keys(customFields).length) await upsertCustomFieldValues(env, workspaceId, "account", existing.id, customFields, auth);
        const contact = contactName && contactEmail ? await createImportContactIfMissing(env, workspaceId, existing.id, { name: contactName, email: contactEmail, title: contactTitle, phone: contactPhone }) : null;
        results.push({ row: index + 2, ok: true, action: "matched", accountId: existing.id, name: existing.name, contact: contact ? contact.action : "none" });
      } else {
        const account = await createAccount(env, {
          workspaceId,
          auth,
          name,
          domain,
          segment: readMapped(row, mapping, "segment", ["segment"]),
          status: readMapped(row, mapping, "status", ["status"]),
          source: readMapped(row, mapping, "source", ["source"]) || "CSV import",
          owner: readMapped(row, mapping, "owner", ["owner"]),
          observation: readMapped(row, mapping, "observation", ["observation", "notes", "description"]),
          customFields,
          contacts: contactName && contactEmail ? [{ name: contactName, email: contactEmail, title: contactTitle, phone: contactPhone }] : [],
        });
        results.push({ row: index + 2, ok: true, action: "created", accountId: account.id, name: account.name });
      }
    } catch (error) {
      results.push({ row: index + 2, ok: false, error: error.message || String(error) });
    }
  }
  const summary = {
    imported: results.filter((result) => result.action === "created").length,
    matched: results.filter((result) => result.action === "matched").length,
    failed: results.filter((result) => !result.ok).length,
    results,
  };
  if (auth?.user?.id) {
    await recordAuditLog(env, {
      workspaceId,
      userId: auth.user.id,
      action: "account.import",
      resource: "account",
      resourceId: null,
      metadata: { imported: summary.imported, matched: summary.matched, failed: summary.failed, rows: results.length },
    });
  }
  return summary;
}

function normalizeImportMapping(mapping) {
  const normalized = {};
  const customFields = {};
  for (const [key, value] of Object.entries(mapping || {})) {
    if (key === "customFields" && value && typeof value === "object" && !Array.isArray(value)) {
      for (const [fieldKey, header] of Object.entries(value)) {
        const cleanHeader = normalizeImportHeader(header);
        if (cleanHeader) customFields[slugify(fieldKey).replaceAll("-", "_")] = cleanHeader;
      }
    } else {
      const cleanHeader = normalizeImportHeader(value);
      if (cleanHeader) normalized[key] = cleanHeader;
    }
  }
  return { ...normalized, customFields };
}

function normalizeImportHeader(value) {
  const cleaned = cleanNullable(value);
  return cleaned ? slugify(cleaned).replaceAll("-", "_") : "";
}

function readMapped(row, mapping, field, aliases) {
  const mapped = mapping[field];
  if (mapped && row[mapped] !== undefined) return cleanNullable(row[mapped]) || "";
  for (const alias of aliases) {
    if (row[alias] !== undefined) return cleanNullable(row[alias]) || "";
  }
  return "";
}

function mappedCustomFields(row, mapping) {
  const values = {};
  for (const [fieldKey, header] of Object.entries(mapping.customFields || {})) {
    const value = cleanNullable(row[header]);
    if (value) values[fieldKey] = value;
  }
  for (const [header, value] of Object.entries(row)) {
    if (header.startsWith("cf_") && cleanNullable(value)) values[header.slice(3)] = value;
  }
  return values;
}

async function findImportAccountMatch(env, workspaceId, input) {
  const domain = cleanDomain(input.domain);
  if (domain) {
    const byDomain = await env.DB.prepare("SELECT * FROM accounts WHERE workspace_id = ? AND lower(domain) = ? ORDER BY updated_at DESC LIMIT 1")
      .bind(workspaceId, domain)
      .first();
    if (byDomain) return byDomain;
  }
  return env.DB.prepare("SELECT * FROM accounts WHERE workspace_id = ? AND lower(name) = lower(?) ORDER BY updated_at DESC LIMIT 1")
    .bind(workspaceId, input.name)
    .first();
}

async function createImportContactIfMissing(env, workspaceId, accountId, input) {
  const email = cleanEmail(input.email);
  const existing = await env.DB.prepare("SELECT id, account_id FROM contacts WHERE email = ?").bind(email).first();
  if (existing) return { action: existing.account_id === accountId ? "existing" : "email_conflict", id: existing.id };
  const created = await createContact(env, { workspaceId, accountId, name: input.name, email, title: input.title, phone: input.phone });
  return { action: "created", id: created.id };
}

function parseCsv(input) {
  const text = String(input || "").replace(/^\uFEFF/, "").trim();
  if (!text) return [];
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  record.push(field);
  records.push(record);
  const headers = records.shift().map((header) => slugify(header).replaceAll("-", "_"));
  return records
    .filter((row) => row.some((value) => cleanNullable(value)))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, cleanNullable(row[index]) || ""])));
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

async function listLeadForms(env, workspaceId, auth) {
  await requireWorkspaceAdmin(env, auth, workspaceId);
  const rows = await env.DB.prepare(`
    SELECT lf.*, COUNT(lfs.id) AS submissions
    FROM lead_forms lf
    LEFT JOIN lead_form_submissions lfs ON lfs.form_id = lf.id
    WHERE lf.workspace_id = ?
    GROUP BY lf.id
    ORDER BY lf.created_at DESC
  `).bind(workspaceId).all();
  return rows.results;
}

async function createLeadForm(env, input, auth) {
  requireFields(input, ["name"]);
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  const slug = await uniqueLeadFormSlug(env, input.workspaceId, input.slug || input.name);
  const publicKey = crypto.randomUUID().replaceAll("-", "");
  const segment = normalizeEnum(input.defaultSegment || input.default_segment || "growth", SEGMENTS, "defaultSegment");
  const status = normalizeEnum(input.defaultStatus || input.default_status || "target", ACCOUNT_STATUSES, "defaultStatus");
  await env.DB.prepare(`
    INSERT INTO lead_forms (id, workspace_id, created_by_user_id, name, slug, public_key, source, default_owner, default_segment, default_status, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).bind(
    id,
    input.workspaceId,
    auth.user.id,
    input.name.trim(),
    slug,
    publicKey,
    cleanNullable(input.source),
    cleanNullable(input.defaultOwner || input.default_owner),
    segment,
    status,
    now,
    now,
  ).run();
  await recordAuditLog(env, { workspaceId: input.workspaceId, userId: auth.user.id, action: "lead_form.create", resource: "lead_form", resourceId: id, metadata: { name: input.name, slug } });
  return getRequired(env, "SELECT * FROM lead_forms WHERE id = ? AND workspace_id = ?", id, input.workspaceId);
}

async function disableLeadForm(env, id, workspaceId, auth) {
  const existing = await getRequired(env, "SELECT * FROM lead_forms WHERE id = ? AND workspace_id = ?", id, workspaceId);
  await env.DB.prepare("UPDATE lead_forms SET status = 'disabled', updated_at = ? WHERE id = ? AND workspace_id = ?")
    .bind(new Date().toISOString(), id, workspaceId)
    .run();
  await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "lead_form.disable", resource: "lead_form", resourceId: id, metadata: { name: existing.name } });
  return { ok: true };
}

async function uniqueLeadFormSlug(env, workspaceId, value) {
  const base = slugify(value || "lead-form");
  let candidate = base;
  for (let index = 2; index < 100; index += 1) {
    const existing = await env.DB.prepare("SELECT id FROM lead_forms WHERE workspace_id = ? AND slug = ?").bind(workspaceId, candidate).first();
    if (!existing) return candidate;
    candidate = `${base}-${index}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
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

async function listCustomFields(env, workspaceId, url, auth = null) {
  const entity = url.searchParams.get("entity") || "account";
  if (!CUSTOM_FIELD_ENTITIES.has(entity)) throw httpError(400, "Unsupported custom field entity");
  const role = auth ? await getEffectiveWorkspaceRole(env, auth.user.id, workspaceId) : "owner";
  const rows = await env.DB.prepare(`
    SELECT * FROM custom_fields
    WHERE workspace_id = ? AND entity = ?
    ORDER BY created_at ASC
  `).bind(workspaceId, entity).all();
  return rows.results
    .filter((row) => canReadCustomField(row, role))
    .map(customFieldResponse);
}

async function createCustomField(env, input, auth = null) {
  requireFields(input, ["name"]);
  const entity = input.entity || "account";
  if (!CUSTOM_FIELD_ENTITIES.has(entity)) throw httpError(400, "Unsupported custom field entity");
  const type = input.type || "text";
  if (!CUSTOM_FIELD_TYPES.has(type)) throw httpError(400, "Unsupported custom field type");
  const key = slugify(input.key || input.name).replaceAll("-", "_");
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  const options = Array.isArray(input.options) ? input.options.map((option) => String(option).trim()).filter(Boolean) : [];
  const readRoles = normalizeRoleList(input.readRoles || input.read_roles, WORKSPACE_READ_ROLES);
  const writeRoles = normalizeRoleList(input.writeRoles || input.write_roles, WORKSPACE_WRITE_ROLES);
  await env.DB.prepare(`
    INSERT INTO custom_fields (id, workspace_id, entity, name, key, type, options_json, read_roles_json, write_roles_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, input.workspaceId, entity, input.name.trim(), key, type, options.length ? JSON.stringify(options) : null, JSON.stringify(readRoles), JSON.stringify(writeRoles), now, now).run();
  await recordAuditLog(env, { workspaceId: input.workspaceId, userId: auth?.user?.id || null, action: "custom_field.create", resource: "custom_field", resourceId: id, metadata: { entity, key, type, readRoles, writeRoles } });
  return customFieldResponse(await getRequired(env, "SELECT * FROM custom_fields WHERE id = ?", id));
}

async function deleteCustomField(env, id, workspaceId, auth = null) {
  const existing = await getRequired(env, "SELECT * FROM custom_fields WHERE id = ? AND workspace_id = ?", id, workspaceId);
  await env.DB.prepare("DELETE FROM custom_fields WHERE id = ? AND workspace_id = ?").bind(id, workspaceId).run();
  await recordAuditLog(env, { workspaceId, userId: auth?.user?.id || null, action: "custom_field.delete", resource: "custom_field", resourceId: id, metadata: { entity: existing.entity, key: existing.key, name: existing.name } });
  return { ok: true };
}

async function getCustomFieldBreakdowns(env, workspaceId, auth = null) {
  const role = auth ? await getEffectiveWorkspaceRole(env, auth.user.id, workspaceId) : "owner";
  const rows = await env.DB.prepare(`
    SELECT
      cf.id,
      cf.name,
      cf.key,
      cf.type,
      cf.read_roles_json,
      cf.write_roles_json,
      COALESCE(NULLIF(cfv.value, ''), 'Not set') AS value,
      COUNT(DISTINCT a.id) AS accounts
    FROM custom_fields cf
    JOIN accounts a ON a.workspace_id = cf.workspace_id
    LEFT JOIN custom_field_values cfv ON cfv.field_id = cf.id AND cfv.entity_id = a.id
    WHERE cf.workspace_id = ? AND cf.entity = 'account'
    GROUP BY cf.id, cf.read_roles_json, cf.write_roles_json, value
    ORDER BY cf.created_at ASC, accounts DESC, value ASC
  `).bind(workspaceId).all();
  const byField = new Map();
  for (const row of rows.results) {
    if (!canReadCustomField(row, role)) continue;
    if (!byField.has(row.id)) {
      byField.set(row.id, { id: row.id, name: row.name, key: row.key, type: row.type, values: [] });
    }
    byField.get(row.id).values.push({ value: row.value, accounts: row.accounts });
  }
  return [...byField.values()];
}

async function listAccounts(env, url, workspaceId, auth) {
  const filters = await resolveAccountFilters(env, url, workspaceId, auth);
  await assertReadableCustomFieldFilters(env, workspaceId, filters.customFields || {}, auth);
  const search = `%${filters.q || ""}%`;
  const segment = filters.segment;
  const status = filters.status;
  const customFields = filters.customFields || {};
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
  for (const [key, value] of Object.entries(customFields)) {
    where += ` AND EXISTS (
      SELECT 1
      FROM custom_fields cf
      JOIN custom_field_values cfv ON cfv.field_id = cf.id
      WHERE cf.workspace_id = a.workspace_id
        AND cf.entity = 'account'
        AND cf.key = ?
        AND cfv.entity_id = a.id
        AND cfv.value = ?
    )`;
    params.push(key, value);
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
    customFields: Object.fromEntries([...url.searchParams.entries()]
      .filter(([key, value]) => key.startsWith("cf_") && cleanNullable(value))
      .map(([key, value]) => [key.slice(3), cleanNullable(value)])),
  });
}

async function assertReadableCustomFieldFilters(env, workspaceId, customFields, auth) {
  const keys = Object.keys(customFields || {});
  if (!keys.length) return;
  const role = await getEffectiveWorkspaceRole(env, auth.user.id, workspaceId);
  const rows = await env.DB.prepare(`
    SELECT * FROM custom_fields
    WHERE workspace_id = ? AND entity = 'account'
  `).bind(workspaceId).all();
  const byKey = new Map(rows.results.map((field) => [field.key, field]));
  for (const key of keys) {
    const field = byKey.get(key);
    if (!field || !canReadCustomField(field, role)) throw httpError(403, `Cannot filter by restricted custom field: ${key}`);
  }
}

function normalizeAccountFilters(input = {}) {
  const customFields = {};
  if (input.customFields && typeof input.customFields === "object" && !Array.isArray(input.customFields)) {
    for (const [key, value] of Object.entries(input.customFields)) {
      const cleanKey = slugify(key).replaceAll("-", "_");
      const cleanValue = cleanNullable(value);
      if (cleanKey && cleanValue) customFields[cleanKey] = cleanValue;
    }
  }
  return {
    q: cleanNullable(input.q) || "",
    segment: SEGMENTS.has(input.segment) ? input.segment : "",
    status: ACCOUNT_STATUSES.has(input.status) ? input.status : "",
    customFields,
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

function normalizeEmailList(value) {
  const items = Array.isArray(value) ? value : String(value || "").split(/[\n,;]/);
  return [...new Set(items.map((item) => cleanEmail(item)).filter(Boolean))];
}

function parseIcsEvents(ics) {
  const lines = unfoldIcsLines(String(ics || ""));
  const events = [];
  let current = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) {
        events.push({
          uid: current.UID,
          summary: current.SUMMARY,
          description: current.DESCRIPTION,
          location: current.LOCATION,
          url: current.URL,
          attendeeEmails: current.ATTENDEE || [],
          startsAt: current.DTSTART ? parseIcsDateTime(current.DTSTART) : null,
          endsAt: current.DTEND ? parseIcsDateTime(current.DTEND) : null,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const rawName = line.slice(0, separator);
    const name = rawName.split(";")[0].toUpperCase();
    const value = unescapeIcsText(line.slice(separator + 1));
    if (name === "ATTENDEE") {
      current.ATTENDEE = [...(current.ATTENDEE || []), value.replace(/^mailto:/i, "")];
    } else if (!current[name]) {
      current[name] = value;
    }
  }
  return events.filter((event) => event.startsAt);
}

function unfoldIcsLines(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const unfolded = [];
  for (const line of lines) {
    if (/^[ \t]/.test(line) && unfolded.length) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else if (line.trim()) {
      unfolded.push(line.trim());
    }
  }
  return unfolded;
}

function parseIcsDateTime(value) {
  const raw = String(value || "").trim();
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T00:00:00.000Z`;
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!match) throw httpError(400, `Invalid ICS datetime: ${raw}`);
  const iso = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}${match[7] || "Z"}`;
  return new Date(iso).toISOString();
}

function unescapeIcsText(value) {
  return String(value || "")
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

async function createAccount(env, input) {
  requireFields(input, ["name"]);
  const workspaceId = input.workspaceId || (await resolveDefaultWorkspaceId(env));
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  const segment = normalizeEnum(input.segment || "product", SEGMENTS, "segment");
  const status = normalizeEnum(input.status || "target", ACCOUNT_STATUSES, "status");
  if (input.customFields && typeof input.customFields === "object") {
    await assertWritableCustomFieldValues(env, workspaceId, "account", input.customFields, input.auth);
  }

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
      await createContact(env, { ...contact, workspaceId, accountId: id, auditUserId: input.auditUserId });
    }
  }

  if (input.customFields && typeof input.customFields === "object") {
    await upsertCustomFieldValues(env, workspaceId, "account", id, input.customFields, input.auth);
  }

  const account = await getAccount(env, id, workspaceId, input.auth);
  if (input.auditUserId) {
    await recordAuditLog(env, { workspaceId, userId: input.auditUserId, action: "account.create", resource: "account", resourceId: account.id, metadata: { name: account.name, source: account.source, contacts: Array.isArray(input.contacts) ? input.contacts.length : 0 } });
  }
  await deliverWebhooks(env, workspaceId, "account.created", account.id, account);
  return account;
}

async function handlePublicLeadForm(request, env, url) {
  if (!["GET", "POST"].includes(request.method)) return json({ error: "Not found" }, 404);
  const key = decodeURIComponent(url.pathname.replace(/^\/forms\/?/, "").split("/")[0] || "");
  const form = await env.DB.prepare("SELECT * FROM lead_forms WHERE (public_key = ? OR slug = ?) AND status = 'active' ORDER BY created_at ASC LIMIT 1").bind(key, key).first();
  if (!form) return request.method === "GET" ? htmlResponse(leadFormNotFoundHtml()) : json({ error: "Lead form not found" }, 404);
  if (request.method === "GET") return htmlResponse(publicLeadFormHtml(form));
  const input = await readLeadFormSubmission(request);
  const result = await submitLeadForm(env, form, input, request);
  if (acceptsHtml(request)) return htmlResponse(leadFormSuccessHtml(form));
  return json(result, 201);
}

async function readLeadFormSubmission(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return readJson(request);
  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

async function submitLeadForm(env, form, input, request) {
  if (cleanNullable(input.website)) return { ok: true, skipped: true };
  const accountName = cleanNullable(input.accountName || input.company || input.name);
  const domain = cleanDomain(input.domain || input.websiteUrl);
  const contactName = cleanNullable(input.contactName || input.fullName || input.personName);
  const email = cleanEmail(input.email);
  if (!accountName && !domain) throw httpError(400, "Company name or domain is required");
  if (!contactName) throw httpError(400, "Contact name is required");
  if (!email) throw httpError(400, "Email is required");
  const accountInput = {
    name: accountName || domain,
    domain,
    segment: form.default_segment,
    status: form.default_status,
    source: form.source || `Lead form: ${form.name}`,
    owner: form.default_owner,
    observation: cleanNullable(input.message || input.notes),
  };
  const existing = await findImportAccountMatch(env, form.workspace_id, accountInput);
  const account = existing || await createAccount(env, { ...accountInput, workspaceId: form.workspace_id });
  const contactResult = await createImportContactIfMissing(env, form.workspace_id, account.id, {
    name: contactName,
    email,
    title: cleanNullable(input.title),
  });
  const submissionId = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO lead_form_submissions (id, workspace_id, form_id, account_id, contact_id, payload_json, remote_ip, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    submissionId,
    form.workspace_id,
    form.id,
    account.id,
    contactResult.id || null,
    JSON.stringify({ ...input, email }),
    cleanNullable(request.headers.get("cf-connecting-ip")),
    cleanNullable(request.headers.get("user-agent")),
    now,
  ).run();
  await recordAuditLog(env, { workspaceId: form.workspace_id, userId: null, action: "lead_form.submit", resource: "lead_form_submission", resourceId: submissionId, metadata: { formId: form.id, accountId: account.id, contactId: contactResult.id || null, contactAction: contactResult.action } });
  const payload = { id: submissionId, form, account, contact: contactResult, submittedAt: now };
  await deliverWebhooks(env, form.workspace_id, "lead_form.submitted", submissionId, payload);
  return { ok: true, submissionId, accountId: account.id, contactId: contactResult.id || null, accountAction: existing ? "matched" : "created", contactAction: contactResult.action };
}

async function updateAccount(env, id, input) {
  const existing = await getRequired(env, "SELECT * FROM accounts WHERE id = ? AND workspace_id = ?", id, input.workspaceId);
  if (input.customFields && typeof input.customFields === "object") {
    await assertWritableCustomFieldValues(env, existing.workspace_id, "account", input.customFields, input.auth);
  }
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
    WHERE id = ? AND workspace_id = ?
  `)
    .bind(next.name, next.domain, next.segment, next.source, next.observation, next.status, next.owner, new Date().toISOString(), id, input.workspaceId)
    .run();

  if (input.customFields && typeof input.customFields === "object") {
    await upsertCustomFieldValues(env, existing.workspace_id, "account", id, input.customFields, input.auth);
  }

  const account = await getAccount(env, id, existing.workspace_id, input.auth);
  if (input.auditUserId) {
    await recordAuditLog(env, { workspaceId: existing.workspace_id, userId: input.auditUserId, action: "account.update", resource: "account", resourceId: id, metadata: { name: account.name, changedFields: changedInputFields(input, ["name", "domain", "segment", "source", "observation", "status", "owner", "customFields"]) } });
  }
  return account;
}

async function mergeAccount(env, targetAccountId, input, auth) {
  requireFields(input, ["sourceAccountId"]);
  if (targetAccountId === input.sourceAccountId) throw httpError(400, "Source and target accounts must differ");
  const target = await getRequired(env, "SELECT * FROM accounts WHERE id = ? AND workspace_id = ?", targetAccountId, input.workspaceId);
  const source = await getRequired(env, "SELECT * FROM accounts WHERE id = ? AND workspace_id = ?", input.sourceAccountId, input.workspaceId);

  await env.DB.prepare("UPDATE contacts SET account_id = ?, updated_at = ? WHERE account_id = ?")
    .bind(target.id, new Date().toISOString(), source.id)
    .run();
  await env.DB.prepare("UPDATE opportunities SET account_id = ?, updated_at = ? WHERE account_id = ? AND workspace_id = ?")
    .bind(target.id, new Date().toISOString(), source.id, input.workspaceId)
    .run();
  await env.DB.prepare("UPDATE tasks SET account_id = ?, updated_at = ? WHERE account_id = ? AND workspace_id = ?")
    .bind(target.id, new Date().toISOString(), source.id, input.workspaceId)
    .run();
  await env.DB.prepare("UPDATE email_events SET account_id = ? WHERE account_id = ?")
    .bind(target.id, source.id)
    .run();
  await env.DB.prepare(`
    INSERT INTO custom_field_values (id, workspace_id, field_id, entity, entity_id, value, created_at, updated_at)
    SELECT lower(hex(randomblob(16))), workspace_id, field_id, entity, ?, value, created_at, updated_at
    FROM custom_field_values source_values
    WHERE source_values.entity = 'account'
      AND source_values.entity_id = ?
      AND NOT EXISTS (
        SELECT 1
        FROM custom_field_values target_values
        WHERE target_values.field_id = source_values.field_id
          AND target_values.entity_id = ?
      )
  `).bind(target.id, source.id, target.id).run();
  await env.DB.prepare("DELETE FROM custom_field_values WHERE entity = 'account' AND entity_id = ?").bind(source.id).run();
  await env.DB.prepare("DELETE FROM accounts WHERE id = ? AND workspace_id = ?").bind(source.id, input.workspaceId).run();

  await touchAccount(env, target.id);
  await recordAuditLog(env, { workspaceId: input.workspaceId, userId: auth.user.id, action: "account.merge", resource: "account", resourceId: target.id, metadata: { sourceAccountId: source.id, sourceName: source.name, targetName: target.name } });
  const merged = await getAccount(env, target.id, input.workspaceId);
  await deliverWebhooks(env, input.workspaceId, "account.merged", target.id, { target: merged, source });
  return merged;
}

async function createContact(env, input) {
  requireFields(input, ["accountId", "name", "email"]);
  const account = await getRequired(env, "SELECT id, workspace_id FROM accounts WHERE id = ? AND workspace_id = ?", input.accountId, input.workspaceId);
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  const status = normalizeEnum(input.status || "new", CONTACT_STATUSES, "status");

  await env.DB.prepare(`
    INSERT INTO contacts (id, account_id, name, email, title, phone, linkedin_url, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      id,
      input.accountId,
      input.name.trim(),
      input.email.trim().toLowerCase(),
      cleanNullable(input.title),
      cleanNullable(input.phone),
      cleanNullable(input.linkedinUrl),
      status,
      cleanNullable(input.notes),
      now,
      now,
    )
    .run();

  await touchAccount(env, input.accountId);
  const contact = await getRequired(env, "SELECT * FROM contacts WHERE id = ?", id);
  if (input.auditUserId) {
    await recordAuditLog(env, { workspaceId: account.workspace_id, userId: input.auditUserId, action: "contact.create", resource: "contact", resourceId: contact.id, metadata: { accountId: input.accountId, email: contact.email } });
  }
  await deliverWebhooks(env, account.workspace_id, "contact.created", contact.id, contact);
  return contact;
}

async function createOpportunity(env, input) {
  requireFields(input, ["accountId", "name"]);
  const workspaceId = input.workspaceId || (await resolveDefaultWorkspaceId(env));
  await getRequired(env, "SELECT id FROM accounts WHERE id = ? AND workspace_id = ?", input.accountId, workspaceId);
  if (input.contactId) {
    await getRequired(env, "SELECT c.id FROM contacts c JOIN accounts a ON a.id = c.account_id WHERE c.id = ? AND a.workspace_id = ?", input.contactId, workspaceId);
  }
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  const stage = await normalizeOpportunityStage(env, workspaceId, input.stage || "research");

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
  const opportunity = await getRequired(env, "SELECT * FROM opportunities WHERE id = ?", id);
  if (input.auditUserId) {
    await recordAuditLog(env, { workspaceId, userId: input.auditUserId, action: "opportunity.create", resource: "opportunity", resourceId: id, metadata: { accountId: input.accountId, stage, valueCents: opportunity.value_cents } });
  }
  return opportunity;
}

async function listOpportunities(env, workspaceId) {
  const rows = await env.DB.prepare(`
    SELECT
      o.*,
      a.name AS account_name,
      a.domain AS account_domain,
      c.name AS contact_name,
      c.email AS contact_email,
      MAX(ee.created_at) AS last_activity_at,
      os.label AS stage_label,
      os.position AS stage_position
    FROM opportunities o
    JOIN accounts a ON a.id = o.account_id
    LEFT JOIN contacts c ON c.id = o.contact_id
    LEFT JOIN email_events ee ON ee.account_id = a.id
    LEFT JOIN opportunity_stages os ON os.workspace_id = o.workspace_id AND os.key = o.stage
    WHERE o.workspace_id = ?
    GROUP BY o.id
    ORDER BY COALESCE(os.position, 999), o.updated_at DESC
  `).bind(workspaceId).all();
  return rows.results;
}

async function updateOpportunity(env, id, input) {
  const existing = await getRequired(env, "SELECT * FROM opportunities WHERE id = ? AND workspace_id = ?", id, input.workspaceId);
  const next = {
    name: input.name?.trim() || existing.name,
    stage: input.stage ? await normalizeOpportunityStage(env, input.workspaceId, input.stage) : existing.stage,
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
  const opportunity = await getRequired(env, "SELECT * FROM opportunities WHERE id = ? AND workspace_id = ?", id, input.workspaceId);
  if (input.auditUserId) {
    await recordAuditLog(env, { workspaceId: input.workspaceId, userId: input.auditUserId, action: "opportunity.update", resource: "opportunity", resourceId: id, metadata: { accountId: existing.account_id, stage: opportunity.stage, changedFields: changedInputFields(input, ["name", "stage", "valueCents", "confidence", "closeDate"]) } });
  }
  return opportunity;
}

async function listOpportunityStages(env, workspaceId) {
  const rows = await env.DB.prepare(`
    SELECT * FROM opportunity_stages
    WHERE workspace_id = ?
    ORDER BY position, label
  `).bind(workspaceId).all();
  return rows.results.length ? rows.results : DEFAULT_OPPORTUNITY_STAGES;
}

async function createOpportunityStage(env, input, auth) {
  requireFields(input, ["label"]);
  const label = input.label.trim();
  const key = slugify(input.key || label).replaceAll("-", "_");
  if (!key) throw httpError(400, "Stage key is required");
  const position = input.position !== undefined ? Number(input.position) : await nextOpportunityStagePosition(env, input.workspaceId);
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO opportunity_stages (id, workspace_id, key, label, position, is_won, is_lost, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.workspaceId,
    key,
    label,
    position,
    input.isWon ? 1 : 0,
    input.isLost ? 1 : 0,
    now,
    now,
  ).run();
  await recordAuditLog(env, { workspaceId: input.workspaceId, userId: auth.user.id, action: "created", resource: "opportunity_stage", resourceId: id, metadata: { key, label } });
  return getRequired(env, "SELECT * FROM opportunity_stages WHERE id = ? AND workspace_id = ?", id, input.workspaceId);
}

async function nextOpportunityStagePosition(env, workspaceId) {
  const maxPosition = await scalar(env, "SELECT COALESCE(MAX(position), 0) FROM opportunity_stages WHERE workspace_id = ?", workspaceId);
  return Number(maxPosition || 0) + 10;
}

async function normalizeOpportunityStage(env, workspaceId, stage) {
  const key = cleanNullable(stage);
  if (!key) throw httpError(400, "Missing required field: stage");
  const exists = await scalar(env, "SELECT COUNT(*) FROM opportunity_stages WHERE workspace_id = ? AND key = ?", workspaceId, key);
  if (!exists && !DEFAULT_OPPORTUNITY_STAGES.some((item) => item.key === key)) throw httpError(400, `Invalid stage: ${key}`);
  return key;
}

async function getClosedOpportunityStages(env, workspaceId) {
  const rows = await env.DB.prepare("SELECT key FROM opportunity_stages WHERE workspace_id = ? AND (is_won = 1 OR is_lost = 1)").bind(workspaceId).all();
  return rows.results.length ? rows.results.map((row) => row.key) : ["won", "lost"];
}

function stageNotInClause(stages, column = "stage") {
  return stages.length ? `${column} NOT IN (${stages.map(() => "?").join(", ")})` : "1 = 1";
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
  if (input.accountId) {
    await getRequired(env, "SELECT id FROM accounts WHERE id = ? AND workspace_id = ?", input.accountId, workspaceId);
  }
  if (input.contactId) {
    await getRequired(env, "SELECT c.id FROM contacts c JOIN accounts a ON a.id = c.account_id WHERE c.id = ? AND a.workspace_id = ?", input.contactId, workspaceId);
  }
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

  const task = await getRequired(env, "SELECT * FROM tasks WHERE id = ?", id);
  if (input.auditUserId) {
    await recordAuditLog(env, { workspaceId, userId: input.auditUserId, action: "task.create", resource: "task", resourceId: task.id, metadata: { accountId: task.account_id, contactId: task.contact_id, status: task.status } });
  }
  await deliverWebhooks(env, workspaceId, "task.created", task.id, task);
  return task;
}

async function listCommunications(env, workspaceId) {
  const rows = await env.DB.prepare(`
    SELECT ce.*, a.name AS account_name, c.name AS contact_name, c.email AS contact_email, u.name AS created_by_name
    FROM communication_events ce
    JOIN accounts a ON a.id = ce.account_id
    LEFT JOIN contacts c ON c.id = ce.contact_id
    LEFT JOIN users u ON u.id = ce.created_by_user_id
    WHERE ce.workspace_id = ?
    ORDER BY ce.occurred_at DESC
    LIMIT 100
  `).bind(workspaceId).all();
  return rows.results;
}

async function createCommunication(env, input, auth) {
  requireFields(input, ["accountId", "type", "subject"]);
  const account = await getRequired(env, "SELECT * FROM accounts WHERE id = ? AND workspace_id = ?", input.accountId, input.workspaceId);
  const contactId = cleanNullable(input.contactId);
  if (contactId) {
    await getRequired(env, "SELECT id FROM contacts WHERE id = ? AND account_id = ?", contactId, account.id);
  }
  const type = normalizeEnum(input.type, COMMUNICATION_TYPES, "type");
  const direction = input.direction ? normalizeEnum(input.direction, COMMUNICATION_DIRECTIONS, "direction") : null;
  const outcome = input.outcome ? normalizeEnum(input.outcome, COMMUNICATION_OUTCOMES, "outcome") : null;
  const now = new Date().toISOString();
  const occurredAt = cleanNullable(input.occurredAt) || now;
  const id = input.id || crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO communication_events (
      id, workspace_id, account_id, contact_id, created_by_user_id,
      type, direction, outcome, subject, body, occurred_at, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.workspaceId,
    account.id,
    contactId,
    auth.user.id,
    type,
    direction,
    outcome,
    input.subject.trim(),
    cleanNullable(input.body || input.notes),
    occurredAt,
    now,
    now,
  ).run();

  const event = await getRequired(env, "SELECT * FROM communication_events WHERE id = ?", id);
  await recordAuditLog(env, { workspaceId: input.workspaceId, userId: auth.user.id, action: "communication.create", resource: "communication_event", resourceId: id, metadata: { type, accountId: account.id, contactId } });
  await deliverWebhooks(env, input.workspaceId, "communication.created", id, event);
  return event;
}

async function listMessageChannels(env, workspaceId, revealWebhook = false) {
  const [channels, deliveries] = await Promise.all([
    env.DB.prepare(`
      SELECT wmc.*, u.name AS created_by_name
      FROM workspace_message_channels wmc
      JOIN users u ON u.id = wmc.created_by_user_id
      WHERE wmc.workspace_id = ?
      ORDER BY wmc.created_at DESC
    `).bind(workspaceId).all(),
    env.DB.prepare(`
      SELECT md.*, wmc.name AS channel_name, wmc.type AS channel_type
      FROM message_deliveries md
      JOIN workspace_message_channels wmc ON wmc.id = md.channel_id
      WHERE md.workspace_id = ?
      ORDER BY md.created_at DESC
      LIMIT 25
    `).bind(workspaceId).all(),
  ]);
  return {
    channels: channels.results.map((channel) => messageChannelResponse(channel, revealWebhook)),
    deliveries: deliveries.results,
  };
}

async function createMessageChannel(env, input, auth) {
  requireFields(input, ["name", "type"]);
  const type = normalizeEnum(input.type, MESSAGE_CHANNEL_TYPES, "type");
  const provider = normalizeEnum(input.provider || "twilio", MESSAGE_CHANNEL_PROVIDERS, "provider");
  const config = normalizeMessageChannelConfig(provider, input);
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  const inboundKey = input.inboundKey || crypto.randomUUID().replaceAll("-", "");
  await env.DB.prepare(`
    INSERT INTO workspace_message_channels (id, workspace_id, created_by_user_id, type, provider, name, config_json, inbound_key, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).bind(id, input.workspaceId, auth.user.id, type, provider, input.name.trim(), JSON.stringify(config), inboundKey, now, now).run();
  await recordAuditLog(env, { workspaceId: input.workspaceId, userId: auth.user.id, action: "message_channel.create", resource: "workspace_message_channel", resourceId: id, metadata: { name: input.name, type, provider } });
  return messageChannelResponse(await getRequired(env, "SELECT * FROM workspace_message_channels WHERE id = ? AND workspace_id = ?", id, input.workspaceId), true);
}

async function disableMessageChannel(env, id, workspaceId, auth) {
  const existing = await getRequired(env, "SELECT * FROM workspace_message_channels WHERE id = ? AND workspace_id = ?", id, workspaceId);
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE workspace_message_channels SET status = 'disabled', updated_at = ? WHERE id = ? AND workspace_id = ?").bind(now, id, workspaceId).run();
  await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "message_channel.disable", resource: "workspace_message_channel", resourceId: id, metadata: { name: existing.name, type: existing.type, provider: existing.provider } });
  return { ok: true };
}

async function sendProviderMessage(env, input, auth) {
  requireFields(input, ["channelId", "contactId", "body"]);
  const channel = await getRequired(env, "SELECT * FROM workspace_message_channels WHERE id = ? AND workspace_id = ? AND status = 'active'", input.channelId, input.workspaceId);
  const contact = await getRequired(env, `
    SELECT c.*, a.id AS account_id, a.name AS account_name
    FROM contacts c
    JOIN accounts a ON a.id = c.account_id
    WHERE c.id = ? AND a.workspace_id = ?
  `, input.contactId, input.workspaceId);
  const type = normalizeEnum(input.type || channel.type, MESSAGE_CHANNEL_TYPES, "type");
  if (type !== channel.type) throw httpError(400, "Message type must match the selected channel");
  if (contact.status === "unsubscribed") throw httpError(400, "Contact is unsubscribed");
  const to = cleanNullable(input.to || input.phone || contact.phone);
  if (!to) throw httpError(400, "Contact phone is required");
  const body = String(input.body || "").trim();
  if (!body) throw httpError(400, "Message body is required");

  const id = input.id || crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO communication_events (
      id, workspace_id, account_id, contact_id, created_by_user_id,
      type, direction, outcome, subject, body, occurred_at, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'outbound', NULL, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.workspaceId,
    contact.account_id,
    contact.id,
    auth.user.id,
    type,
    cleanNullable(input.subject) || `${type.toUpperCase()} to ${contact.name}`,
    body,
    now,
    now,
    now,
  ).run();

  const result = await deliverProviderMessage(channel, { type, to, body });
  await env.DB.prepare(`
    INSERT INTO message_deliveries (
      id, workspace_id, channel_id, communication_event_id, account_id, contact_id,
      provider_message_id, status, status_code, error, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    input.workspaceId,
    channel.id,
    id,
    contact.account_id,
    contact.id,
    cleanNullable(result.providerMessageId),
    result.status,
    result.statusCode || null,
    cleanNullable(result.error),
    now,
  ).run();

  const event = await getRequired(env, "SELECT * FROM communication_events WHERE id = ?", id);
  await recordAuditLog(env, { workspaceId: input.workspaceId, userId: auth.user.id, action: "message.send", resource: "communication_event", resourceId: id, metadata: { type, channelId: channel.id, provider: channel.provider, contactId: contact.id, status: result.status } });
  await deliverWebhooks(env, input.workspaceId, "communication.created", id, event);
  await deliverWebhooks(env, input.workspaceId, "message.sent", id, { ...event, delivery: result });
  return { communication: event, delivery: result };
}

async function handleInboundMessageWebhook(request, env, url) {
  const inboundKey = cleanNullable(url.pathname.split("/").pop());
  if (!inboundKey) throw httpError(404, "Message webhook not found");
  const channel = await getRequired(env, "SELECT * FROM workspace_message_channels WHERE inbound_key = ? AND status = 'active'", inboundKey);
  const input = await readMessageWebhookPayload(request);
  const result = await recordInboundProviderMessage(env, channel, input);
  const wantsJson = (request.headers.get("accept") || "").includes("application/json");
  if (wantsJson) return json(result, 201);
  return new Response("<Response></Response>", { status: 201, headers: { "content-type": "text/xml; charset=utf-8" } });
}

async function handleInboundEmailWebhook(request, env, url) {
  const inboundKey = cleanNullable(url.pathname.split("/").pop());
  if (!inboundKey) throw httpError(404, "Email webhook not found");
  const source = await getRequired(env, "SELECT * FROM workspace_email_inbound_sources WHERE inbound_key = ? AND status = 'active'", inboundKey);
  const input = normalizeInboundEmailPayload(source.provider, await readProviderWebhookPayload(request));
  try {
    const result = await ingestInboundEmail(env, { ...input, workspaceId: source.workspace_id }, { userId: null, source });
    const now = new Date().toISOString();
    await env.DB.prepare("UPDATE workspace_email_inbound_sources SET last_received_at = ?, last_error = NULL, updated_at = ? WHERE id = ?").bind(now, now, source.id).run();
    const wantsJson = (request.headers.get("accept") || "").includes("application/json");
    if (wantsJson) return json({ ...result, sourceId: source.id }, 201);
    return new Response("ok", { status: 201, headers: { "content-type": "text/plain; charset=utf-8" } });
  } catch (error) {
    const now = new Date().toISOString();
    await env.DB.prepare("UPDATE workspace_email_inbound_sources SET last_error = ?, updated_at = ? WHERE id = ?").bind(error.message || String(error), now, source.id).run();
    throw error;
  }
}

async function readMessageWebhookPayload(request) {
  return readProviderWebhookPayload(request);
}

async function readProviderWebhookPayload(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return readJson(request);
  const text = await request.text();
  return Object.fromEntries(new URLSearchParams(text).entries());
}

async function recordInboundProviderMessage(env, channel, input) {
  const from = cleanNullable(input.From || input.from || input.WaId || input.sender);
  const body = cleanNullable(input.Body || input.body || input.Text || input.text) || "";
  const providerMessageId = cleanNullable(input.MessageSid || input.SmsMessageSid || input.SmsSid || input.messageSid || input.providerMessageId || input.id);
  if (!from) throw httpError(400, "Inbound message sender is required");
  if (!body) throw httpError(400, "Inbound message body is required");
  const contact = await findContactByPhone(env, channel.workspace_id, from);
  if (!contact) throw httpError(404, "No contact matched inbound message sender");

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO communication_events (
      id, workspace_id, account_id, contact_id, created_by_user_id,
      type, direction, outcome, subject, body, occurred_at, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, NULL, ?, 'inbound', NULL, ?, ?, ?, ?, ?)
  `).bind(
    id,
    channel.workspace_id,
    contact.account_id,
    contact.id,
    channel.type,
    `${channel.type.toUpperCase()} from ${contact.name}`,
    body,
    cleanNullable(input.receivedAt || input.Timestamp) || now,
    now,
    now,
  ).run();

  await env.DB.prepare(`
    INSERT INTO message_deliveries (
      id, workspace_id, channel_id, communication_event_id, account_id, contact_id,
      provider_message_id, status, status_code, error, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'received', NULL, NULL, ?)
  `).bind(crypto.randomUUID(), channel.workspace_id, channel.id, id, contact.account_id, contact.id, providerMessageId, now).run();

  const wasReplied = contact.status === "replied";
  const wasUnsubscribed = contact.status === "unsubscribed";
  if (!wasUnsubscribed) {
    await env.DB.prepare("UPDATE contacts SET status = 'replied', updated_at = ? WHERE id = ?").bind(now, contact.id).run();
    await env.DB.prepare("UPDATE sequence_enrollments SET status = 'replied', updated_at = ? WHERE contact_id = ? AND status = 'active'").bind(now, contact.id).run();
  }

  const event = await getRequired(env, "SELECT * FROM communication_events WHERE id = ?", id);
  await recordAuditLog(env, { workspaceId: channel.workspace_id, userId: null, action: "message.inbound", resource: "communication_event", resourceId: id, metadata: { type: channel.type, channelId: channel.id, provider: channel.provider, contactId: contact.id, providerMessageId } });
  await deliverWebhooks(env, channel.workspace_id, "communication.created", id, event);
  await deliverWebhooks(env, channel.workspace_id, "message.received", id, { ...event, providerMessageId });

  const updated = await getContact(env, contact.id, channel.workspace_id);
  if (!wasUnsubscribed && !wasReplied) {
    await deliverWebhooks(env, channel.workspace_id, "contact.replied", contact.id, updated);
  }
  return { contact: updated, communication: event };
}

async function findContactByPhone(env, workspaceId, from) {
  const normalized = normalizePhoneAddress(from);
  if (!normalized) return null;
  const rows = await env.DB.prepare(`
    SELECT c.*, a.workspace_id, a.id AS account_id
    FROM contacts c
    JOIN accounts a ON a.id = c.account_id
    WHERE a.workspace_id = ? AND c.phone IS NOT NULL
  `).bind(workspaceId).all();
  return rows.results.find((contact) => normalizePhoneAddress(contact.phone) === normalized) || null;
}

async function listCalendarEvents(env, workspaceId) {
  const rows = await env.DB.prepare(`
    SELECT ce.*, a.name AS account_name, c.name AS contact_name, c.email AS contact_email, u.name AS created_by_name
    FROM calendar_events ce
    JOIN accounts a ON a.id = ce.account_id
    LEFT JOIN contacts c ON c.id = ce.contact_id
    LEFT JOIN users u ON u.id = ce.created_by_user_id
    WHERE ce.workspace_id = ?
    ORDER BY ce.starts_at DESC
    LIMIT 100
  `).bind(workspaceId).all();
  return rows.results.map((row) => ({ ...row, attendee_emails: parseJsonArray(row.attendee_emails_json) }));
}

async function listCalendarSources(env, workspaceId) {
  const rows = await env.DB.prepare(`
    SELECT cs.*, a.name AS account_name, c.name AS contact_name, u.name AS created_by_name
    FROM calendar_sources cs
    JOIN accounts a ON a.id = cs.account_id
    LEFT JOIN contacts c ON c.id = cs.contact_id
    LEFT JOIN users u ON u.id = cs.created_by_user_id
    WHERE cs.workspace_id = ?
    ORDER BY cs.created_at DESC
  `).bind(workspaceId).all();
  return rows.results;
}

async function createCalendarSource(env, input, auth) {
  requireFields(input, ["name", "accountId", "url"]);
  const type = normalizeEnum(input.type || "ics_feed", CALENDAR_SOURCE_TYPES, "type");
  const account = await getRequired(env, "SELECT * FROM accounts WHERE id = ? AND workspace_id = ?", input.accountId, input.workspaceId);
  const contactId = cleanNullable(input.contactId);
  if (contactId) {
    await getRequired(env, "SELECT id FROM contacts WHERE id = ? AND account_id = ?", contactId, account.id);
  }
  const url = normalizeCalendarSourceUrl(input.url);
  const interval = Math.max(15, Math.min(10080, Number(input.syncIntervalMinutes || input.sync_interval_minutes || 1440)));
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO calendar_sources (
      id, workspace_id, account_id, contact_id, created_by_user_id, name, type, url, provider,
      status, sync_interval_minutes, last_synced_at, last_error, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, NULL, NULL, ?, ?)
  `).bind(id, input.workspaceId, account.id, contactId, auth.user.id, input.name.trim(), type, url, cleanNullable(input.provider) || type, interval, now, now).run();
  await recordAuditLog(env, { workspaceId: input.workspaceId, userId: auth.user.id, action: "calendar_source.create", resource: "calendar_source", resourceId: id, metadata: { accountId: account.id, contactId, type } });
  return getRequired(env, "SELECT * FROM calendar_sources WHERE id = ? AND workspace_id = ?", id, input.workspaceId);
}

async function disableCalendarSource(env, id, workspaceId, auth) {
  const source = await getRequired(env, "SELECT * FROM calendar_sources WHERE id = ? AND workspace_id = ?", id, workspaceId);
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE calendar_sources SET status = 'disabled', updated_at = ? WHERE id = ? AND workspace_id = ?").bind(now, id, workspaceId).run();
  await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "calendar_source.disable", resource: "calendar_source", resourceId: id, metadata: { name: source.name, type: source.type } });
  return { ok: true };
}

async function syncCalendarSource(env, id, workspaceId, auth = null) {
  const source = await getRequired(env, "SELECT * FROM calendar_sources WHERE id = ? AND workspace_id = ? AND status = 'active'", id, workspaceId);
  const now = new Date().toISOString();
  try {
    const response = await fetch(source.url, { headers: { "user-agent": "UserOrbit-CRM-CalendarSync" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const ics = await response.text();
    const result = await importCalendarIcs(env, {
      workspaceId,
      accountId: source.account_id,
      contactId: source.contact_id,
      provider: `calendar_source:${source.id}`,
      ics,
    }, auth || { user: { id: source.created_by_user_id || null } });
    await env.DB.prepare("UPDATE calendar_sources SET last_synced_at = ?, last_error = NULL, updated_at = ? WHERE id = ?").bind(now, now, source.id).run();
    if (auth?.user?.id) {
      await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "calendar_source.sync", resource: "calendar_source", resourceId: source.id, metadata: { imported: result.imported } });
    }
    return { sourceId: source.id, imported: result.imported, events: result.events };
  } catch (error) {
    const message = error.message || String(error);
    await env.DB.prepare("UPDATE calendar_sources SET last_synced_at = ?, last_error = ?, updated_at = ? WHERE id = ?").bind(now, message, now, source.id).run();
    throw httpError(400, `Calendar sync failed: ${message}`);
  }
}

async function syncDueCalendarSources(env, limit = 10) {
  const now = new Date();
  const rows = await env.DB.prepare(`
    SELECT *
    FROM calendar_sources
    WHERE status = 'active'
    ORDER BY COALESCE(last_synced_at, '1970-01-01T00:00:00.000Z') ASC
    LIMIT ?
  `).bind(limit).all();
  const items = [];
  for (const source of rows.results) {
    const last = source.last_synced_at ? new Date(source.last_synced_at) : new Date(0);
    const dueAt = new Date(last.getTime() + Number(source.sync_interval_minutes || 1440) * 60 * 1000);
    if (dueAt > now) continue;
    try {
      const result = await syncCalendarSource(env, source.id, source.workspace_id);
      items.push({ sourceId: source.id, status: "synced", imported: result.imported });
    } catch (error) {
      items.push({ sourceId: source.id, status: "failed", error: error.message || String(error) });
    }
  }
  return { processed: items.length, items };
}

async function createCalendarEvent(env, input, auth) {
  requireFields(input, ["accountId", "title", "startsAt"]);
  const account = await getRequired(env, "SELECT * FROM accounts WHERE id = ? AND workspace_id = ?", input.accountId, input.workspaceId);
  const contactId = cleanNullable(input.contactId);
  if (contactId) {
    await getRequired(env, "SELECT id FROM contacts WHERE id = ? AND account_id = ?", contactId, account.id);
  }
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  const provider = cleanNullable(input.provider) || "manual";
  const externalId = cleanNullable(input.externalId || input.uid);
  const attendeeEmails = normalizeEmailList(input.attendeeEmails || input.attendee_emails);
  const existing = externalId ? await env.DB.prepare("SELECT * FROM calendar_events WHERE workspace_id = ? AND provider = ? AND external_id = ?").bind(input.workspaceId, provider, externalId).first() : null;
  if (existing) {
    await env.DB.prepare(`
      UPDATE calendar_events
      SET account_id = ?, contact_id = ?, title = ?, description = ?, location = ?, meeting_url = ?,
          attendee_emails_json = ?, starts_at = ?, ends_at = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `).bind(
      account.id,
      contactId,
      input.title.trim(),
      cleanNullable(input.description),
      cleanNullable(input.location),
      cleanNullable(input.meetingUrl || input.meeting_url),
      attendeeEmails.length ? JSON.stringify(attendeeEmails) : null,
      normalizeDateTime(input.startsAt, "startsAt"),
      input.endsAt ? normalizeDateTime(input.endsAt, "endsAt") : null,
      now,
      existing.id,
      input.workspaceId,
    ).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO calendar_events (
        id, workspace_id, account_id, contact_id, created_by_user_id, external_id, provider,
        title, description, location, meeting_url, attendee_emails_json, starts_at, ends_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      input.workspaceId,
      account.id,
      contactId,
      auth.user.id,
      externalId,
      provider,
      input.title.trim(),
      cleanNullable(input.description),
      cleanNullable(input.location),
      cleanNullable(input.meetingUrl || input.meeting_url),
      attendeeEmails.length ? JSON.stringify(attendeeEmails) : null,
      normalizeDateTime(input.startsAt, "startsAt"),
      input.endsAt ? normalizeDateTime(input.endsAt, "endsAt") : null,
      now,
      now,
    ).run();
  }

  const event = externalId
    ? await getRequired(env, "SELECT * FROM calendar_events WHERE workspace_id = ? AND provider = ? AND external_id = ?", input.workspaceId, provider, externalId)
    : await getRequired(env, "SELECT * FROM calendar_events WHERE id = ?", id);
  await recordAuditLog(env, { workspaceId: input.workspaceId, userId: auth.user.id, action: "calendar_event.upsert", resource: "calendar_event", resourceId: event.id, metadata: { accountId: account.id, contactId, provider } });
  await deliverWebhooks(env, input.workspaceId, "calendar_event.created", event.id, event);
  return { ...event, attendee_emails: parseJsonArray(event.attendee_emails_json) };
}

async function importCalendarIcs(env, input, auth) {
  requireFields(input, ["accountId", "ics"]);
  const events = parseIcsEvents(input.ics);
  if (!events.length) throw httpError(400, "No VEVENT entries found in ICS");
  const created = [];
  for (const event of events) {
    created.push(await createCalendarEvent(env, {
      workspaceId: input.workspaceId,
      accountId: input.accountId,
      contactId: input.contactId,
      provider: input.provider || "ics",
      externalId: event.uid,
      title: event.summary || "Calendar event",
      description: event.description,
      location: event.location,
      meetingUrl: event.url || event.meetingUrl,
      attendeeEmails: event.attendeeEmails,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
    }, auth));
  }
  return { imported: created.length, events: created };
}

async function updateTask(env, id, input) {
  const task = await getRequired(env, "SELECT * FROM tasks WHERE id = ? AND workspace_id = ?", id, input.workspaceId);
  if (input.accountId) {
    await getRequired(env, "SELECT id FROM accounts WHERE id = ? AND workspace_id = ?", input.accountId, input.workspaceId);
  }
  if (input.contactId) {
    await getRequired(env, "SELECT c.id FROM contacts c JOIN accounts a ON a.id = c.account_id WHERE c.id = ? AND a.workspace_id = ?", input.contactId, input.workspaceId);
  }
  await env.DB.prepare(`
    UPDATE tasks
    SET title = ?, kind = ?, due_at = ?, status = ?, notes = ?, updated_at = ?
    WHERE id = ? AND workspace_id = ?
  `)
    .bind(
      input.title?.trim() || task.title,
      input.kind || task.kind,
      input.dueAt !== undefined ? cleanNullable(input.dueAt) : task.due_at,
      input.status || task.status,
      input.notes !== undefined ? cleanNullable(input.notes) : task.notes,
      new Date().toISOString(),
      id,
      input.workspaceId,
    )
    .run();
  const updated = await getRequired(env, "SELECT * FROM tasks WHERE id = ? AND workspace_id = ?", id, input.workspaceId);
  if (input.auditUserId) {
    await recordAuditLog(env, { workspaceId: input.workspaceId, userId: input.auditUserId, action: "task.update", resource: "task", resourceId: id, metadata: { accountId: updated.account_id, contactId: updated.contact_id, status: updated.status, changedFields: changedInputFields(input, ["title", "kind", "dueAt", "status", "notes"]) } });
  }
  return updated;
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
  const contact = await getRequired(env, `
    SELECT c.id, c.status
    FROM contacts c
    JOIN accounts a ON a.id = c.account_id
    WHERE c.id = ? AND a.workspace_id = ?
  `, input.contactId, input.workspaceId);
  if (contact.status === "unsubscribed") throw httpError(400, "Contact is unsubscribed");
  const now = new Date().toISOString();
  const nextSendAt = input.nextSendAt || now;
  const id = input.id || crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO sequence_enrollments (id, sequence_id, contact_id, status, current_step_order, next_send_at, created_at, updated_at)
    VALUES (?, ?, ?, 'active', 1, ?, ?, ?)
  `)
    .bind(id, input.sequenceId, input.contactId, nextSendAt, now, now)
    .run();

  const enrollment = await getRequired(env, "SELECT * FROM sequence_enrollments WHERE id = ?", id);
  if (input.auditUserId) {
    await recordAuditLog(env, { workspaceId: input.workspaceId, userId: input.auditUserId, action: "sequence_enrollment.create", resource: "sequence_enrollment", resourceId: id, metadata: { sequenceId: input.sequenceId, contactId: input.contactId, nextSendAt } });
  }
  return enrollment;
}

async function sendManualEmail(env, input) {
  requireFields(input, ["contactId", "subject", "body"]);
  const contact = await getContactWithAccount(env, input.contactId);
  if (contact.workspace_id !== input.workspaceId) throw httpError(404, "Not found");
  if (contact.status === "unsubscribed") throw httpError(400, "Contact is unsubscribed");
  const emailSettings = await getEmailSettings(env, input.workspaceId);
  const sender = await chooseEmailSender(env, input.workspaceId);
  const tracking = buildEmailTracking(input.baseUrl || env.CRM_PUBLIC_URL, emailTrackingEnabled(emailSettings) ? crypto.randomUUID() : null, emailSettings);
  const result = await sendEmail(env, {
    fromEmail: sender?.email,
    fromName: sender?.name,
    to: contact.email,
    toName: contact.name,
    subject: input.subject,
    body: input.body,
    tracking,
  });

  const event = await recordEmailEvent(env, {
    contact,
    status: result.status,
    subject: input.subject,
    body: input.body,
    providerMessageId: result.providerMessageId,
    error: result.error,
    sentAt: result.status === "sent" ? new Date().toISOString() : null,
    trackingId: tracking?.id,
  });
  if (result.status === "sent") await recordEmailSenderUsage(env, sender, contact.workspace_id);

  await deliverWebhooks(env, contact.workspace_id, "email.created", event.id, event);
  if (input.auditUserId) {
    await recordAuditLog(env, { workspaceId: contact.workspace_id, userId: input.auditUserId, action: "email.send", resource: "email_event", resourceId: event.id, metadata: { contactId: contact.id, accountId: contact.account_id, status: event.status, subject: input.subject } });
  }
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
      a.workspace_id,
      a.name AS account_name,
      a.domain,
      a.observation,
      a.segment
    FROM sequence_enrollments se
    JOIN sequence_steps ss ON ss.sequence_id = se.sequence_id AND ss.step_order = se.current_step_order
    JOIN email_templates et ON et.id = ss.template_id
    JOIN contacts c ON c.id = se.contact_id
    JOIN accounts a ON a.id = c.account_id
    WHERE se.status = 'active' AND c.status != 'unsubscribed' AND se.next_send_at <= ?
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

    const emailSettings = await getEmailSettings(env, item.workspace_id);
    const sender = await chooseEmailSender(env, item.workspace_id);
    const tracking = buildEmailTracking(env.CRM_PUBLIC_URL, emailTrackingEnabled(emailSettings) ? crypto.randomUUID() : null, emailSettings);
    const result = await sendEmail(env, {
      fromEmail: sender?.email,
      fromName: sender?.name,
      to: item.email,
      toName: item.contact_name,
      subject: rendered.subject,
      body: rendered.body,
      tracking,
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
      trackingId: tracking?.id,
    });
    if (result.status === "sent") await recordEmailSenderUsage(env, sender, item.workspace_id);

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

async function unsubscribeContact(env, id, workspaceId, auth) {
  const contact = await getRequired(
    env,
    `SELECT c.*, a.workspace_id
     FROM contacts c
     JOIN accounts a ON a.id = c.account_id
     WHERE c.id = ? AND a.workspace_id = ?`,
    id,
    workspaceId,
  );
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE contacts SET status = 'unsubscribed', updated_at = ? WHERE id = ?").bind(now, id).run();
  await env.DB.prepare("UPDATE sequence_enrollments SET status = 'unsubscribed', updated_at = ? WHERE contact_id = ? AND status = 'active'").bind(now, id).run();
  await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "contact.unsubscribe", resource: "contact", resourceId: id, metadata: { email: contact.email } });
  const updated = await getContact(env, id, workspaceId);
  await deliverWebhooks(env, workspaceId, "contact.unsubscribed", id, updated);
  return updated;
}

async function markContactReplied(env, id, workspaceId, auth) {
  const contact = await getRequired(
    env,
    `SELECT c.*, a.workspace_id
     FROM contacts c
     JOIN accounts a ON a.id = c.account_id
     WHERE c.id = ? AND a.workspace_id = ?`,
    id,
    workspaceId,
  );
  if (contact.status === "unsubscribed") throw httpError(400, "Contact is unsubscribed");
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE contacts SET status = 'replied', updated_at = ? WHERE id = ?").bind(now, id).run();
  await env.DB.prepare("UPDATE sequence_enrollments SET status = 'replied', updated_at = ? WHERE contact_id = ? AND status = 'active'").bind(now, id).run();
  await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "contact.reply", resource: "contact", resourceId: id, metadata: { email: contact.email } });
  const updated = await getContact(env, id, workspaceId);
  await deliverWebhooks(env, workspaceId, "contact.replied", id, updated);
  return updated;
}

async function recordInboundEmail(env, input, auth) {
  return ingestInboundEmail(env, input, { userId: auth.user.id });
}

async function ingestInboundEmail(env, input, options = {}) {
  requireFields(input, ["subject"]);
  const contact = await resolveInboundContact(env, input);
  const now = new Date().toISOString();
  const wasReplied = contact.status === "replied";
  const wasUnsubscribed = contact.status === "unsubscribed";
  const email = await recordEmailEvent(env, {
    contact,
    direction: "inbound",
    status: "received",
    subject: input.subject,
    body: input.body || input.text || "",
    providerMessageId: input.providerMessageId || input.messageId,
    sentAt: input.receivedAt || now,
  });

  if (!wasUnsubscribed) {
    await env.DB.prepare("UPDATE contacts SET status = 'replied', updated_at = ? WHERE id = ?").bind(now, contact.id).run();
    await env.DB.prepare("UPDATE sequence_enrollments SET status = 'replied', updated_at = ? WHERE contact_id = ? AND status = 'active'").bind(now, contact.id).run();
  }

  await recordAuditLog(env, {
    workspaceId: input.workspaceId,
    userId: options.userId || null,
    action: "email.inbound",
    resource: "contact",
    resourceId: contact.id,
    metadata: {
      email: contact.email,
      subject: input.subject,
      providerMessageId: input.providerMessageId || input.messageId || null,
      sourceId: options.source?.id || null,
      provider: options.source?.provider || null,
    },
  });
  await deliverWebhooks(env, input.workspaceId, "email.received", email.id, email);

  const updated = await getContact(env, contact.id, input.workspaceId);
  if (!wasUnsubscribed && !wasReplied) {
    await deliverWebhooks(env, input.workspaceId, "contact.replied", contact.id, updated);
  }
  return { contact: updated, email };
}

function normalizeInboundEmailPayload(provider, payload) {
  const fromEmail = extractEmailAddress(
    payload.fromEmail ||
    payload.FromFull?.Email ||
    payload.From ||
    payload.from ||
    payload.sender ||
    payload.Sender,
  );
  const subject = cleanNullable(payload.Subject || payload.subject) || "(no subject)";
  const body = cleanNullable(
    payload.TextBody ||
    payload["body-plain"] ||
    payload.text ||
    payload.body ||
    payload.HtmlBody ||
    payload["body-html"] ||
    payload.html,
  ) || "";
  const providerMessageId = cleanNullable(
    payload.MessageID ||
    payload["Message-Id"] ||
    payload["message-id"] ||
    payload.messageId ||
    payload.providerMessageId ||
    payload.id,
  );
  return {
    provider,
    fromEmail,
    subject,
    body,
    providerMessageId,
    receivedAt: cleanNullable(payload.receivedAt || payload.Date || payload.date),
  };
}

async function resolveInboundContact(env, input) {
  if (input.contactId) {
    return getRequired(
      env,
      `SELECT c.*, a.workspace_id
       FROM contacts c
       JOIN accounts a ON a.id = c.account_id
       WHERE c.id = ? AND a.workspace_id = ?`,
      input.contactId,
      input.workspaceId,
    );
  }

  const fromEmail = cleanEmail(input.fromEmail || input.from || input.sender);
  if (!fromEmail) throw httpError(400, "fromEmail or contactId is required");
  return getRequired(
    env,
    `SELECT c.*, a.workspace_id
     FROM contacts c
     JOIN accounts a ON a.id = c.account_id
     WHERE c.email = ? AND a.workspace_id = ?`,
    fromEmail,
    input.workspaceId,
  );
}

async function processScheduledJobs(env) {
  const [sequences, warmup, calendar] = await Promise.all([
    processDueSequenceEmails(env, { limit: 20 }),
    processDueWarmupEmails(env, { limit: 1 }),
    syncDueCalendarSources(env, 5),
  ]);
  return { sequences, warmup, calendar };
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

async function createAiInsight(env, input, auth) {
  const entity = normalizeEnum(input.entity || "account", new Set(["account", "contact"]), "entity");
  const entityId = cleanNullable(input.entityId || input.accountId || input.contactId);
  if (!entityId) throw httpError(400, "entityId is required");
  const context = entity === "account"
    ? await buildAccountInsightContext(env, entityId, input.workspaceId, auth)
    : await buildContactInsightContext(env, entityId, input.workspaceId);
  const generated = await generateAiInsight(env, entity, context);
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO ai_insights (
      id, workspace_id, entity, entity_id, created_by_user_id, provider, model,
      summary, next_steps_json, risks_json, score, prompt_json, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.workspaceId,
    entity,
    entityId,
    auth.user.id,
    generated.provider,
    generated.model || null,
    generated.summary,
    JSON.stringify(generated.nextSteps || []),
    JSON.stringify(generated.risks || []),
    generated.score ?? null,
    JSON.stringify(context),
    now,
  ).run();
  await recordAuditLog(env, { workspaceId: input.workspaceId, userId: auth.user.id, action: "ai_insight.create", resource: entity, resourceId: entityId, metadata: { provider: generated.provider, model: generated.model || null } });
  const insight = await getRequired(env, "SELECT * FROM ai_insights WHERE id = ?", id);
  return aiInsightResponse(insight);
}

async function buildAccountInsightContext(env, accountId, workspaceId, auth) {
  const account = await getAccount(env, accountId, workspaceId, auth);
  return {
    account: {
      id: account.id,
      name: account.name,
      domain: account.domain,
      segment: account.segment,
      status: account.status,
      source: account.source,
      observation: account.observation,
      owner: account.owner,
      customFields: account.customFields,
    },
    contacts: account.contacts.slice(0, 8).map((contact) => ({ name: contact.name, title: contact.title, status: contact.status, email: contact.email })),
    opportunities: account.opportunities.slice(0, 8).map((opportunity) => ({ name: opportunity.name, stage: opportunity.stage, valueCents: opportunity.value_cents, confidence: opportunity.confidence, closeDate: opportunity.close_date })),
    tasks: account.tasks.slice(0, 8).map((task) => ({ title: task.title, kind: task.kind, status: task.status, dueAt: task.due_at })),
    recentTimeline: account.timeline.slice(0, 12).map((item) => ({ type: item.type, title: item.title, detail: item.detail, happenedAt: item.happenedAt })),
  };
}

async function buildContactInsightContext(env, contactId, workspaceId) {
  const contact = await getContact(env, contactId, workspaceId);
  return {
    contact: { id: contact.id, name: contact.name, title: contact.title, status: contact.status, email: contact.email, phone: contact.phone, accountName: contact.account_name },
    opportunities: contact.opportunities.slice(0, 8).map((opportunity) => ({ name: opportunity.name, stage: opportunity.stage, valueCents: opportunity.value_cents, confidence: opportunity.confidence })),
    enrollments: contact.enrollments.slice(0, 8).map((item) => ({ sequence: item.sequence_name, status: item.status, step: item.current_step_order, nextSendAt: item.next_send_at })),
    tasks: contact.tasks.slice(0, 8).map((task) => ({ title: task.title, kind: task.kind, status: task.status, dueAt: task.due_at })),
    recentTimeline: contact.timeline.slice(0, 12).map((item) => ({ type: item.type, title: item.title, detail: item.detail, happenedAt: item.happenedAt })),
  };
}

async function generateAiInsight(env, entity, context) {
  if (cleanNullable(env.OPENAI_API_KEY)) {
    const generated = await generateOpenAiInsight(env, entity, context);
    if (generated) return generated;
  }
  return generateFallbackInsight(entity, context);
}

async function generateOpenAiInsight(env, entity, context) {
  const model = cleanNullable(env.OPENAI_MODEL) || "gpt-5-mini";
  const prompt = [
    "You are helping a CRM user decide the next best sales action.",
    "Return compact JSON only with keys: summary, nextSteps, risks, score.",
    "summary must be one short paragraph. nextSteps and risks must be arrays of short strings. score must be an integer 0-100.",
    `Entity type: ${entity}`,
    JSON.stringify(context),
  ].join("\n\n");
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
        text: { format: { type: "json_object" } },
      }),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const text = extractResponseText(payload);
    const parsed = parseJsonObject(text);
    if (!cleanNullable(parsed.summary)) return null;
    return normalizeGeneratedInsight({ ...parsed, provider: "openai", model });
  } catch {
    return null;
  }
}

function extractResponseText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const parts = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
      if (content.type === "text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n");
}

function normalizeGeneratedInsight(input) {
  return {
    provider: input.provider || "local",
    model: cleanNullable(input.model),
    summary: cleanNullable(input.summary) || "No summary was generated.",
    nextSteps: normalizeStringList(input.nextSteps || input.next_steps).slice(0, 6),
    risks: normalizeStringList(input.risks).slice(0, 6),
    score: clampScore(input.score),
  };
}

function generateFallbackInsight(entity, context) {
  const timeline = context.recentTimeline || [];
  const openTasks = (context.tasks || []).filter((task) => task.status !== "done");
  const opportunities = context.opportunities || [];
  const lastTouch = timeline[0]?.title || "No recent activity";
  const subject = entity === "account" ? context.account?.name : context.contact?.name;
  const status = entity === "account" ? context.account?.status : context.contact?.status;
  const nextSteps = [];
  if (openTasks.length) nextSteps.push(`Complete or reschedule ${openTasks[0].title}.`);
  if (opportunities.some((opportunity) => !["won", "lost"].includes(opportunity.stage))) nextSteps.push("Review the open opportunity and confirm the next buying milestone.");
  if (!timeline.some((item) => ["email", "communication", "calendar"].includes(item.type))) nextSteps.push("Create a direct touch with a relevant contact before adding more automation.");
  if (status === "replied") nextSteps.push("Respond personally while the conversation is warm.");
  if (!nextSteps.length) nextSteps.push("Add a concrete follow-up task with an owner and due date.");
  const risks = [];
  if (!timeline.length) risks.push("There is not enough activity history to infer intent.");
  if (openTasks.length > 3) risks.push("Several open tasks may indicate stalled execution.");
  if (!opportunities.length) risks.push("No opportunity is attached yet, so pipeline impact is unclear.");
  const score = Math.max(10, Math.min(90, 35 + timeline.length * 4 + opportunities.length * 10 - openTasks.length * 3));
  return normalizeGeneratedInsight({
    provider: "local",
    model: "heuristic",
    summary: `${subject || "This record"} is currently ${status || "unclassified"}. Latest signal: ${lastTouch}.`,
    nextSteps,
    risks,
    score,
  });
}

function normalizeStringList(value) {
  const items = Array.isArray(value) ? value : String(value || "").split(/\n/);
  return items.map((item) => cleanNullable(item)).filter(Boolean);
}

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
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

async function runAgentCommand(env, input, auth) {
  if (input.command === "create_account") {
    return { result: await createAccount(env, { ...(input.account || input.payload || {}), workspaceId: input.workspaceId, auth, auditUserId: auth.user.id }) };
  }
  if (input.command === "enroll_contact") {
    return { result: await enrollContact(env, { ...(input.payload || {}), workspaceId: input.workspaceId, auditUserId: auth.user.id }) };
  }
  if (input.command === "send_email") {
    return { result: await sendManualEmail(env, { ...(input.payload || {}), workspaceId: input.workspaceId, auditUserId: auth.user.id }) };
  }
  if (input.command === "run_sequences") {
    return { result: await processDueSequenceEmails(env, { limit: input.limit || 20 }) };
  }
  if (input.command === "run_warmup") {
    return { result: await processDueWarmupEmails(env, { limit: input.limit || 20 }) };
  }
  if (input.command === "create_task") {
    return { result: await createTask(env, { ...(input.payload || {}), workspaceId: input.workspaceId, auditUserId: auth.user.id }) };
  }
  if (input.command === "log_communication") {
    return { result: await createCommunication(env, { ...(input.payload || {}), workspaceId: input.workspaceId }, auth) };
  }
  if (input.command === "send_message") {
    return { result: await sendProviderMessage(env, { ...(input.payload || {}), workspaceId: input.workspaceId }, auth) };
  }
  if (input.command === "generate_ai_insight") {
    return { result: await createAiInsight(env, { ...(input.payload || {}), workspaceId: input.workspaceId }, auth) };
  }
  if (input.command === "import_calendar_ics") {
    return { result: await importCalendarIcs(env, { ...(input.payload || {}), workspaceId: input.workspaceId }, auth) };
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
    SELECT w.*, t.name AS team_name, COALESCE(wm.role, tm.role) AS workspace_role
    FROM workspaces w
    JOIN teams t ON t.id = w.team_id
    JOIN team_members tm ON tm.team_id = t.id
    LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = ?
    WHERE tm.user_id = ?
      AND (tm.role IN ('owner', 'admin') OR wm.user_id IS NOT NULL)
    ORDER BY t.created_at ASC, w.created_at ASC
  `).bind(auth.user.id, auth.user.id).all();
  return {
    user: auth.user,
    teams: teams.results,
    workspaces: workspaces.results,
    currentWorkspaceId: workspaceId,
  };
}

async function loginWithPassword(env, input) {
  await ensureBootstrapIdentity(env);
  requireFields(input, ["email", "password"]);
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND status = 'active'").bind(cleanEmail(input.email)).first();
  if (!user?.password_hash || !(await verifyPassword(input.password, user.password_hash))) {
    throw httpError(401, "Invalid email or password");
  }
  return createUserSession(env, user);
}

async function startOAuthLogin(_request, env, url) {
  ensureOAuthConfigured(env);
  const state = crypto.randomUUID().replaceAll("-", "");
  const authorizationUrl = new URL(env.OAUTH_AUTHORIZATION_URL);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", env.OAUTH_CLIENT_ID);
  authorizationUrl.searchParams.set("redirect_uri", oauthRedirectUri(env, url));
  authorizationUrl.searchParams.set("scope", env.OAUTH_SCOPES || "openid email profile");
  authorizationUrl.searchParams.set("state", state);
  const headers = new Headers({ location: authorizationUrl.toString() });
  headers.append("set-cookie", oauthStateCookie(state, url));
  return new Response(null, { status: 302, headers });
}

async function completeOAuthLogin(request, env, url) {
  ensureOAuthConfigured(env);
  const error = cleanNullable(url.searchParams.get("error"));
  if (error) throw httpError(401, `OAuth login failed: ${error}`);
  const code = cleanNullable(url.searchParams.get("code"));
  const state = cleanNullable(url.searchParams.get("state"));
  if (!code || !state || state !== readCookie(request, "uocrm_oauth_state")) throw httpError(401, "Invalid OAuth state");

  const tokenResponse = await fetch(env.OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "accept": "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: oauthRedirectUri(env, url),
      client_id: env.OAUTH_CLIENT_ID,
      client_secret: env.OAUTH_CLIENT_SECRET,
    }),
  });
  const token = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !token.access_token) throw httpError(401, "OAuth token exchange failed");

  const profileResponse = await fetch(env.OAUTH_USERINFO_URL, {
    headers: { authorization: `Bearer ${token.access_token}`, "accept": "application/json" },
  });
  const profile = await profileResponse.json().catch(() => ({}));
  if (!profileResponse.ok) throw httpError(401, "OAuth user info failed");

  const email = cleanEmail(profile.email);
  if (!email) throw httpError(401, "OAuth profile did not include an email");
  const user = await findOrCreateOAuthUser(env, { email, name: cleanNullable(profile.name) || cleanNullable(profile.given_name) || email.split("@")[0] });
  const session = await createUserSession(env, user);
  const headers = new Headers({ "content-type": "text/html; charset=utf-8" });
  headers.append("set-cookie", oauthStateCookie("", url, 0));
  return new Response(oauthSuccessHtml(session.token), { headers });
}

async function findOrCreateOAuthUser(env, input) {
  await ensureBootstrapIdentity(env);
  const existing = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND status = 'active'").bind(input.email).first();
  if (existing) return existing;
  const allowedDomains = normalizeDomainList(env.OAUTH_ALLOWED_DOMAINS);
  const domain = input.email.split("@")[1] || "";
  if (!allowedDomains.includes(domain)) throw httpError(403, "OAuth user is not allowed");
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO users (id, email, name, status, created_at, updated_at)
    VALUES (?, ?, ?, 'active', ?, ?)
  `).bind(id, input.email, input.name, now, now).run();
  const user = await getRequired(env, "SELECT * FROM users WHERE id = ?", id);
  await createTeam(env, { name: `${input.name}'s Team`, defaultWorkspaceName: "Sales" }, { user });
  return user;
}

async function createUserSession(env, user) {
  const token = `uocrm_session_${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await env.DB.prepare(`
    INSERT INTO user_sessions (id, user_id, token_hash, last_used_at, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), user.id, await sha256Hex(token), now, expiresAt, now, now).run();
  return {
    token,
    expiresAt,
    user: { id: user.id, email: user.email, name: user.name, status: user.status },
  };
}

async function setOwnPassword(env, input, auth) {
  requireFields(input, ["password"]);
  const password = String(input.password);
  if (password.length < 12) throw httpError(400, "Password must be at least 12 characters");
  const hash = await hashPassword(password);
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").bind(hash, now, auth.user.id).run();
  await recordAuditLog(env, { workspaceId: input.workspaceId || auth.workspaceId, userId: auth.user.id, action: "user.password.set", resource: "user", resourceId: auth.user.id, metadata: { email: auth.user.email } });
  return { ok: true };
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
  await env.DB.prepare(`
    INSERT OR IGNORE INTO workspace_members (id, workspace_id, user_id, role, created_at, updated_at)
    VALUES (?, ?, ?, 'owner', ?, ?)
  `).bind(crypto.randomUUID(), id, auth.user.id, now, now).run();
  await seedOpportunityStages(env, id);
  await recordAuditLog(env, { workspaceId: id, userId: auth.user.id, action: "workspace.create", resource: "workspace", resourceId: id, metadata: { name: input.name, teamId } });
  return getRequired(env, "SELECT * FROM workspaces WHERE id = ?", id);
}

async function seedOpportunityStages(env, workspaceId) {
  const now = new Date().toISOString();
  for (const stage of DEFAULT_OPPORTUNITY_STAGES) {
    await env.DB.prepare(`
      INSERT OR IGNORE INTO opportunity_stages (id, workspace_id, key, label, position, is_won, is_lost, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      workspaceId,
      stage.key,
      stage.label,
      stage.position,
      stage.is_won,
      stage.is_lost,
      now,
      now,
    ).run();
  }
}

async function listWorkspaceTokens(env, workspaceId, auth) {
  await requireWorkspaceRole(env, auth.user.id, workspaceId, ["owner", "admin"]);
  const rows = await env.DB.prepare(`
    SELECT wat.id, wat.workspace_id, wat.created_by_user_id, wat.name, wat.last_used_at, wat.revoked_at, wat.created_at, wat.updated_at, u.name AS created_by_name
    FROM workspace_api_tokens wat
    JOIN users u ON u.id = wat.created_by_user_id
    WHERE wat.workspace_id = ?
    ORDER BY wat.created_at DESC
  `).bind(workspaceId).all();
  return rows.results;
}

async function listTeamInvitations(env, workspaceId, auth) {
  const workspace = await getRequired(env, "SELECT w.*, t.id AS team_id FROM workspaces w JOIN teams t ON t.id = w.team_id WHERE w.id = ?", workspaceId);
  await requireWorkspaceRole(env, auth.user.id, workspaceId, ["owner", "admin"]);
  const rows = await env.DB.prepare(`
    SELECT ti.id, ti.team_id, ti.workspace_id, ti.invited_user_id, ti.invited_by_user_id, ti.email, ti.role, ti.accepted_at, ti.last_used_at, ti.created_at, u.name AS invited_by_name
    FROM team_invitations ti
    JOIN users u ON u.id = ti.invited_by_user_id
    WHERE ti.workspace_id = ?
    ORDER BY ti.created_at DESC
    LIMIT 100
  `).bind(workspaceId).all();
  return rows.results;
}

async function createTeamInvitation(env, input, auth) {
  requireFields(input, ["email"]);
  const workspace = await getRequired(env, "SELECT w.*, t.id AS team_id FROM workspaces w JOIN teams t ON t.id = w.team_id WHERE w.id = ?", input.workspaceId);
  await requireWorkspaceRole(env, auth.user.id, input.workspaceId, ["owner", "admin"]);
  const email = cleanEmail(input.email);
  const role = normalizeEnum(input.role || "member", TEAM_ROLES, "role");
  const name = cleanNullable(input.name) || email.split("@")[0];
  const now = new Date().toISOString();
  const userId = (await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first())?.id || crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO users (id, email, name, status, created_at, updated_at)
    VALUES (?, ?, ?, 'active', ?, ?)
    ON CONFLICT(email) DO UPDATE SET name = COALESCE(NULLIF(excluded.name, ''), users.name), updated_at = excluded.updated_at
  `).bind(userId, email, name, now, now).run();
  const user = await getRequired(env, "SELECT * FROM users WHERE email = ?", email);
  await env.DB.prepare(`
    INSERT INTO team_members (id, team_id, user_id, role, created_at, updated_at)
    VALUES (?, ?, ?, 'member', ?, ?)
    ON CONFLICT(team_id, user_id) DO UPDATE SET
      role = CASE WHEN team_members.role IN ('owner', 'admin') THEN team_members.role ELSE 'member' END,
      updated_at = excluded.updated_at
  `).bind(crypto.randomUUID(), workspace.team_id, user.id, now, now).run();
  await env.DB.prepare(`
    INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(workspace_id, user_id) DO UPDATE SET role = excluded.role, updated_at = excluded.updated_at
  `).bind(crypto.randomUUID(), workspace.id, user.id, role, now, now).run();
  const token = `uocrm_inv_${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
  const id = input.id || crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO team_invitations (id, team_id, workspace_id, invited_user_id, invited_by_user_id, email, role, token_hash, accepted_at, last_used_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
  `).bind(id, workspace.team_id, workspace.id, user.id, auth.user.id, email, role, await sha256Hex(token), now, now).run();
  await recordAuditLog(env, { workspaceId: workspace.id, userId: auth.user.id, action: "team_invitation.create", resource: "team_invitation", resourceId: id, metadata: { email, role, teamId: workspace.team_id } });
  return { id, email, role, workspaceId: workspace.id, teamId: workspace.team_id, token, createdAt: now };
}

async function listWebhooks(env, workspaceId, auth) {
  await requireWorkspaceRole(env, auth.user.id, workspaceId, ["owner", "admin"]);
  const [endpoints, deliveries] = await Promise.all([
    env.DB.prepare(`
      SELECT wh.*, u.name AS created_by_name
      FROM webhook_endpoints wh
      JOIN users u ON u.id = wh.created_by_user_id
      WHERE wh.workspace_id = ?
      ORDER BY wh.created_at DESC
    `).bind(workspaceId).all(),
    env.DB.prepare(`
      SELECT wd.*, wh.name AS endpoint_name
      FROM webhook_deliveries wd
      JOIN webhook_endpoints wh ON wh.id = wd.endpoint_id
      WHERE wd.workspace_id = ?
      ORDER BY wd.created_at DESC
      LIMIT 25
    `).bind(workspaceId).all(),
  ]);
  return {
    endpoints: endpoints.results.map((endpoint) => ({ ...endpoint, events: parseJsonArray(endpoint.events_json) })),
    deliveries: deliveries.results,
  };
}

async function listIntegrations(env, workspaceId, auth) {
  await requireWorkspaceRole(env, auth.user.id, workspaceId, ["owner", "admin"]);
  const [integrations, deliveries] = await Promise.all([
    env.DB.prepare(`
      SELECT wi.*, u.name AS created_by_name
      FROM workspace_integrations wi
      JOIN users u ON u.id = wi.created_by_user_id
      WHERE wi.workspace_id = ?
      ORDER BY wi.created_at DESC
    `).bind(workspaceId).all(),
    env.DB.prepare(`
      SELECT idl.*, wi.name AS integration_name, wi.type AS integration_type
      FROM integration_deliveries idl
      JOIN workspace_integrations wi ON wi.id = idl.integration_id
      WHERE idl.workspace_id = ?
      ORDER BY idl.created_at DESC
      LIMIT 25
    `).bind(workspaceId).all(),
  ]);
  return {
    integrations: integrations.results.map(integrationResponse),
    deliveries: deliveries.results,
  };
}

async function getEmailSettings(env, workspaceId) {
  const existing = await env.DB.prepare("SELECT * FROM workspace_email_settings WHERE workspace_id = ?").bind(workspaceId).first();
  return {
    workspace_id: workspaceId,
    open_tracking_enabled: existing?.open_tracking_enabled || 0,
    click_tracking_enabled: existing?.click_tracking_enabled || 0,
    created_at: existing?.created_at || null,
    updated_at: existing?.updated_at || null,
  };
}

async function updateEmailSettings(env, workspaceId, input, auth) {
  const now = new Date().toISOString();
  const openTracking = input.openTrackingEnabled || input.open_tracking_enabled ? 1 : 0;
  const clickTracking = input.clickTrackingEnabled || input.click_tracking_enabled ? 1 : 0;
  await env.DB.prepare(`
    INSERT INTO workspace_email_settings (workspace_id, open_tracking_enabled, click_tracking_enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(workspace_id) DO UPDATE SET
      open_tracking_enabled = excluded.open_tracking_enabled,
      click_tracking_enabled = excluded.click_tracking_enabled,
      updated_at = excluded.updated_at
  `).bind(workspaceId, openTracking, clickTracking, now, now).run();
  await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "email_settings.update", resource: "workspace_email_settings", resourceId: workspaceId, metadata: { openTracking, clickTracking } });
  return getEmailSettings(env, workspaceId);
}

async function listEmailSenders(env, workspaceId) {
  const rows = await env.DB.prepare(`
    SELECT wes.*, u.name AS created_by_name
    FROM workspace_email_senders wes
    LEFT JOIN users u ON u.id = wes.created_by_user_id
    WHERE wes.workspace_id = ?
    ORDER BY wes.status ASC, wes.created_at DESC
  `).bind(workspaceId).all();
  return rows.results;
}

async function listEmailInboundSources(env, workspaceId, revealWebhook = false) {
  const rows = await env.DB.prepare(`
    SELECT eis.*, u.name AS created_by_name
    FROM workspace_email_inbound_sources eis
    LEFT JOIN users u ON u.id = eis.created_by_user_id
    WHERE eis.workspace_id = ?
    ORDER BY eis.status ASC, eis.created_at DESC
  `).bind(workspaceId).all();
  return rows.results.map((source) => emailInboundSourceResponse(source, revealWebhook));
}

async function createEmailInboundSource(env, input, auth) {
  requireFields(input, ["name"]);
  const provider = normalizeEnum(input.provider || "generic", EMAIL_INBOUND_SOURCE_PROVIDERS, "provider");
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  const inboundKey = input.inboundKey || crypto.randomUUID().replaceAll("-", "");
  await env.DB.prepare(`
    INSERT INTO workspace_email_inbound_sources (
      id, workspace_id, created_by_user_id, name, provider, inbound_key,
      status, last_received_at, last_error, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'active', NULL, NULL, ?, ?)
  `).bind(id, input.workspaceId, auth.user.id, input.name.trim(), provider, inboundKey, now, now).run();
  await recordAuditLog(env, { workspaceId: input.workspaceId, userId: auth.user.id, action: "email_inbound_source.create", resource: "workspace_email_inbound_source", resourceId: id, metadata: { name: input.name, provider } });
  return emailInboundSourceResponse(await getRequired(env, "SELECT * FROM workspace_email_inbound_sources WHERE id = ? AND workspace_id = ?", id, input.workspaceId), true);
}

async function disableEmailInboundSource(env, id, workspaceId, auth) {
  const source = await getRequired(env, "SELECT * FROM workspace_email_inbound_sources WHERE id = ? AND workspace_id = ?", id, workspaceId);
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE workspace_email_inbound_sources SET status = 'disabled', updated_at = ? WHERE id = ? AND workspace_id = ?").bind(now, id, workspaceId).run();
  await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "email_inbound_source.disable", resource: "workspace_email_inbound_source", resourceId: id, metadata: { name: source.name, provider: source.provider } });
  return { ok: true };
}

async function createEmailSender(env, input, auth) {
  requireFields(input, ["email"]);
  const email = cleanEmail(input.email);
  if (!email) throw httpError(400, "Valid sender email is required");
  const dailyLimit = clampInteger(input.dailyLimit ?? input.daily_limit ?? 100, 1, 1000, "dailyLimit");
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO workspace_email_senders (
      id, workspace_id, created_by_user_id, email, name, daily_limit, sent_today,
      sent_on, last_used_at, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 0, NULL, NULL, 'active', ?, ?)
    ON CONFLICT(workspace_id, email) DO UPDATE SET
      name = excluded.name,
      daily_limit = excluded.daily_limit,
      status = 'active',
      updated_at = excluded.updated_at
  `).bind(id, input.workspaceId, auth.user.id, email, cleanNullable(input.name), dailyLimit, now, now).run();
  await recordAuditLog(env, { workspaceId: input.workspaceId, userId: auth.user.id, action: "email_sender.upsert", resource: "workspace_email_sender", resourceId: id, metadata: { email, dailyLimit } });
  return getRequired(env, "SELECT * FROM workspace_email_senders WHERE workspace_id = ? AND email = ?", input.workspaceId, email);
}

async function disableEmailSender(env, id, workspaceId, auth) {
  const sender = await getRequired(env, "SELECT * FROM workspace_email_senders WHERE id = ? AND workspace_id = ?", id, workspaceId);
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE workspace_email_senders SET status = 'disabled', updated_at = ? WHERE id = ? AND workspace_id = ?").bind(now, id, workspaceId).run();
  await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "email_sender.disable", resource: "workspace_email_sender", resourceId: id, metadata: { email: sender.email } });
  return { ok: true };
}

async function chooseEmailSender(env, workspaceId) {
  const today = new Date().toISOString().slice(0, 10);
  await env.DB.prepare("UPDATE workspace_email_senders SET sent_today = 0, sent_on = ? WHERE workspace_id = ? AND status = 'active' AND sent_on IS NOT NULL AND sent_on != ?").bind(today, workspaceId, today).run();
  const sender = await env.DB.prepare(`
    SELECT *
    FROM workspace_email_senders
    WHERE workspace_id = ? AND status = 'active' AND (sent_on IS NULL OR sent_on = ?) AND sent_today < daily_limit
    ORDER BY sent_today ASC, COALESCE(last_used_at, '1970-01-01T00:00:00.000Z') ASC
    LIMIT 1
  `).bind(workspaceId, today).first();
  if (sender) return sender;
  const fallbackEmail = cleanEmail(env.CRM_FROM_EMAIL || env.SMTP_USERNAME);
  if (!fallbackEmail) return null;
  return { id: null, email: fallbackEmail, name: env.CRM_FROM_NAME || null };
}

async function recordEmailSenderUsage(env, sender, workspaceId) {
  if (!sender?.id) return;
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  await env.DB.prepare(`
    UPDATE workspace_email_senders
    SET sent_today = CASE WHEN sent_on = ? THEN sent_today + 1 ELSE 1 END,
        sent_on = ?,
        last_used_at = ?,
        updated_at = ?
    WHERE id = ? AND workspace_id = ?
  `).bind(today, today, now, now, sender.id, workspaceId).run();
}

async function createWebhook(env, input, auth) {
  requireFields(input, ["name", "url"]);
  await requireWorkspaceRole(env, auth.user.id, input.workspaceId, ["owner", "admin"]);
  const url = normalizeWebhookUrl(input.url);
  const events = normalizeWebhookEvents(input.events);
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO webhook_endpoints (id, workspace_id, created_by_user_id, name, url, events_json, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).bind(id, input.workspaceId, auth.user.id, input.name.trim(), url, JSON.stringify(events), now, now).run();
  await recordAuditLog(env, { workspaceId: input.workspaceId, userId: auth.user.id, action: "webhook.create", resource: "webhook_endpoint", resourceId: id, metadata: { name: input.name, events } });
  return { ...(await getRequired(env, "SELECT * FROM webhook_endpoints WHERE id = ? AND workspace_id = ?", id, input.workspaceId)), events };
}

async function disableWebhook(env, id, workspaceId, auth) {
  await requireWorkspaceRole(env, auth.user.id, workspaceId, ["owner", "admin"]);
  const existing = await getRequired(env, "SELECT * FROM webhook_endpoints WHERE id = ? AND workspace_id = ?", id, workspaceId);
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE webhook_endpoints SET status = 'disabled', updated_at = ? WHERE id = ? AND workspace_id = ?").bind(now, id, workspaceId).run();
  await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "webhook.disable", resource: "webhook_endpoint", resourceId: id, metadata: { name: existing.name } });
  return { ok: true };
}

async function createIntegration(env, input, auth) {
  requireFields(input, ["name", "type"]);
  await requireWorkspaceRole(env, auth.user.id, input.workspaceId, ["owner", "admin"]);
  const type = normalizeEnum(input.type, INTEGRATION_TYPES, "type");
  const config = normalizeIntegrationConfig(type, input);
  const events = normalizeWebhookEvents(input.events);
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO workspace_integrations (id, workspace_id, created_by_user_id, type, name, config_json, events_json, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).bind(id, input.workspaceId, auth.user.id, type, input.name.trim(), JSON.stringify(config), JSON.stringify(events), now, now).run();
  await recordAuditLog(env, { workspaceId: input.workspaceId, userId: auth.user.id, action: "integration.create", resource: "workspace_integration", resourceId: id, metadata: { name: input.name, type, events } });
  return integrationResponse(await getRequired(env, "SELECT * FROM workspace_integrations WHERE id = ? AND workspace_id = ?", id, input.workspaceId));
}

async function disableIntegration(env, id, workspaceId, auth) {
  await requireWorkspaceRole(env, auth.user.id, workspaceId, ["owner", "admin"]);
  const existing = await getRequired(env, "SELECT * FROM workspace_integrations WHERE id = ? AND workspace_id = ?", id, workspaceId);
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE workspace_integrations SET status = 'disabled', updated_at = ? WHERE id = ? AND workspace_id = ?").bind(now, id, workspaceId).run();
  await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "integration.disable", resource: "workspace_integration", resourceId: id, metadata: { name: existing.name, type: existing.type } });
  return { ok: true };
}

async function deliverWebhooks(env, workspaceId, event, resourceId, payload) {
  const endpoints = await env.DB.prepare(`
    SELECT * FROM webhook_endpoints
    WHERE workspace_id = ? AND status = 'active'
  `).bind(workspaceId).all();
  for (const endpoint of endpoints.results) {
    const events = parseJsonArray(endpoint.events_json);
    if (events.length && !events.includes(event)) continue;
    await deliverWebhook(env, endpoint, event, resourceId, payload);
  }
  await deliverIntegrations(env, workspaceId, event, resourceId, payload);
}

async function deliverWebhook(env, endpoint, event, resourceId, payload) {
  const now = new Date().toISOString();
  let status = "failed";
  let statusCode = null;
  let error = null;
  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "UserOrbit-CRM-Webhook" },
      body: JSON.stringify({ event, workspaceId: endpoint.workspace_id, resourceId, data: payload, sentAt: now }),
    });
    statusCode = response.status;
    status = response.ok ? "sent" : "failed";
    if (!response.ok) error = `HTTP ${response.status}`;
  } catch (caught) {
    error = caught.message || String(caught);
  }
  await env.DB.prepare(`
    INSERT INTO webhook_deliveries (id, workspace_id, endpoint_id, event, resource_id, status, status_code, error, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), endpoint.workspace_id, endpoint.id, event, cleanNullable(resourceId), status, statusCode, cleanNullable(error), now).run();
}

async function deliverIntegrations(env, workspaceId, event, resourceId, payload) {
  const integrations = await env.DB.prepare(`
    SELECT * FROM workspace_integrations
    WHERE workspace_id = ? AND status = 'active'
  `).bind(workspaceId).all();
  for (const integration of integrations.results) {
    const events = parseJsonArray(integration.events_json);
    if (events.length && !events.includes(event)) continue;
    if (integration.type === "slack") await deliverSlackIntegration(env, integration, event, resourceId, payload);
  }
}

async function deliverSlackIntegration(env, integration, event, resourceId, payload) {
  const now = new Date().toISOString();
  const config = parseJsonObject(integration.config_json);
  let status = "failed";
  let statusCode = null;
  let error = null;
  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "UserOrbit-CRM-Integration" },
      body: JSON.stringify(slackMessageForEvent(event, payload)),
    });
    statusCode = response.status;
    status = response.ok ? "sent" : "failed";
    if (!response.ok) error = `HTTP ${response.status}`;
  } catch (caught) {
    error = caught.message || String(caught);
  }
  await env.DB.prepare(`
    INSERT INTO integration_deliveries (id, workspace_id, integration_id, event, resource_id, status, status_code, error, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), integration.workspace_id, integration.id, event, cleanNullable(resourceId), status, statusCode, cleanNullable(error), now).run();
}

async function createWorkspaceToken(env, input, auth) {
  const workspace = await getRequired(env, "SELECT w.*, t.id AS team_id FROM workspaces w JOIN teams t ON t.id = w.team_id WHERE w.id = ?", input.workspaceId);
  await requireWorkspaceRole(env, auth.user.id, input.workspaceId, ["owner", "admin"]);
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
  await requireWorkspaceRole(env, auth.user.id, workspaceId, ["owner", "admin"]);
  const existing = await getRequired(env, "SELECT * FROM workspace_api_tokens WHERE id = ? AND workspace_id = ?", id, workspaceId);
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE workspace_api_tokens SET revoked_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?")
    .bind(now, now, id, workspaceId)
    .run();
  await recordAuditLog(env, { workspaceId, userId: auth.user.id, action: "workspace_token.revoke", resource: "workspace_api_token", resourceId: id, metadata: { name: existing.name } });
  return { ok: true, revokedAt: now };
}

async function listAuditLogs(env, workspaceId, auth) {
  await requireWorkspaceRole(env, auth.user.id, workspaceId, ["owner", "admin"]);
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
    await requireWorkspaceRole(env, auth.user.id, requested, WORKSPACE_READ_ROLES);
    return requested;
  }
  return auth.workspaceId || resolveDefaultWorkspaceId(env, auth);
}

async function resolveDefaultWorkspaceId(env, auth) {
  const workspace = await env.DB.prepare(`
    SELECT w.id
    FROM workspaces w
    JOIN team_members tm ON tm.team_id = w.team_id
    LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = ?
    WHERE tm.user_id = ?
      AND (tm.role IN ('owner', 'admin') OR wm.user_id IS NOT NULL)
    ORDER BY w.created_at ASC
    LIMIT 1
  `).bind(auth.user.id, auth.user.id).first();
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

  const from = message.fromEmail || env.CRM_FROM_EMAIL || env.SMTP_USERNAME;
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
  const fromEmail = message.fromEmail || env.CRM_FROM_EMAIL || env.SMTP_USERNAME;
  const fromName = message.fromName || env.CRM_FROM_NAME || "UserOrbit";
  const messageDomain = emailDomain(fromEmail) || smtpIdentityDomain(env);
  const textBody = message.tracking?.clickTrackingEnabled ? rewriteTrackedLinks(message.body, message.tracking) : message.body;
  const headers = [
    `From: ${formatAddress(fromName, fromEmail)}`,
    `To: ${formatAddress(message.toName, message.to)}`,
    `Reply-To: ${formatAddress(fromName, fromEmail)}`,
    `Subject: ${encodeHeader(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${messageDomain}>`,
    "MIME-Version: 1.0",
  ];
  if (!message.tracking?.openTrackingEnabled) {
    return `${[...headers, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: 8bit"].join("\r\n")}\r\n\r\n${escapeSmtpBody(textBody)}`;
  }

  const boundary = `uocrm_${crypto.randomUUID().replaceAll("-", "")}`;
  const htmlBody = buildTrackedHtmlBody(message.body, message.tracking);
  return [
    ...headers,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    escapeSmtpBody(textBody),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    escapeSmtpBody(htmlBody),
    `--${boundary}--`,
  ].join("\r\n");
}

function emailTrackingEnabled(settings) {
  return Boolean(settings?.open_tracking_enabled || settings?.click_tracking_enabled);
}

function buildEmailTracking(baseUrl, trackingId, settings) {
  if (!trackingId || !emailTrackingEnabled(settings)) return null;
  const normalizedBase = cleanNullable(baseUrl)?.replace(/\/+$/, "");
  if (!normalizedBase) return null;
  return {
    id: trackingId,
    baseUrl: normalizedBase,
    openTrackingEnabled: Boolean(settings.open_tracking_enabled),
    clickTrackingEnabled: Boolean(settings.click_tracking_enabled),
  };
}

function rewriteTrackedLinks(body, tracking) {
  if (!tracking?.clickTrackingEnabled) return body;
  return String(body || "").replace(/https?:\/\/[^\s<>"')]+/g, (url) => trackingClickUrl(tracking, url));
}

function buildTrackedHtmlBody(body, tracking) {
  const linked = linkifyHtmlBody(String(body || ""), tracking);
  const pixel = tracking?.openTrackingEnabled ? `<img src="${escapeHtml(`${tracking.baseUrl}/t/open/${tracking.id}`)}" width="1" height="1" alt="" style="display:none" />` : "";
  return `<!doctype html><html><body>${linked}${pixel}</body></html>`;
}

function trackingClickUrl(tracking, url) {
  return `${tracking.baseUrl}/t/click/${tracking.id}?u=${encodeURIComponent(url)}`;
}

function linkifyHtmlBody(body, tracking) {
  let html = "";
  let cursor = 0;
  const pattern = /https?:\/\/[^\s<>"')]+/g;
  for (const match of body.matchAll(pattern)) {
    const url = match[0];
    html += escapeHtml(body.slice(cursor, match.index)).replace(/\r?\n/g, "<br>");
    const href = tracking?.clickTrackingEnabled ? trackingClickUrl(tracking, url) : url;
    html += `<a href="${escapeHtml(href)}">${escapeHtml(url)}</a>`;
    cursor = match.index + url.length;
  }
  html += escapeHtml(body.slice(cursor)).replace(/\r?\n/g, "<br>");
  return html;
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
      subject, body, provider_message_id, error, sent_at, tracking_id, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      id,
      input.contact.id,
      input.contact.account_id,
      cleanNullable(input.sequenceId),
      cleanNullable(input.sequenceStepId),
      input.direction || "outbound",
      input.status,
      input.subject,
      input.body,
      cleanNullable(input.providerMessageId),
      cleanNullable(input.error),
      cleanNullable(input.sentAt),
      cleanNullable(input.trackingId),
      now,
    )
    .run();

  return getRequired(env, "SELECT * FROM email_events WHERE id = ?", id);
}

async function recordEmailOpen(env, trackingId) {
  const id = cleanNullable(trackingId);
  if (id) {
    const now = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE email_events
      SET open_count = open_count + 1,
          first_opened_at = COALESCE(first_opened_at, ?),
          last_opened_at = ?
      WHERE tracking_id = ?
    `).bind(now, now, id).run();
  }
  return new Response(base64Decode("R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="), {
    headers: {
      "content-type": "image/gif",
      "cache-control": "no-store, max-age=0",
    },
  });
}

async function recordEmailClick(env, trackingId, encodedUrl) {
  const target = safeTrackingRedirect(encodedUrl);
  const id = cleanNullable(trackingId);
  if (id) {
    const now = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE email_events
      SET click_count = click_count + 1,
          first_clicked_at = COALESCE(first_clicked_at, ?),
          last_clicked_at = ?
      WHERE tracking_id = ?
    `).bind(now, now, id).run();
  }
  return Response.redirect(target || "/", 302);
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

async function getAccount(env, id, workspaceId, auth = null) {
  const account = await getRequired(env, "SELECT * FROM accounts WHERE id = ? AND workspace_id = ?", id, workspaceId);
  const [contacts, opportunities, tasks, emails, communications, calendarEvents, customFields, aiInsights] = await Promise.all([
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
    env.DB.prepare(`
      SELECT ce.*, c.name AS contact_name, c.email AS contact_email, u.name AS created_by_name
      FROM communication_events ce
      LEFT JOIN contacts c ON c.id = ce.contact_id
      LEFT JOIN users u ON u.id = ce.created_by_user_id
      WHERE ce.account_id = ? AND ce.workspace_id = ?
      ORDER BY ce.occurred_at DESC
      LIMIT 100
    `).bind(id, workspaceId).all(),
    env.DB.prepare(`
      SELECT ce.*, c.name AS contact_name, c.email AS contact_email, u.name AS created_by_name
      FROM calendar_events ce
      LEFT JOIN contacts c ON c.id = ce.contact_id
      LEFT JOIN users u ON u.id = ce.created_by_user_id
      WHERE ce.account_id = ? AND ce.workspace_id = ?
      ORDER BY ce.starts_at DESC
      LIMIT 100
    `).bind(id, workspaceId).all(),
    getCustomFieldValues(env, workspaceId, "account", id, auth),
    listAiInsights(env, workspaceId, "account", id),
  ]);

  return {
    ...account,
    contacts: contacts.results,
    opportunities: opportunities.results,
    tasks: tasks.results,
    emails: emails.results,
    communications: communications.results,
    calendarEvents: calendarEvents.results.map((row) => ({ ...row, attendee_emails: parseJsonArray(row.attendee_emails_json) })),
    customFields,
    aiInsights,
    timeline: buildAccountTimeline({ account, contacts: contacts.results, opportunities: opportunities.results, tasks: tasks.results, emails: emails.results, communications: communications.results, calendarEvents: calendarEvents.results }),
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
  const [tasks, opportunities, enrollments, emails, communications, calendarEvents, aiInsights] = await Promise.all([
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
    env.DB.prepare(`
      SELECT ce.*, u.name AS created_by_name
      FROM communication_events ce
      LEFT JOIN users u ON u.id = ce.created_by_user_id
      WHERE ce.contact_id = ? AND ce.workspace_id = ?
      ORDER BY ce.occurred_at DESC
      LIMIT 100
    `).bind(id, workspaceId).all(),
    env.DB.prepare(`
      SELECT ce.*, u.name AS created_by_name
      FROM calendar_events ce
      LEFT JOIN users u ON u.id = ce.created_by_user_id
      WHERE ce.contact_id = ? AND ce.workspace_id = ?
      ORDER BY ce.starts_at DESC
      LIMIT 100
    `).bind(id, workspaceId).all(),
    listAiInsights(env, workspaceId, "contact", id),
  ]);
  return {
    ...contact,
    tasks: tasks.results,
    opportunities: opportunities.results,
    enrollments: enrollments.results,
    emails: emails.results,
    communications: communications.results,
    calendarEvents: calendarEvents.results.map((row) => ({ ...row, attendee_emails: parseJsonArray(row.attendee_emails_json) })),
    aiInsights,
    timeline: buildContactTimeline({ contact, tasks: tasks.results, opportunities: opportunities.results, enrollments: enrollments.results, emails: emails.results, communications: communications.results, calendarEvents: calendarEvents.results }),
  };
}

async function listAiInsights(env, workspaceId, entity, entityId) {
  const rows = await env.DB.prepare(`
    SELECT ai.*, u.name AS created_by_name
    FROM ai_insights ai
    LEFT JOIN users u ON u.id = ai.created_by_user_id
    WHERE ai.workspace_id = ? AND ai.entity = ? AND ai.entity_id = ?
    ORDER BY ai.created_at DESC
    LIMIT 10
  `).bind(workspaceId, entity, entityId).all();
  return rows.results.map(aiInsightResponse);
}

function aiInsightResponse(row) {
  return {
    ...row,
    nextSteps: parseJsonArray(row.next_steps_json),
    risks: parseJsonArray(row.risks_json),
  };
}

async function getCustomFieldValues(env, workspaceId, entity, entityId, auth = null) {
  const role = auth ? await getEffectiveWorkspaceRole(env, auth.user.id, workspaceId) : "owner";
  const rows = await env.DB.prepare(`
    SELECT cf.id, cf.name, cf.key, cf.type, cf.options_json, cf.read_roles_json, cf.write_roles_json, cfv.value
    FROM custom_fields cf
    LEFT JOIN custom_field_values cfv ON cfv.field_id = cf.id AND cfv.entity_id = ?
    WHERE cf.workspace_id = ? AND cf.entity = ?
    ORDER BY cf.created_at ASC
  `).bind(entityId, workspaceId, entity).all();
  return rows.results
    .filter((row) => canReadCustomField(row, role))
    .map((row) => ({ ...customFieldResponse(row), value: row.value || "" }));
}

async function upsertCustomFieldValues(env, workspaceId, entity, entityId, values, auth = null) {
  await assertWritableCustomFieldValues(env, workspaceId, entity, values, auth);
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

async function assertWritableCustomFieldValues(env, workspaceId, entity, values, auth = null) {
  const role = auth ? await getEffectiveWorkspaceRole(env, auth.user.id, workspaceId) : "owner";
  const fields = await env.DB.prepare("SELECT * FROM custom_fields WHERE workspace_id = ? AND entity = ?").bind(workspaceId, entity).all();
  const byKey = new Map(fields.results.map((field) => [field.key, field]));
  for (const key of Object.keys(values || {})) {
    const field = byKey.get(key);
    if (!field) continue;
    if (!canWriteCustomField(field, role)) throw httpError(403, `Cannot write restricted custom field: ${key}`);
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

function buildAccountTimeline({ account, contacts, opportunities, tasks, emails, communications = [], calendarEvents = [] }) {
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
    ...communications.map((event) => ({
      id: `communication:${event.id}`,
      type: event.type,
      title: event.subject,
      detail: [event.contact_name || event.contact_email, event.direction, event.outcome, event.created_by_name].filter(Boolean).join(" · "),
      happenedAt: event.occurred_at || event.created_at,
    })),
    ...calendarEvents.map((event) => ({
      id: `calendar:${event.id}`,
      type: "calendar",
      title: event.title,
      detail: [event.contact_name || event.contact_email, event.location, event.meeting_url, event.created_by_name].filter(Boolean).join(" · "),
      happenedAt: event.starts_at || event.created_at,
    })),
  ];
  return items.sort((a, b) => String(b.happenedAt || "").localeCompare(String(a.happenedAt || "")));
}

function buildContactTimeline({ contact, tasks, opportunities, enrollments, emails, communications = [], calendarEvents = [] }) {
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
    ...communications.map((event) => ({
      id: `communication:${event.id}`,
      type: event.type,
      title: event.subject,
      detail: [event.direction, event.outcome, event.created_by_name].filter(Boolean).join(" · "),
      happenedAt: event.occurred_at || event.created_at,
    })),
    ...calendarEvents.map((event) => ({
      id: `calendar:${event.id}`,
      type: "calendar",
      title: event.title,
      detail: [event.location, event.meeting_url, event.created_by_name].filter(Boolean).join(" · "),
      happenedAt: event.starts_at || event.created_at,
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
    `SELECT c.*, a.name AS account_name, a.observation, a.workspace_id
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
  if (apiToken) {
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

  const session = await env.DB.prepare(`
    SELECT us.*, u.id AS user_id, u.email, u.name AS user_name, u.status AS user_status
    FROM user_sessions us
    JOIN users u ON u.id = us.user_id
    WHERE us.token_hash = ?
      AND us.expires_at > ?
      AND u.status = 'active'
  `).bind(await sha256Hex(token), new Date().toISOString()).first();
  if (session) {
    await env.DB.prepare("UPDATE user_sessions SET last_used_at = ?, updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), new Date().toISOString(), session.id)
      .run();
    return {
      kind: "session",
      workspaceId: null,
      user: {
        id: session.user_id,
        email: session.email,
        name: session.user_name,
        status: session.user_status,
      },
    };
  }

  const inviteToken = await env.DB.prepare(`
    SELECT ti.*, u.email, u.name AS user_name, u.status AS user_status
    FROM team_invitations ti
    JOIN users u ON u.id = ti.invited_user_id
    WHERE ti.token_hash = ?
  `).bind(await sha256Hex(token)).first();
  if (!inviteToken) throw httpError(401, "Unauthorized");

  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE team_invitations SET accepted_at = COALESCE(accepted_at, ?), last_used_at = ?, updated_at = ? WHERE id = ?")
    .bind(now, now, now, inviteToken.id)
    .run();

  return {
    kind: "team_invitation",
    workspaceId: inviteToken.workspace_id,
    user: {
      id: inviteToken.invited_user_id,
      email: inviteToken.email,
      name: inviteToken.user_name,
      status: inviteToken.user_status,
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

async function requireWorkspaceWrite(env, auth, workspaceId) {
  return requireWorkspaceRole(env, auth.user.id, workspaceId, WORKSPACE_WRITE_ROLES);
}

async function requireWorkspaceAdmin(env, auth, workspaceId) {
  return requireWorkspaceRole(env, auth.user.id, workspaceId, WORKSPACE_ADMIN_ROLES);
}

async function requireWorkspaceRole(env, userId, workspaceId, roles) {
  const workspace = await getRequired(env, "SELECT w.*, t.id AS team_id FROM workspaces w JOIN teams t ON t.id = w.team_id WHERE w.id = ?", workspaceId);
  const teamMembership = await env.DB.prepare("SELECT role FROM team_members WHERE user_id = ? AND team_id = ?")
    .bind(userId, workspace.team_id)
    .first();
  if (teamMembership && ["owner", "admin"].includes(teamMembership.role)) return { role: teamMembership.role, source: "team" };

  const workspaceMembership = await env.DB.prepare("SELECT role FROM workspace_members WHERE user_id = ? AND workspace_id = ?")
    .bind(userId, workspaceId)
    .first();
  if (!workspaceMembership || !roles.includes(workspaceMembership.role)) throw httpError(403, "Forbidden");
  return { role: workspaceMembership.role, source: "workspace" };
}

async function getEffectiveWorkspaceRole(env, userId, workspaceId) {
  return (await requireWorkspaceRole(env, userId, workspaceId, WORKSPACE_READ_ROLES)).role;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  const key = await pbkdf2(password, salt, iterations);
  return `pbkdf2_sha256$${iterations}$${base64Encode(salt)}$${base64Encode(key)}`;
}

async function verifyPassword(password, encoded) {
  const [scheme, iterationsText, saltText, keyText] = String(encoded || "").split("$");
  if (scheme !== "pbkdf2_sha256") return false;
  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations < 100000) return false;
  const salt = base64Decode(saltText);
  const expected = base64Decode(keyText);
  const actual = await pbkdf2(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

function base64Encode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64Decode(value) {
  const binary = atob(value || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function requireFields(input, fields) {
  for (const field of fields) {
    if (!input?.[field]) throw httpError(400, `Missing required field: ${field}`);
  }
}

function changedInputFields(input, fields) {
  return fields.filter((field) => Object.prototype.hasOwnProperty.call(input, field));
}

function normalizeEnum(value, allowed, field) {
  if (!allowed.has(value)) throw httpError(400, `Invalid ${field}: ${value}`);
  return value;
}

function normalizeRoleList(value, fallback) {
  const values = Array.isArray(value) ? value : String(value || "").split(/[\n,]/);
  const roles = [...new Set(values.map((role) => String(role).trim()).filter((role) => WORKSPACE_READ_ROLES.includes(role)))];
  return roles.length ? roles : [...fallback];
}

function ensureOAuthConfigured(env) {
  const required = ["OAUTH_AUTHORIZATION_URL", "OAUTH_TOKEN_URL", "OAUTH_USERINFO_URL", "OAUTH_CLIENT_ID", "OAUTH_CLIENT_SECRET"];
  for (const key of required) {
    if (!cleanNullable(env[key])) throw httpError(400, "OAuth is not configured");
  }
}

function oauthRedirectUri(env, url) {
  const origin = cleanNullable(env.CRM_PUBLIC_URL) || url.origin;
  return `${origin.replace(/\/$/, "")}/api/auth/oauth/callback`;
}

function oauthStateCookie(state, url, maxAge = 600) {
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `uocrm_oauth_state=${encodeURIComponent(state)}; Path=/api/auth/oauth; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

function readCookie(request, name) {
  const cookies = String(request.headers.get("cookie") || "").split(/;\s*/);
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function normalizeDomainList(value) {
  return String(value || "").split(/[\s,]+/).map((domain) => cleanDomain(domain)).filter(Boolean);
}

function customFieldReadRoles(field) {
  return normalizeRoleList(parseJsonArray(field.read_roles_json), WORKSPACE_READ_ROLES);
}

function customFieldWriteRoles(field) {
  return normalizeRoleList(parseJsonArray(field.write_roles_json), WORKSPACE_WRITE_ROLES);
}

function canReadCustomField(field, role) {
  return ["owner", "admin"].includes(role) || customFieldReadRoles(field).includes(role);
}

function canWriteCustomField(field, role) {
  return ["owner", "admin"].includes(role) || customFieldWriteRoles(field).includes(role);
}

function customFieldResponse(field) {
  return {
    ...field,
    options: parseJsonArray(field.options_json),
    read_roles: customFieldReadRoles(field),
    write_roles: customFieldWriteRoles(field),
  };
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

function extractEmailAddress(value) {
  const cleaned = cleanNullable(value);
  if (!cleaned) return "";
  const match = cleaned.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return cleanEmail(match ? match[0] : cleaned);
}

function cleanDomain(value) {
  const cleaned = cleanNullable(value);
  return cleaned ? cleaned.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "") : "";
}

function acceptsHtml(request) {
  return (request.headers.get("accept") || "").includes("text/html");
}

function htmlResponse(body, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

function oauthSuccessHtml(token) {
  const escaped = escapeHtmlText(token);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Signed in</title></head><body><script>localStorage.setItem("crmApiToken", "${escaped}"); location.replace("/app");</script><p>Signed in. Redirecting...</p></body></html>`;
}

function leadFormNotFoundHtml() {
  return "<!doctype html><html><head><meta charset=\"utf-8\"><title>Lead form not found</title></head><body><h1>Lead form not found</h1></body></html>";
}

function publicLeadFormHtml(form) {
  const title = escapeHtmlText(form.name);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6f4ef; color: #1f2933; }
    main { max-width: 560px; margin: 8vh auto; padding: 24px; }
    form { display: grid; gap: 14px; background: #fff; border: 1px solid #d9d5ca; border-radius: 8px; padding: 24px; }
    h1 { margin: 0 0 18px; font-size: 30px; }
    label { display: grid; gap: 6px; font-size: 14px; font-weight: 650; }
    input, textarea { box-sizing: border-box; width: 100%; border: 1px solid #c7c1b5; border-radius: 6px; padding: 11px 12px; font: inherit; }
    textarea { min-height: 110px; resize: vertical; }
    button { border: 0; border-radius: 6px; padding: 12px 14px; background: #0f766e; color: #fff; font: inherit; font-weight: 750; cursor: pointer; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <form method="post">
      <label>Company<input name="company" required autocomplete="organization" /></label>
      <label>Domain<input name="domain" placeholder="example.com" /></label>
      <label>Your name<input name="contactName" required autocomplete="name" /></label>
      <label>Email<input name="email" type="email" required autocomplete="email" /></label>
      <label>Title<input name="title" autocomplete="organization-title" /></label>
      <label>Message<textarea name="message"></textarea></label>
      <label class="hidden">Website<input name="website" tabindex="-1" autocomplete="off" /></label>
      <button>Submit</button>
    </form>
  </main>
</body>
</html>`;
}

function leadFormSuccessHtml(form) {
  const title = escapeHtmlText(form.name);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>body{font-family:Inter,ui-sans-serif,system-ui;margin:0;background:#f6f4ef;color:#1f2933}main{max-width:560px;margin:10vh auto;padding:24px}section{background:#fff;border:1px solid #d9d5ca;border-radius:8px;padding:24px}h1{margin-top:0}</style></head><body><main><section><h1>Thanks</h1><p>Your details were sent.</p></section></main></body></html>`;
}

function safeTrackingRedirect(value) {
  const decoded = cleanNullable(value);
  if (!decoded) return null;
  try {
    const url = new URL(decoded);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeWebhookUrl(value) {
  const url = cleanNullable(value);
  if (!url || !/^https?:\/\//i.test(url)) throw httpError(400, "Webhook URL must start with http:// or https://");
  return url;
}

function normalizeCalendarSourceUrl(value) {
  const raw = cleanNullable(value);
  if (!raw) throw httpError(400, "Calendar URL is required");
  const normalized = raw.replace(/^webcal:\/\//i, "https://");
  if (!/^https?:\/\//i.test(normalized)) throw httpError(400, "Calendar URL must start with https://, http://, or webcal://");
  return normalized;
}

function normalizeWebhookEvents(value) {
  if (!value) return [];
  const events = Array.isArray(value) ? value : String(value).split(/[\n,]/);
  return [...new Set(events.map((event) => String(event).trim()).filter(Boolean))];
}

function normalizeIntegrationConfig(type, input) {
  if (type === "slack") {
    const webhookUrl = normalizeWebhookUrl(input.webhookUrl || input.webhook_url || input.url);
    return { webhookUrl };
  }
  throw httpError(400, "Unsupported integration type");
}

function integrationResponse(integration) {
  return {
    ...integration,
    events: parseJsonArray(integration.events_json),
    config: maskIntegrationConfig(integration.type, parseJsonObject(integration.config_json)),
  };
}

function maskIntegrationConfig(type, config) {
  if (type === "slack") return { webhookUrl: config.webhookUrl ? "configured" : "" };
  return {};
}

function normalizeMessageChannelConfig(provider, input) {
  if (provider === "twilio") {
    const accountSid = cleanNullable(input.accountSid || input.account_sid);
    const authToken = cleanNullable(input.authToken || input.auth_token);
    const from = cleanNullable(input.from || input.fromNumber || input.from_number);
    if (!accountSid || !authToken || !from) throw httpError(400, "Twilio accountSid, authToken, and from number are required");
    const apiBaseUrl = cleanNullable(input.apiBaseUrl || input.api_base_url);
    if (apiBaseUrl) normalizeWebhookUrl(apiBaseUrl);
    return { accountSid, authToken, from, apiBaseUrl };
  }
  throw httpError(400, "Unsupported message provider");
}

function messageChannelResponse(channel, revealWebhook = false) {
  return {
    ...channel,
    config: maskMessageChannelConfig(channel.provider, parseJsonObject(channel.config_json)),
    webhook_path: revealWebhook && channel.inbound_key ? `/hooks/messages/${channel.inbound_key}` : null,
  };
}

function emailInboundSourceResponse(source, revealWebhook = false) {
  return {
    ...source,
    webhook_path: revealWebhook && source.inbound_key ? `/hooks/email/${source.inbound_key}` : null,
  };
}

function maskMessageChannelConfig(provider, config) {
  if (provider === "twilio") {
    return {
      accountSid: config.accountSid ? maskTail(config.accountSid) : "",
      authToken: config.authToken ? "configured" : "",
      from: config.from || "",
      apiBaseUrl: config.apiBaseUrl || "",
    };
  }
  return {};
}

function maskTail(value) {
  const text = String(value || "");
  return text.length > 4 ? `...${text.slice(-4)}` : text;
}

async function deliverProviderMessage(channel, message) {
  const config = parseJsonObject(channel.config_json);
  if (channel.provider === "twilio") return deliverTwilioMessage(channel, config, message);
  return { status: "failed", error: "Unsupported message provider" };
}

async function deliverTwilioMessage(channel, config, message) {
  const accountSid = config.accountSid;
  const authToken = config.authToken;
  const from = formatProviderAddress(channel.type, config.from);
  const to = formatProviderAddress(channel.type, message.to);
  const baseUrl = (config.apiBaseUrl || "https://api.twilio.com").replace(/\/+$/, "");
  const url = `${baseUrl}/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  let status = "failed";
  let statusCode = null;
  let error = null;
  let providerMessageId = null;
  try {
    const body = new URLSearchParams({ From: from, To: to, Body: message.body });
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "UserOrbit-CRM-Message",
      },
      body,
    });
    statusCode = response.status;
    const responseText = await response.text();
    const parsed = parseJsonObject(responseText);
    providerMessageId = cleanNullable(parsed.sid || parsed.messageSid || parsed.id);
    status = response.ok ? "sent" : "failed";
    if (!response.ok) error = cleanNullable(parsed.message || parsed.error) || `HTTP ${response.status}`;
  } catch (caught) {
    error = caught.message || String(caught);
  }
  return { status, statusCode, providerMessageId, error };
}

function formatProviderAddress(type, value) {
  const address = cleanNullable(value);
  if (!address) return "";
  if (type === "whatsapp" && !address.toLowerCase().startsWith("whatsapp:")) return `whatsapp:${address}`;
  return address;
}

function normalizePhoneAddress(value) {
  const stripped = String(value || "").trim().replace(/^whatsapp:/i, "");
  const digits = stripped.replace(/\D/g, "");
  return digits || "";
}

function slackMessageForEvent(event, payload) {
  const title = slackEventTitle(event, payload);
  const lines = [`*${title}*`, slackEventDetail(event, payload)].filter(Boolean);
  return { text: lines.join("\n") };
}

function slackEventTitle(event, payload) {
  if (event === "account.created") return `New account: ${payload?.name || "Untitled account"}`;
  if (event === "contact.created") return `New contact: ${payload?.name || payload?.email || "Untitled contact"}`;
  if (event === "task.created") return `New task: ${payload?.title || "Untitled task"}`;
  if (event === "communication.created") return `Communication logged: ${payload?.subject || payload?.type || "Activity"}`;
  if (event === "message.received") return `Inbound message: ${payload?.subject || payload?.type || "Message"}`;
  if (event === "email.received") return `Inbound email: ${payload?.subject || "No subject"}`;
  if (event === "lead_form.submitted") return `Lead form submitted: ${payload?.form?.name || "Lead form"}`;
  return `UserOrbit event: ${event}`;
}

function slackEventDetail(event, payload) {
  if (event === "account.created") return [payload?.domain, payload?.segment, payload?.source].filter(Boolean).join(" / ");
  if (event === "contact.created") return [payload?.email, payload?.title].filter(Boolean).join(" / ");
  if (event === "task.created") return [payload?.kind, payload?.due_at || payload?.dueAt].filter(Boolean).join(" / ");
  if (event === "communication.created") return [payload?.type, payload?.direction, payload?.outcome].filter(Boolean).join(" / ");
  if (event === "message.received") return [payload?.type, payload?.direction, payload?.contact_id || payload?.contactId].filter(Boolean).join(" / ");
  if (event === "email.received") return payload?.contact?.email || payload?.fromEmail || "";
  if (event === "lead_form.submitted") return [payload?.account?.name, payload?.contact?.action ? `contact ${payload.contact.action}` : ""].filter(Boolean).join(" / ");
  return "";
}

function slugify(value) {
  return String(value || "workspace")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "workspace";
}

function escapeHtmlText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
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

function normalizeDateTime(value, field) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) throw httpError(400, `${field} must be a valid date-time`);
  return date.toISOString();
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeSmtpBody(value) {
  return String(value).replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}
