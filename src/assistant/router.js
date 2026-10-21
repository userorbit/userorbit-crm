import * as mail from "./mail.js";
import * as intelligence from "./intelligence.js";
import * as knowledge from "./knowledge.js";
import * as network from "./network.js";
import * as automations from "./automations.js";
import { handleMcpRequest } from "./mcp.js";
import { json, fail, rows } from "./shared.js";
import { applyJobInstructions } from "./job-instructions.js";

const modules = { mail, intelligence, knowledge, network, automations };

export async function handleAssistantRequest(request, env, context) {
  const { path, workspaceId, auth, helpers } = context;
  if (auth.user.status !== "active") throw fail(403, "Active user required");
  if (auth.workspaceId && auth.workspaceId !== workspaceId) throw fail(403, "Token is bound to another workspace");
  await helpers.requireWorkspaceRole(env, auth.user.id, workspaceId, ["owner", "admin", "member", "viewer"]);
  if (!["GET", "HEAD"].includes(request.method)) await helpers.requireWorkspaceWrite(env, auth, workspaceId);
  if (path === "contacts" && request.method === "GET") {
    return json({ contacts: await rows(env, "SELECT c.id,c.name,c.email,c.title,a.name AS account_name FROM contacts c JOIN accounts a ON a.id=c.account_id WHERE a.workspace_id=? ORDER BY c.name LIMIT 500", workspaceId) });
  }
  if (path.startsWith("calendar/events/") && request.method === "GET") {
    const event = await env.DB.prepare("SELECT title,description,starts_at,ends_at,location FROM calendar_events WHERE id=? AND workspace_id=?").bind(decodeURIComponent(path.slice(16)), workspaceId).first();
    if (!event) throw fail(404, "Meeting not found");
    return json({ source: { title: event.title, body: [event.description,event.starts_at,event.ends_at,event.location].filter(Boolean).join("\n") } });
  }
  if (path === "mail/oauth/callback" && request.method === "POST") return mail.handleOAuthCallback(request, env, context);
  const module = modules[path.split("/")[0]];
  return module ? await module.handleRequest(request, env, context) : null;
}

export async function handleAssistantPublicRequest(request, env, helpers) {
  return handleMcpRequest(request, env, { ...helpers, dispatchAssistantTool });
}

async function featureContext(env, workspaceId, auth, helpers, write = false) {
  if (!auth?.user?.id || auth.user.status === "disabled") throw fail(401, "Active user required");
  if (auth.workspaceId && auth.workspaceId !== workspaceId) throw fail(403, "Token is bound to another workspace");
  await helpers.requireWorkspaceRole(env, auth.user.id, workspaceId, ["owner", "admin", "member", "viewer"]);
  if (write) await helpers.requireWorkspaceWrite(env, auth, workspaceId);
  return { workspaceId, auth, helpers };
}

let coreHelpers;
export function configureAssistantHelpers(helpers) {
  coreHelpers = helpers;
  return { ...helpers, dispatchAssistantJob, dispatchAssistantTool };
}

export async function dispatchAssistantTool(env, workspaceId, name, args, auth) {
  const context = await featureContext(env, workspaceId, auth, coreHelpers, name === "assistant_prepare_draft");
  switch (name) {
    case "crm_search":
    case "assistant_search":
      return knowledge.searchKnowledge(env, workspaceId, args.query, { userId: auth.user.id, limit: args.limit });
    case "crm_contact":
      return coreHelpers.getContact(env, args.contactId, workspaceId);
    case "crm_account":
      return coreHelpers.getAccount(env, args.accountId, workspaceId, auth);
    case "assistant_next_actions":
      return intelligence.getAttention(env, context);
    case "assistant_brief": {
      const contact = await coreHelpers.getContact(env, args.contactId, workspaceId);
      return {
        summary: `${contact.name} at ${contact.account_name}. Review the linked tasks, conversations, and opportunities before your meeting.`,
        contact, sources: [{ title: contact.name, url: `/api/contacts/${encodeURIComponent(contact.id)}` }],
      };
    }
    case "assistant_prepare_draft":
      return intelligence.createDraft(env, context, { contactId: args.contactId, instruction: args.instructions });
    default:
      throw fail(400, "Unknown assistant tool");
  }
}

export async function dispatchAssistantJob(env, job) {
  if (job.signal?.aborted) throw fail(408, "Job cancelled");
  const user = await env.DB.prepare("SELECT id,name,email,status FROM users WHERE id=? AND status='active'").bind(job.userId).first();
  if (!user) throw fail(403, "Job creator is inactive");
  const context = await featureContext(env, job.workspaceId, { kind: "scheduled", workspaceId: job.workspaceId, user }, coreHelpers, true);
  let data;
  let summary;
  switch (job.template) {
    case "attention": {
      const result = await intelligence.getAttention(env, context);
      data = result.suggestions;
      summary = data.length ? `${data.length} relationship suggestion${data.length === 1 ? " is" : "s are"} ready to review.` : "No relationships need attention.";
      break;
    }
    case "commitments": {
      await intelligence.extractCommitments(env, context);
      data = await rows(env, "SELECT id,title,status,due_at FROM assistant_commitments WHERE workspace_id=? AND user_id=? AND status IN ('proposed','accepted') ORDER BY id LIMIT 100", job.workspaceId, job.userId);
      summary = data.length ? `${data.length} open promises are ready to review.` : "No open promises found.";
      break;
    }
    case "meeting_brief": {
      const events = await rows(env, "SELECT id FROM calendar_events WHERE workspace_id=? AND starts_at>=? AND starts_at<? ORDER BY starts_at LIMIT 10", job.workspaceId, new Date().toISOString(), new Date(Date.now() + 86400000).toISOString());
      data = [];
      for (const event of events) { if (job.signal?.aborted) throw fail(408, "Job cancelled"); data.push(await intelligence.buildMeetingBrief(env, context, event.id)); }
      summary = data.length ? `${data.length} upcoming meeting briefs are ready.` : "No meetings in the next 24 hours.";
      break;
    }
    case "network_changes": {
      data = await rows(env, "SELECT id,entity_type,entity_id,field,before_value,after_value,evidence,source_url FROM assistant_network_alerts WHERE workspace_id=? AND user_id=? AND acknowledged_at IS NULL ORDER BY id LIMIT 100", job.workspaceId, job.userId);
      summary = data.length ? `${data.length} network changes are ready to review.` : "No new network changes.";
      break;
    }
    case "cited_research": {
      const result = await knowledge.askKnowledge(env, job.workspaceId, job.instructions.slice(0, 500), { userId: job.userId, limit: 8 });
      data = { answer: result.answer, sources: result.sources };
      summary = "Your saved research question has been reviewed.";
      break;
    }
    default:
      throw fail(400, "Unknown recurring job template");
  }
  if (job.signal?.aborted) throw fail(408, "Job cancelled");
  const result = job.template === "cited_research" ? { data, mode: "query", instructionsApplied: true } : await applyJobInstructions(env, job.instructions, data, job.signal);
  if (result.instructionsApplied && Array.isArray(result.data) && result.data.length !== data.length) summary = `${result.data.length} result(s) match your review instructions.`;
  if (Array.isArray(data) && data.length && !result.instructionsApplied) summary += " Template rules applied; free-form filtering requires configured AI.";
  return { summary, data: result.data, mode: result.mode, instructionsApplied: result.instructionsApplied, changeKey: result.data };
}

export async function runAssistantScheduled(env, helpers) {
  const results = [];
  for (const [name, module] of Object.entries(modules)) {
    if (!module.runScheduled) continue;
    try { results.push({ feature: name, result: await module.runScheduled(env, helpers) }); }
    catch { results.push({ feature: name, error: "Scheduled assistant processing failed" }); }
  }
  return results;
}
