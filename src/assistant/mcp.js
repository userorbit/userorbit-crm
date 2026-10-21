const READ_ROLES = ["owner", "admin", "member", "viewer"];
const VERSIONS = ["2025-06-18", "2025-03-26"];
const SCOPES = ["crm:read", "assistant:draft"];
const ROUTES = new Set(["/mcp", "/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp", "/.well-known/oauth-authorization-server", "/oauth/register", "/oauth/authorize", "/oauth/token", "/oauth/revoke", "/api/assistant/mcp/approvals"]);
const string = { type: "string", minLength: 1, maxLength: 4000 };
const definitions = [
  ["crm_search", "Search contacts and accounts in this workspace", { query: { ...string, maxLength: 500 }, limit: { type: "integer", minimum: 1, maximum: 20 } }, ["query"]],
  ["crm_contact", "Read one workspace contact", { contactId: string }, ["contactId"]],
  ["crm_account", "Read one workspace account", { accountId: string }, ["accountId"]],
  ["assistant_search", "Search personal and workspace knowledge with source citations", { query: { ...string, maxLength: 500 }, limit: { type: "integer", minimum: 1, maximum: 20 } }, ["query"]],
  ["assistant_brief", "Read a relationship brief for a contact", { contactId: string }, ["contactId"]],
  ["assistant_next_actions", "Read suggested next actions", {}, []],
  ["assistant_prepare_draft", "Create an email draft after exact human approval in CRM. Never sends email.", { contactId: string, instructions: string, approval_id: string }, ["contactId", "instructions", "approval_id"]],
];
export const MCP_TOOLS = definitions.map(([name, description, properties, required]) => ({ name, description, inputSchema: { type: "object", properties, required, additionalProperties: false }, annotations: { readOnlyHint: name !== "assistant_prepare_draft", destructiveHint: false, openWorldHint: false } }));
const now = () => Math.floor(Date.now() / 1000);
const random = (prefix = "") => prefix + b64(crypto.getRandomValues(new Uint8Array(32)));
function b64(bytes) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
async function digest(value) { return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))); }
async function hash(value) { return [...await digest(value)].map(n => n.toString(16).padStart(2, "0")).join(""); }
function canonical(value) { return JSON.stringify(Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]]))); }
function fail(status, message, code = "invalid_request") { throw Object.assign(new Error(message), { status, code }); }
function json(value, status = 200, headers = {}) { return Response.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } }); }
async function body(request) {
  const reader = request.body?.getReader();
  const chunks = [];
  let size = 0;
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        fail(413, "Request too large");
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const text = new TextDecoder().decode(bytes);
  try {
    const data = request.headers.get("content-type")?.includes("application/x-www-form-urlencoded") ? Object.fromEntries(new URLSearchParams(text)) : JSON.parse(text);
    if (!data || typeof data !== "object" || Array.isArray(data)) fail(400, "Expected an object");
    return data;
  } catch (error) { if (error.status) throw error; fail(400, "Malformed JSON", "parse_error"); }
}
function redirectAllowed(value) {
  if (typeof value !== "string" || value.length > 2048) return false;
  try { const u = new URL(value); return !u.username && !u.password && !u.hash && (u.protocol === "https:" || (u.protocol === "http:" && ["127.0.0.1", "[::1]"].includes(u.hostname))); } catch { return false; }
}
function scopes(value = "crm:read") {
  if (typeof value !== "string") fail(400, "Invalid scope", "invalid_scope");
  const requested = [...new Set(value.split(" ").filter(Boolean))];
  if (!requested.includes("crm:read") || requested.some(s => !SCOPES.includes(s))) fail(400, "Unsupported scope", "invalid_scope");
  return requested.join(" ");
}
async function membership(env, helpers, auth, workspaceId) {
  if (!auth?.user?.id || auth.user.status !== "active") fail(401, "Unauthorized", "invalid_token");
  if (auth.workspaceId && auth.workspaceId !== workspaceId) fail(403, "Token is bound to another workspace");
  await helpers.requireWorkspaceRole(env, auth.user.id, workspaceId, READ_ROLES);
}
async function sessionContext(request, env, helpers) {
  const auth = await helpers.requireAuth(request, env);
  if (auth.kind !== "session") fail(403, "A signed-in user session is required");
  const workspaceId = await helpers.resolveWorkspaceId(env, request, auth);
  await membership(env, helpers, auth, workspaceId);
  return { auth, workspaceId };
}
async function grantFor(env, tokenHash) {
  return env.DB.prepare(`SELECT t.*, g.client_id, g.workspace_id, g.user_id, g.scope, g.resource, g.expires_at AS grant_expires_at, g.revoked_at FROM assistant_mcp_tokens t JOIN assistant_mcp_grants g ON g.id=t.grant_id WHERE t.hash=?`).bind(tokenHash).first();
}
function validGrant(grant, resource) { return grant && !grant.revoked_at && grant.grant_expires_at > now() && grant.resource === resource; }
async function authenticate(request, env, helpers, resource) {
  const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (bearer.startsWith("mcp_")) {
    const token = await grantFor(env, await hash(bearer));
    if (!validGrant(token, resource) || token.kind !== "access" || token.expires_at <= now()) fail(401, "Invalid access token", "invalid_token");
    const user = await env.DB.prepare("SELECT id,status FROM users WHERE id=?").bind(token.user_id).first();
    const auth = { kind: "mcp_oauth", user, workspaceId: token.workspace_id };
    const requested = request.headers.get("x-workspace-id");
    if (requested && requested !== token.workspace_id) fail(403, "Token is bound to another workspace");
    await membership(env, helpers, auth, token.workspace_id);
    return { auth, workspaceId: token.workspace_id, scope: token.scope };
  }
  const auth = await helpers.requireAuth(request, env);
  if (!["session", "workspace_token", "bootstrap"].includes(auth.kind)) fail(401, "Unsupported credentials", "invalid_token");
  const workspaceId = await helpers.resolveWorkspaceId(env, request, auth);
  await membership(env, helpers, auth, workspaceId);
  return { auth, workspaceId, scope: SCOPES.join(" ") };
}
function validateArgs(tool, args, approval = true) {
  if (!args || typeof args !== "object" || Array.isArray(args)) fail(400, "Invalid tool arguments");
  for (const key of tool.inputSchema.required) if ((key !== "approval_id" || approval) && !(key in args)) fail(400, `Missing ${key}`);
  for (const [key, value] of Object.entries(args)) {
    const spec = tool.inputSchema.properties[key];
    if (!spec || (spec.type === "string" && (typeof value !== "string" || !value.trim() || value.length > spec.maxLength)) || (spec.type === "integer" && (!Number.isInteger(value) || value < spec.minimum || value > spec.maximum))) fail(400, `Invalid ${key}`);
  }
}
async function issueTokens(env, grantId) {
  const access = random("mcp_a_"), refresh = random("mcp_r_");
  await env.DB.batch([
    env.DB.prepare("INSERT INTO assistant_mcp_tokens(hash,grant_id,kind,expires_at) VALUES(?,?, 'access',?)").bind(await hash(access), grantId, now() + 600),
    env.DB.prepare("INSERT INTO assistant_mcp_tokens(hash,grant_id,kind,expires_at) VALUES(?,?, 'refresh',?)").bind(await hash(refresh), grantId, now() + 604800),
  ]);
  return { access_token: access, refresh_token: refresh, token_type: "Bearer", expires_in: 600 };
}
async function authorizationInput(env, input, resource) {
  const client = typeof input.client_id === "string" ? await env.DB.prepare("SELECT * FROM assistant_mcp_clients WHERE id=?").bind(input.client_id).first() : null;
  if (!client || !JSON.parse(client.redirects_json).includes(input.redirect_uri)) fail(400, "Unknown client or redirect URI");
  if (input.response_type !== "code" || input.code_challenge_method !== "S256" || !/^[A-Za-z0-9_-]{43}$/.test(input.code_challenge || "")) fail(400, "Authorization code with PKCE S256 is required");
  if (input.resource !== resource) fail(400, "Invalid resource", "invalid_target");
  if (input.state != null && (typeof input.state !== "string" || input.state.length > 2000)) fail(400, "Invalid state");
  return { client, scope: scopes(input.scope) };
}
function consentPage(client, input, scope) {
  const nonce = random();
  const data = JSON.stringify(input).replace(/</g, "\\u003c");
  const label = String(client.name).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Connect CRM</title></head><body><main><h1>Connect ${label} to your CRM</h1><p>This app requests: ${scope}. Drafts always require a separate approval in CRM. It cannot send email.</p><p><a href="/app" target="_blank" rel="noopener">Sign in to CRM</a>, then return here.</p><label>Workspace ID <input id="workspace" required autocomplete="off"></label><p><button id="allow">Allow access</button> <button id="deny">Cancel</button></p><p id="status" role="status"></p></main><script nonce="${nonce}">const input=${data};document.getElementById('allow').onclick=async()=>{const status=document.getElementById('status');const token=localStorage.getItem('crmApiToken');const workspace=document.getElementById('workspace').value.trim();if(!token||!workspace){status.textContent='Sign in and enter the workspace ID shown in CRM settings.';return;}document.getElementById('allow').disabled=true;try{const r=await fetch('/oauth/authorize',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,'X-Workspace-Id':workspace},body:JSON.stringify({...input,approved:true})});const result=await r.json();if(!r.ok)throw new Error(result.error_description||'Connection failed');location.assign(result.redirect_url);}catch(e){status.textContent=e.message;document.getElementById('allow').disabled=false;}};document.getElementById('deny').onclick=()=>{const u=new URL(input.redirect_uri);u.searchParams.set('error','access_denied');if(input.state)u.searchParams.set('state',input.state);location.assign(u.href);};</script></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY", "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'` } });
}
async function oauth(request, env, helpers, url, origin) {
  const resource = origin + "/mcp";
  const path = url.pathname;
  if (path.startsWith("/.well-known/")) {
    if (request.method !== "GET") fail(405, "Method not allowed");
    if (path.includes("oauth-protected-resource")) return json({ resource, authorization_servers: [origin], scopes_supported: SCOPES, bearer_methods_supported: ["header"] });
    return json({ issuer: origin, authorization_endpoint: origin + "/oauth/authorize", token_endpoint: origin + "/oauth/token", registration_endpoint: origin + "/oauth/register", revocation_endpoint: origin + "/oauth/revoke", response_types_supported: ["code"], grant_types_supported: ["authorization_code", "refresh_token"], token_endpoint_auth_methods_supported: ["none"], code_challenge_methods_supported: ["S256"], scopes_supported: SCOPES });
  }
  if (path === "/oauth/authorize" && request.method === "GET") {
    const input = Object.fromEntries(url.searchParams);
    const { client, scope } = await authorizationInput(env, input, resource);
    return consentPage(client, input, scope);
  }
  if (request.method !== "POST") fail(405, "Method not allowed");
  const input = await body(request);
  if (path === "/oauth/register") {
    if (!Array.isArray(input.redirect_uris) || !input.redirect_uris.length || input.redirect_uris.length > 10 || !input.redirect_uris.every(redirectAllowed)) fail(400, "Invalid redirect URI", "invalid_redirect_uri");
    if (input.token_endpoint_auth_method && input.token_endpoint_auth_method !== "none") fail(400, "Only public clients are supported", "invalid_client_metadata");
    if (input.grant_types && (!Array.isArray(input.grant_types) || input.grant_types.some(t => !["authorization_code", "refresh_token"].includes(t)))) fail(400, "Unsupported grant type", "invalid_client_metadata");
    if (input.response_types && (!Array.isArray(input.response_types) || input.response_types.some(t => t !== "code"))) fail(400, "Unsupported response type", "invalid_client_metadata");
    const id = random("client_");
    const name = typeof input.client_name === "string" ? input.client_name.trim().slice(0, 120) : "MCP client";
    const registrationKey = await hash(request.headers.get("cf-connecting-ip") || "unattributed");
    const registered = await env.DB.prepare(`INSERT INTO assistant_mcp_clients(id,name,redirects_json,created_at,registration_key)
      SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM assistant_mcp_clients WHERE registration_key=? AND created_at>?) < 30
      RETURNING id`).bind(id, name || "MCP client", JSON.stringify(input.redirect_uris), now(), registrationKey, registrationKey, now() - 3600).first();
    if (!registered) fail(429, "Client registration limit reached; try again later");
    return json({ client_id: id, client_name: name, redirect_uris: input.redirect_uris, token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] }, 201);
  }
  if (path === "/oauth/authorize") {
    const { client, scope } = await authorizationInput(env, input, resource);
    const { auth, workspaceId } = await sessionContext(request, env, helpers);
    if (input.approved !== true) fail(400, "Explicit consent is required", "access_denied");
    if (scope.includes("assistant:draft")) await helpers.requireWorkspaceWrite(env, auth, workspaceId);
    const grantId = random("grant_"), code = random("code_");
    await env.DB.batch([
      env.DB.prepare("INSERT INTO assistant_mcp_grants(id,client_id,workspace_id,user_id,scope,resource,expires_at) VALUES(?,?,?,?,?,?,?)").bind(grantId, client.id, workspaceId, auth.user.id, scope, resource, now() + 2592000),
      env.DB.prepare("INSERT INTO assistant_mcp_codes(hash,grant_id,redirect_uri,challenge,expires_at) VALUES(?,?,?,?,?)").bind(await hash(code), grantId, input.redirect_uri, input.code_challenge, now() + 120),
    ]);
    const redirect = new URL(input.redirect_uri);
    redirect.searchParams.set("code", code);
    if (input.state) redirect.searchParams.set("state", input.state);
    return json({ redirect_url: redirect.href });
  }
  if (path === "/oauth/revoke") {
    if (typeof input.token !== "string" || typeof input.client_id !== "string") fail(400, "Token and client_id required");
    const token = await grantFor(env, await hash(input.token));
    if (token?.client_id === input.client_id) await env.DB.prepare("UPDATE assistant_mcp_grants SET revoked_at=? WHERE id=?").bind(now(), token.grant_id).run();
    return json({});
  }
  if (path === "/oauth/token") {
    if (typeof input.client_id !== "string" || input.resource !== resource) fail(400, "Client and valid resource required", "invalid_target");
    let grant;
    if (input.grant_type === "authorization_code") {
      if (typeof input.code !== "string" || !/^[A-Za-z0-9._~-]{43,128}$/.test(input.code_verifier || "")) fail(400, "Invalid authorization code or verifier", "invalid_grant");
      const row = await env.DB.prepare("SELECT c.*,g.client_id,g.resource,g.scope,g.revoked_at,g.expires_at AS grant_expires_at FROM assistant_mcp_codes c JOIN assistant_mcp_grants g ON g.id=c.grant_id WHERE c.hash=?").bind(await hash(input.code)).first();
      if (!validGrant(row, resource) || row.client_id !== input.client_id || row.redirect_uri !== input.redirect_uri || row.expires_at <= now() || row.challenge !== b64(await digest(input.code_verifier))) fail(400, "Invalid authorization code", "invalid_grant");
      const consumed = await env.DB.prepare("UPDATE assistant_mcp_codes SET used_at=? WHERE hash=? AND used_at IS NULL RETURNING grant_id").bind(now(), row.hash).first();
      if (!consumed) {
        await env.DB.prepare("UPDATE assistant_mcp_grants SET revoked_at=? WHERE id=?").bind(now(), row.grant_id).run();
        fail(400, "Authorization code reuse revoked this grant", "invalid_grant");
      }
      grant = row;
    } else if (input.grant_type === "refresh_token") {
      if (typeof input.refresh_token !== "string") fail(400, "Refresh token required", "invalid_grant");
      const row = await grantFor(env, await hash(input.refresh_token));
      if (!validGrant(row, resource) || row.client_id !== input.client_id || row.kind !== "refresh" || row.expires_at <= now()) fail(400, "Invalid refresh token", "invalid_grant");
      const consumed = await env.DB.prepare("UPDATE assistant_mcp_tokens SET used_at=? WHERE hash=? AND used_at IS NULL RETURNING grant_id").bind(now(), row.hash).first();
      if (!consumed) {
        await env.DB.prepare("UPDATE assistant_mcp_grants SET revoked_at=? WHERE id=?").bind(now(), row.grant_id).run();
        fail(400, "Refresh token reuse revoked this grant", "invalid_grant");
      }
      grant = row;
    } else fail(400, "Unsupported grant type", "unsupported_grant_type");
    return json({ ...await issueTokens(env, grant.grant_id), scope: grant.scope });
  }
}
async function rpc(request, env, helpers, resource) {
  const context = await authenticate(request, env, helpers, resource);
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { Allow: "POST" });
  if (!request.headers.get("content-type")?.includes("application/json")) fail(415, "Content-Type must be application/json");
  const accept = request.headers.get("accept") || "";
  if (!accept.includes("application/json") || !accept.includes("text/event-stream")) fail(406, "Accept must include application/json and text/event-stream");
  let message;
  try { message = await body(request); } catch (error) { return json({ jsonrpc: "2.0", id: null, error: { code: error.code === "parse_error" ? -32700 : -32600, message: error.message } }, error.status); }
  const validId = message.id === undefined || typeof message.id === "string" || (typeof message.id === "number" && Number.isFinite(message.id));
  if (message.jsonrpc !== "2.0" || !validId || typeof message.method !== "string" || (message.params !== undefined && (!message.params || typeof message.params !== "object" || Array.isArray(message.params)))) return json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } }, 400);
  const version = request.headers.get("mcp-protocol-version");
  if (version && !VERSIONS.includes(version)) return json({ jsonrpc: "2.0", id: message.id ?? null, error: { code: -32600, message: "Unsupported MCP protocol version" } }, 400);
  if (message.id === undefined) return new Response(null, { status: 202 });
  const id = message.id, params = message.params || {};
  const result = value => json({ jsonrpc: "2.0", id, result: value });
  const error = (code, text) => json({ jsonrpc: "2.0", id, error: { code, message: text } });
  if (message.method === "initialize") {
    if (typeof params.protocolVersion !== "string" || !params.clientInfo || !params.capabilities) return error(-32602, "protocolVersion, clientInfo and capabilities required");
    return result({ protocolVersion: VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : VERSIONS[0], capabilities: { tools: { listChanged: false } }, serverInfo: { name: "userorbit-crm", version: "1.0.0" }, instructions: "Read your CRM and assistant knowledge. Draft creation requires an exact single-use human approval in CRM. No email sending is available." });
  }
  if (message.method === "ping") return result({});
  if (message.method === "tools/list") return result({ tools: MCP_TOOLS.filter(t => t.annotations.readOnlyHint || context.scope.split(" ").includes("assistant:draft")) });
  if (message.method !== "tools/call") return error(-32601, "Method not found");
  const tool = MCP_TOOLS.find(t => t.name === params.name);
  if (!tool) return error(-32602, "Unknown tool");
  const args = params.arguments || {};
  try { validateArgs(tool, args); } catch (e) { return error(-32602, e.message); }
  try {
    if (!context.scope.split(" ").includes("crm:read")) fail(403, "Read scope required");
    if (!tool.annotations.readOnlyHint) {
      if (!context.scope.split(" ").includes("assistant:draft")) fail(403, "Draft scope required");
      await helpers.requireWorkspaceWrite(env, context.auth, context.workspaceId);
      const { approval_id, ...payload } = args;
      const approved = await env.DB.prepare("UPDATE assistant_mcp_approvals SET used_at=? WHERE id=? AND workspace_id=? AND user_id=? AND tool=? AND arguments_hash=? AND expires_at>? AND used_at IS NULL RETURNING id").bind(now(), approval_id, context.workspaceId, context.auth.user.id, tool.name, await hash(canonical(payload)), now()).first();
      if (!approved) fail(403, "Exact, unexpired human approval required");
    }
    if (typeof helpers.dispatchAssistantTool !== "function") fail(503, "Assistant dispatcher unavailable");
    const { approval_id, ...payload } = args;
    const output = await helpers.dispatchAssistantTool(env, context.workspaceId, tool.name, payload, context.auth);
    return result({ content: [{ type: "text", text: JSON.stringify(output ?? null) }], isError: false });
  } catch (e) { return result({ content: [{ type: "text", text: e.status && e.status < 500 ? e.message : "Assistant tool could not complete" }], isError: true }); }
}
export async function handleMcpRequest(request, env, helpers) {
  const url = new URL(request.url);
  if (!ROUTES.has(url.pathname)) return null;
  const origin = env.MCP_PUBLIC_ORIGIN ? new URL(env.MCP_PUBLIC_ORIGIN).origin : url.origin;
  const incomingOrigin = request.headers.get("origin");
  const allowedOrigins = [origin, ...(env.MCP_ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean)];
  const consentRoute = ["/oauth/authorize", "/api/assistant/mcp/approvals"].includes(url.pathname);
  let response;
  try {
    if (incomingOrigin && !(consentRoute ? [origin] : allowedOrigins).includes(incomingOrigin)) fail(403, "Origin not allowed");
    if (url.searchParams.has("access_token") || url.searchParams.has("token")) fail(400, "Credentials must not appear in URLs");
    if (request.method === "OPTIONS") response = new Response(null, { status: 204 });
    else if (url.pathname === "/mcp") response = await rpc(request, env, helpers, origin + "/mcp");
    else if (url.pathname === "/api/assistant/mcp/approvals") {
      if (request.method !== "POST") fail(405, "Method not allowed");
      const { auth, workspaceId } = await sessionContext(request, env, helpers);
      await helpers.requireWorkspaceWrite(env, auth, workspaceId);
      const input = await body(request), tool = MCP_TOOLS.find(t => t.name === input.tool && !t.annotations.readOnlyHint);
      if (!tool || input.arguments?.approval_id !== undefined) fail(400, "Only draft preparation can be approved");
      validateArgs(tool, input.arguments, false);
      const id = random("approval_");
      await env.DB.prepare("INSERT INTO assistant_mcp_approvals(id,workspace_id,user_id,tool,arguments_hash,expires_at) VALUES(?,?,?,?,?,?)").bind(id, workspaceId, auth.user.id, tool.name, await hash(canonical(input.arguments)), now() + 300).run();
      response = json({ approval_id: id, expires_in: 300 }, 201);
    } else response = await oauth(request, env, helpers, url, origin);
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    response = json({ error: error.code || (status === 401 ? "invalid_token" : "invalid_request"), error_description: status < 500 ? error.message : "Request could not complete" }, status, status === 401 ? { "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"` } : {});
  }
  if (incomingOrigin && (consentRoute ? [origin] : allowedOrigins).includes(incomingOrigin)) {
    response.headers.set("Access-Control-Allow-Origin", incomingOrigin);
    response.headers.set("Vary", "Origin");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, MCP-Protocol-Version, X-Workspace-Id");
    response.headers.set("Access-Control-Expose-Headers", "WWW-Authenticate");
  }
  return response;
}
