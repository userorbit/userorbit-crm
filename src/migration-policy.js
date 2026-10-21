const OWN_PREFERENCES = new Set(["dashboard/preferences", "notification/preferences"]);

function forbidden(message) {
  return Object.assign(new Error(message), { status: 403 });
}

export async function enforceMigrationPolicy(request, env, path, workspaceId, auth) {
  const membership = await env.DB.prepare(`
    SELECT lm.role FROM legacy_memberships lm
    JOIN workspaces w ON w.team_id = lm.team_id
    WHERE w.id = ? AND lm.user_id = ?
  `).bind(workspaceId, auth.user.id).first();
  if (membership?.role === "manager" && request.method !== "GET" && (path === "team-invitations" || path.startsWith("team-invitations/"))) {
    throw forbidden("Only a founder can invite members or change team access.");
  }
  if (membership?.role !== "ic") return request;

  if (request.method === "GET" && !["sequences", "warmup"].includes(path) && !/^dialer\/sessions\/[^/]+\/next$/.test(path)) return request;
  if (request.method === "POST" && path === "auth/password") return request;
  if (request.method === "PATCH" && OWN_PREFERENCES.has(path)) return request;

  const createAccount = request.method === "POST" && path === "accounts";
  const updateAccount = request.method === "PATCH" && /^accounts\/[^/]+$/.test(path);
  if (createAccount || updateAccount) {
    const input = await readBody(request.clone());
    if (["status", "owner", "ownerId", "owner_id"].some((key) => Object.hasOwn(input, key))) {
      throw forbidden("Only a team lead can change company ownership or lifecycle status.");
    }
    if (createAccount) {
      return new Request(request, {
        body: JSON.stringify({ ...input, owner: auth.user.name || auth.user.email || auth.user.id }),
      });
    }
    return request;
  }

  if (request.method === "PATCH" && /^contacts\/[^/]+$/.test(path)) {
    const input = await readBody(request.clone());
    if (["status", "owner", "ownerId", "owner_id", "accountId", "account_id", "workspaceId", "workspace_id"].some((key) => Object.hasOwn(input, key))) {
      throw forbidden("Only a team lead can change contact ownership, account, or outreach status.");
    }
    return request;
  }
  // Personal Google connections do not grant shared CRM or outreach administration.
  if (request.method === "POST" && ["assistant/mail/connect", "assistant/mail/oauth/callback"].includes(path)) return request;
  if (request.method === "POST" && /^assistant\/mail\/connections\/[^/]+\/(sync|calendar-sync)$/.test(path)) return request;
  if (request.method === "DELETE" && /^assistant\/mail\/connections\/[^/]+$/.test(path)) return request;

  if (request.method === "POST" && ["contacts", "tasks", "communications"].includes(path)) return request;
  if (request.method === "PATCH" && /^tasks\/[^/]+$/.test(path)) return request;
  if (request.method === "POST" && /^contacts\/[^/]+\/(reply|unsubscribe)$/.test(path)) return request;

  throw forbidden("This workflow is available in the existing CRM at https://gtm.userorb.com. A team lead must enable it here.");
}
import { readBody } from "./assistant/shared.js";

