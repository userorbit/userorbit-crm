import { test, expect, beforeEach, afterEach } from "bun:test";
import { createD1 } from "./helpers/d1.js";
import { handleMcpRequest } from "../src/assistant/mcp.js";
let db, env, helpers, dispatched;
const origin = "https://crm.example";
const error = status => Object.assign(new Error(status === 401 ? "Unauthorized" : "Forbidden"), { status });
beforeEach(() => {
  db = createD1(); env = { DB: db.DB }; dispatched = [];
  const timestamp = new Date().toISOString();
  db.sqlite.prepare("INSERT INTO users(id,email,name,status,created_at,updated_at) VALUES(?,?,?,?,?,?)").run("u", "u@test.example", "User", "active", timestamp, timestamp);
  db.sqlite.prepare("INSERT INTO users(id,email,name,status,created_at,updated_at) VALUES(?,?,?,?,?,?)").run("v", "v@test.example", "Viewer", "active", timestamp, timestamp);
  helpers = {
    async requireAuth(request) {
      const token = request.headers.get("authorization");
      if (!["Bearer session", "Bearer viewer", "Bearer api"].includes(token)) throw error(401);
      return { kind: token === "Bearer api" ? "workspace_token" : "session", user: { id: token === "Bearer viewer" ? "v" : "u", status: "active" }, workspaceId: token === "Bearer api" ? "workspace_default" : null };
    },
    async resolveWorkspaceId(env, request) { return request.headers.get("x-workspace-id") || "workspace_default"; },
    async requireWorkspaceRole(env, userId, workspaceId) { if (workspaceId !== "workspace_default") throw error(403); return { role: userId === "v" ? "viewer" : "member" }; },
    async requireWorkspaceWrite(env, auth, workspaceId) { if (auth.user.id !== "u" || workspaceId !== "workspace_default") throw error(403); },
    async dispatchAssistantTool(env, workspaceId, name, args, auth) { dispatched.push({ workspaceId, name, args, userId: auth.user.id }); return { ok: true, contactId: args.contactId }; },
  };
});
afterEach(() => db.close());
async function request(path, input, { token, headers = {}, method = "POST" } = {}) {
  return handleMcpRequest(new Request(origin + path, { method, headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...(token ? { Authorization: "Bearer " + token } : {}), ...headers }, ...(method === "GET" ? {} : { body: typeof input === "string" ? input : JSON.stringify(input ?? {}) }) }), env, helpers);
}
const call = (method, params = {}, token = "session", options = {}) => request("/mcp", { jsonrpc: "2.0", id: 1, method, params }, { token, ...options });
async function authorize(scope = "crm:read assistant:draft") {
  const registered = await request("/oauth/register", { client_name: "Test client", redirect_uris: ["http://127.0.0.1:8123/callback"] });
  expect(registered.status).toBe(201);
  const client = await registered.json(), verifier = "a".repeat(50);
  const challenge = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))).toString("base64url");
  const input = { client_id: client.client_id, redirect_uri: client.redirect_uris[0], response_type: "code", resource: origin + "/mcp", scope, code_challenge: challenge, code_challenge_method: "S256", state: "state value" };
  const consent = await request("/oauth/authorize", { ...input, approved: true }, { token: "session" });
  expect(consent.status).toBe(200);
  const redirect = new URL((await consent.json()).redirect_url);
  expect(redirect.searchParams.get("state")).toBe("state value");
  return { input, exchange: { grant_type: "authorization_code", client_id: client.client_id, code: redirect.searchParams.get("code"), redirect_uri: input.redirect_uri, resource: input.resource, code_verifier: verifier } };
}
async function tokenSet(scope) { const flow = await authorize(scope); const response = await request("/oauth/token", flow.exchange); expect(response.status).toBe(200); return { ...flow, tokens: await response.json() }; }

test("unowned paths return null and discovery advertises actual capabilities", async () => {
  expect(await request("/api/contacts", {})).toBeNull();
  const response = await request("/.well-known/oauth-authorization-server", null, { method: "GET" });
  expect((await response.json()).code_challenge_methods_supported).toEqual(["S256"]);
  const resource = await request("/.well-known/oauth-protected-resource/mcp", null, { method: "GET" });
  expect((await resource.json()).resource).toBe(origin + "/mcp");
});
test("registration rejects dangerous redirects and unsupported metadata", async () => {
  for (const redirect of ["https://user:pass@example.com/cb", "https://example.com/cb#fragment", "http://example.com/cb", "javascript:alert(1)", "http://localhost.evil/cb"]) expect((await request("/oauth/register", { redirect_uris: [redirect] })).status).toBe(400);
  expect((await request("/oauth/register", { redirect_uris: ["https://example.com/cb"], token_endpoint_auth_method: "client_secret_post" })).status).toBe(400);
});
test("consent requires human session, S256, exact redirect, resource and supported scopes", async () => {
  const { input } = await authorize();
  for (const change of [{ code_challenge_method: "plain" }, { redirect_uri: "https://evil.example" }, { resource: "https://other.example/mcp" }, { scope: "crm:read email:send" }]) expect((await request("/oauth/authorize", { ...input, ...change, approved: true }, { token: "session" })).status).toBe(400);
  expect((await request("/oauth/authorize", { ...input, approved: true }, { token: "api" })).status).toBe(403);
  expect((await request("/oauth/authorize", { ...input, approved: true }, { token: "viewer" })).status).toBe(403);
  const page = await request("/oauth/authorize?" + new URLSearchParams(input), null, { method: "GET" });
  expect(page.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  expect(await page.text()).toContain("crmApiToken");
});
test("code exchange validates PKCE and code is single use", async () => {
  const { exchange } = await authorize();
  expect((await request("/oauth/token", { ...exchange, code_verifier: "b".repeat(50) })).status).toBe(400);
  expect((await request("/oauth/token", exchange)).status).toBe(200);
  expect((await request("/oauth/token", exchange)).status).toBe(400);
  const rows = db.sqlite.prepare("SELECT hash FROM assistant_mcp_tokens").all();
  expect(rows.every(row => /^[a-f0-9]{64}$/.test(row.hash))).toBe(true);
});
test("refresh rotates and reuse revokes descendants", async () => {
  const { exchange, tokens } = await tokenSet();
  const input = { grant_type: "refresh_token", client_id: exchange.client_id, resource: exchange.resource, refresh_token: tokens.refresh_token };
  const refreshed = await request("/oauth/token", input); expect(refreshed.status).toBe(200);
  const next = await refreshed.json(); expect(next.refresh_token).not.toBe(tokens.refresh_token);
  expect((await call("tools/list", {}, next.access_token)).status).toBe(200);
  expect((await request("/oauth/token", input)).status).toBe(400);
  expect((await call("tools/list", {}, next.access_token)).status).toBe(401);
});
test("revocation invalidates access and refresh and hides unknown tokens", async () => {
  const { exchange, tokens } = await tokenSet();
  expect((await request("/oauth/revoke", { client_id: exchange.client_id, token: tokens.refresh_token })).status).toBe(200);
  expect((await call("tools/list", {}, tokens.access_token)).status).toBe(401);
  expect((await request("/oauth/token", { grant_type: "refresh_token", client_id: exchange.client_id, resource: exchange.resource, refresh_token: tokens.refresh_token })).status).toBe(400);
  expect((await request("/oauth/revoke", { client_id: exchange.client_id, token: "unknown" })).status).toBe(200);
});
test("OAuth and legacy API tokens cannot cross workspace boundaries", async () => {
  const { tokens } = await tokenSet();
  for (const token of [tokens.access_token, "api"]) expect((await call("tools/list", {}, token, { headers: { "X-Workspace-Id": "other" } })).status).toBe(403);
  expect((await call("tools/call", { name: "crm_contact", arguments: { contactId: "c" } }, "api")).status).toBe(200);
  expect(dispatched[0]).toEqual({ name: "crm_contact", args: { contactId: "c" }, workspaceId: "workspace_default", userId: "u" });
});
test("expiry and disabled users invalidate access; refresh cannot act as access", async () => {
  const { tokens } = await tokenSet();
  expect((await call("tools/list", {}, tokens.refresh_token)).status).toBe(401);
  db.sqlite.exec("UPDATE users SET status='disabled' WHERE id='u'");
  expect((await call("tools/list", {}, tokens.access_token)).status).toBe(401);
  db.sqlite.exec("UPDATE users SET status='active' WHERE id='u'; UPDATE assistant_mcp_tokens SET expires_at=0 WHERE kind='access'");
  expect((await call("tools/list", {}, tokens.access_token)).status).toBe(401);
});
test("MCP negotiation, notifications, malformed requests and origin restrictions", async () => {
  const init = await call("initialize", { protocolVersion: "2099-01-01", clientInfo: { name: "test", version: "1" }, capabilities: {} });
  expect((await init.json()).result.protocolVersion).toBe("2025-06-18");
  expect((await request("/mcp", { jsonrpc: "2.0", method: "notifications/initialized" }, { token: "session" })).status).toBe(202);
  expect((await (await request("/mcp", "{broken", { token: "session" })).json()).error.code).toBe(-32700);
  expect((await (await request("/mcp", [], { token: "session" })).json()).error.code).toBe(-32600);
  expect((await (await call("unknown")).json()).error.code).toBe(-32601);
  expect((await call("ping", {}, "session", { headers: { Origin: "https://evil.example" } })).status).toBe(403);
  expect((await call("ping", {}, "session", { headers: { "MCP-Protocol-Version": "unknown" } })).status).toBe(400);
  expect((await request("/mcp", null, { method: "GET", token: "session" })).status).toBe(405);
  const unauth = await request("/mcp", {}); expect(unauth.status).toBe(401); expect(unauth.headers.get("WWW-Authenticate")).toContain("oauth-protected-resource/mcp");
});
test("draft requires scope, write role, exact user-bound single-use approval", async () => {
  const { tokens } = await tokenSet();
  const args = { contactId: "c", instructions: "Thank them for meeting" };
  const approval = await request("/api/assistant/mcp/approvals", { tool: "assistant_prepare_draft", arguments: args }, { token: "session" });
  expect(approval.status).toBe(201); const { approval_id } = await approval.json();
  const toolCall = payload => call("tools/call", { name: "assistant_prepare_draft", arguments: payload }, tokens.access_token);
  expect((await (await toolCall({ ...args, instructions: "different", approval_id })).json()).result.isError).toBe(true);
  expect(dispatched.length).toBe(0);
  expect((await (await toolCall({ ...args, approval_id })).json()).result.isError).toBe(false);
  expect(dispatched.length).toBe(1); expect(dispatched[0].args).toEqual(args);
  expect((await (await toolCall({ ...args, approval_id })).json()).result.isError).toBe(true);
  for (const token of ["api", "viewer"]) expect((await request("/api/assistant/mcp/approvals", { tool: "assistant_prepare_draft", arguments: args }, { token })).status).toBe(403);
  const readOnly = await tokenSet("crm:read");
  expect((await (await toolCall({ ...args, approval_id: "fake" })).json()).result.isError).toBe(true);
  expect((await (await call("tools/list", {}, readOnly.tokens.access_token)).json()).result.tools.map(t => t.name)).not.toContain("assistant_prepare_draft");
  expect((await (await call("tools/call", { name: "assistant_prepare_draft", arguments: { ...args, approval_id } }, readOnly.tokens.access_token)).json()).result.isError).toBe(true);
});
test("unknown tools and extra scope-changing arguments never dispatch", async () => {
  for (const params of [{ name: "email_send", arguments: {} }, { name: "crm_contact", arguments: { contactId: "c", workspaceId: "other" } }, { name: "crm_search", arguments: { query: "x", limit: 999 } }]) expect((await (await call("tools/call", params)).json()).error.code).toBe(-32602);
  expect(dispatched.length).toBe(0);
});

test("valid code replay revokes issued access while wrong-client exchange does not consume code", async () => {
  const { exchange } = await authorize();
  expect((await request("/oauth/token", { ...exchange, client_id: "other" })).status).toBe(400);
  const issued = await (await request("/oauth/token", exchange)).json();
  expect((await call("tools/list", {}, issued.access_token)).status).toBe(200);
  expect((await request("/oauth/token", exchange)).status).toBe(400);
  expect((await call("tools/list", {}, issued.access_token)).status).toBe(401);
});
test("expired codes, refresh tokens and absolute grants are rejected", async () => {
  const { exchange } = await authorize();
  db.sqlite.exec("UPDATE assistant_mcp_codes SET expires_at=0");
  expect((await request("/oauth/token", exchange)).status).toBe(400);
  const { exchange: next, tokens } = await tokenSet();
  db.sqlite.exec("UPDATE assistant_mcp_tokens SET expires_at=0 WHERE kind='refresh'");
  expect((await request("/oauth/token", { grant_type: "refresh_token", client_id: next.client_id, resource: next.resource, refresh_token: tokens.refresh_token })).status).toBe(400);
  db.sqlite.exec("UPDATE assistant_mcp_grants SET expires_at=0");
  expect((await call("tools/list", {}, tokens.access_token)).status).toBe(401);
});
test("approvals cannot cross users or workspaces and expire", async () => {
  const args = { contactId: "c", instructions: "Prepare a note" };
  const approval = await (await request("/api/assistant/mcp/approvals", { tool: "assistant_prepare_draft", arguments: args }, { token: "session" })).json();
  const params = { name: "assistant_prepare_draft", arguments: { ...args, approval_id: approval.approval_id } };
  helpers.requireWorkspaceWrite = async () => {};
  expect((await (await call("tools/call", params, "viewer")).json()).result.isError).toBe(true);
  expect(dispatched.length).toBe(0);
  helpers.requireWorkspaceRole = async () => ({ role: "member" });
  expect((await (await call("tools/call", params, "session", { headers: { "X-Workspace-Id": "other" } })).json()).result.isError).toBe(true);
  expect(dispatched.length).toBe(0);
  db.sqlite.exec("UPDATE assistant_mcp_approvals SET expires_at=0");
  expect((await (await call("tools/call", params)).json()).result.isError).toBe(true);
  expect(dispatched.length).toBe(0);
});
test("concurrent calls consume approval only once", async () => {
  const args = { contactId: "c", instructions: "Prepare a note" };
  const approval = await (await request("/api/assistant/mcp/approvals", { tool: "assistant_prepare_draft", arguments: args }, { token: "session" })).json();
  const params = { name: "assistant_prepare_draft", arguments: { ...args, approval_id: approval.approval_id } };
  const responses = await Promise.all([call("tools/call", params), call("tools/call", params)]);
  const results = await Promise.all(responses.map(r => r.json()));
  expect(results.filter(r => !r.result.isError).length).toBe(1);
  expect(dispatched.length).toBe(1);
});
test("unknown notifications are silent and unsupported version is checked first", async () => {
  const notification = { jsonrpc: "2.0", method: "notifications/future" };
  const response = await request("/mcp", notification, { token: "session" });
  expect(response.status).toBe(202); expect(await response.text()).toBe("");
  expect((await request("/mcp", notification, { token: "session", headers: { "MCP-Protocol-Version": "invalid" } })).status).toBe(400);
});
test("body limit, registration limit, transport headers and CORS boundaries", async () => {
  expect((await request("/oauth/register", " ".repeat(65537))).status).toBe(413);
  for (let i = 0; i < 30; i++) expect((await request("/oauth/register", { redirect_uris: ["https://example.com/cb"] })).status).toBe(201);
  expect((await request("/oauth/register", { redirect_uris: ["https://example.com/cb"] })).status).toBe(429);
  expect((await call("ping", {}, "session", { headers: { Accept: "application/json" } })).status).toBe(406);
  expect((await call("ping", {}, "session", { headers: { "Content-Type": "text/plain" } })).status).toBe(415);
  env.MCP_ALLOWED_ORIGINS = "https://trusted.example";
  const cors = await call("ping", {}, "session", { headers: { Origin: "https://trusted.example" } });
  expect(cors.status).toBe(200); expect(cors.headers.get("Access-Control-Allow-Origin")).toBe("https://trusted.example");
  expect((await request("/api/assistant/mcp/approvals", {}, { token: "session", headers: { Origin: "https://trusted.example" } })).status).toBe(403);
  expect((await request("/mcp?access_token=secret", {}, { token: "session" })).status).toBe(400);
});
test("live membership loss blocks an existing OAuth grant", async () => {
  const { tokens } = await tokenSet();
  helpers.requireWorkspaceRole = async () => { throw error(403); };
  expect((await call("tools/list", {}, tokens.access_token)).status).toBe(403);
  expect(dispatched.length).toBe(0);
});
test("form-encoded OAuth exchange works and token resource is bound", async () => {
  const { exchange } = await authorize();
  const response = await request("/oauth/token", new URLSearchParams(exchange).toString(), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  expect(response.status).toBe(200);
  const tokens = await response.json();
  env.MCP_PUBLIC_ORIGIN = "https://other.example";
  expect((await call("tools/list", {}, tokens.access_token)).status).toBe(401);
});
test("concurrent refresh reuse cannot leave a valid descendant grant", async () => {
  const { exchange, tokens } = await tokenSet();
  const input = { grant_type: "refresh_token", client_id: exchange.client_id, resource: exchange.resource, refresh_token: tokens.refresh_token };
  const responses = await Promise.all([request("/oauth/token", input), request("/oauth/token", input)]);
  expect(responses.map(r => r.status).sort()).toEqual([200, 400]);
  const success = await responses.find(r => r.status === 200).json();
  expect((await call("tools/list", {}, success.access_token)).status).toBe(401);
});
test("dispatcher failures are redacted and do not restore a consumed approval", async () => {
  const args = { contactId: "c", instructions: "Prepare a note" };
  const approval = await (await request("/api/assistant/mcp/approvals", { tool: "assistant_prepare_draft", arguments: args }, { token: "session" })).json();
  const params = { name: "assistant_prepare_draft", arguments: { ...args, approval_id: approval.approval_id } };
  let attempts = 0;
  helpers.dispatchAssistantTool = async () => { attempts++; throw new Error("secret database detail"); };
  const failed = await (await call("tools/call", params)).json();
  expect(failed.result.isError).toBe(true);
  expect(JSON.stringify(failed)).not.toContain("secret database");
  await call("tools/call", params);
  expect(attempts).toBe(1);
});
test("search schemas enforce dispatcher query and result bounds", async () => {
  const listed = (await (await call("tools/list")).json()).result.tools;
  for (const name of ["crm_search", "assistant_search"]) {
    const schema = listed.find(tool => tool.name === name).inputSchema;
    expect(schema.properties.query.maxLength).toBe(500);
    expect(schema.properties.limit.maximum).toBe(20);
    for (const args of [{ query: "x".repeat(501) }, { query: "x", limit: 21 }]) expect((await (await call("tools/call", { name, arguments: args })).json()).error.code).toBe(-32602);
    expect((await (await call("tools/call", { name, arguments: { query: "x".repeat(500), limit: 20 } })).json()).result.isError).toBe(false);
  }
  expect(dispatched.length).toBe(2);
});
