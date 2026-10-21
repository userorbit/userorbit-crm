import { beforeEach, afterEach, expect, test, mock } from "bun:test";
import { createD1 } from "./helpers/d1.js";
mock.module("cloudflare:sockets", () => ({ connect() { throw new Error("External sends forbidden in integration tests"); } }));
const { default: worker } = await import("../src/worker.js");
let db, env;
beforeEach(() => {
  db = createD1(); env = { DB: db.DB, CRM_API_TOKEN: "integration-bootstrap" };
  db.sqlite.exec(`INSERT INTO users(id,email,name,created_at,updated_at) VALUES ('viewer','viewer@test.invalid','Viewer','now','now');
    INSERT INTO team_members(id,team_id,user_id,role,created_at,updated_at) VALUES ('viewer-team','team_default','viewer','viewer','now','now');
    INSERT INTO workspace_members(id,workspace_id,user_id,role,created_at,updated_at) VALUES ('viewer-workspace','workspace_default','viewer','viewer','now','now');
    INSERT INTO accounts(id,name,domain,workspace_id,created_at,updated_at) VALUES ('acme','Acme','acme.test','workspace_default','now','now');
    INSERT INTO contacts(id,account_id,name,email,created_at,updated_at) VALUES ('alice','acme','Alice','alice@acme.test','now','now');`);
});
afterEach(() => db.close());
async function request(path, { method = "GET", data, token = env.CRM_API_TOKEN, workspaceId = "workspace_default" } = {}) {
  const headers = { "content-type": "application/json", "x-workspace-id": workspaceId };
  if (token) headers.authorization = "Bearer " + token;
  return worker.fetch(new Request("https://crm.test" + path, { method, headers, body: data === undefined ? undefined : JSON.stringify(data) }), env);
}
async function tokenFor(userId, token) {
  const hash = new Bun.CryptoHasher("sha256").update(token).digest("hex");
  db.sqlite.prepare("INSERT INTO workspace_api_tokens(id,workspace_id,created_by_user_id,name,token_hash,created_at,updated_at) VALUES (?,?,?,?,?,'now','now')").run(userId + "-token", "workspace_default", userId, "Test token", hash);
  return token;
}

test("assistant shell, callback bridge and existing app remain reachable", async () => {
  for (const path of ["/", "/app", "/assistant", "/api/assistant/mail/oauth/callback?code=test&state=test"]) {
    const response = await request(path, { token: "" });
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<html");
    for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) expect(() => new Function(match[1])).not.toThrow();
  }
  expect((await request("/api/assistant/contacts", { token: "" })).status).toBe(401);
  expect((await request("/api/assistant/mail/oauth/callback?code=test&state=test", { method: "POST", data: {} })).status).toBe(400);
});

test("all new read routes run against the combined migration schema", async () => {
  for (const path of ["contacts", "mail/connections", "mail/messages", "intelligence/attention", "intelligence/commitments", "intelligence/writing-samples", "intelligence/drafts", "knowledge/documents", "knowledge/search?q=Acme", "network/imports", "network/edges", "network/alerts", "network/monitors", "automations/jobs", "automations/templates", "automations/notifications"]) {
    const response = await request("/api/assistant/" + path);
    expect({ path, status: response.status, error: response.ok ? null : await response.text() }).toEqual({ path, status: 200, error: null });
  }
});

test("viewer tokens can read but cannot create assistant records", async () => {
  const token = await tokenFor("viewer", "viewer-test-token");
  expect((await request("/api/assistant/contacts", { token })).status).toBe(200);
  for (const path of ["mail/connect", "knowledge/documents", "intelligence/commitments/extract", "network/imports", "automations/jobs"]) {
    expect((await request("/api/assistant/" + path, { method: "POST", data: {}, token })).status).toBe(403);
  }
});

test("workspace-bound API tokens cannot select another accessible workspace", async () => {
  const token = await tokenFor("user_bootstrap", "owner-test-token");
  db.sqlite.exec("INSERT INTO workspaces(id,team_id,name,slug,created_at,updated_at) VALUES ('other','team_default','Other','other','now','now')");
  const response = await request("/api/assistant/contacts", { token, workspaceId: "other" });
  expect(response.status).toBe(403);
});

test("knowledge upload, answer and source opening work through Worker routing", async () => {
  const response = await request("/api/assistant/knowledge/documents", { method: "POST", data: { name: "Acme agreement", text: "Acme agreed to a sapphire launch in November." } });
  expect(response.status).toBe(201);
  const answer = await request("/api/assistant/knowledge/ask", { method: "POST", data: { query: "sapphire launch" } });
  expect(answer.status).toBe(200);
  const result = await answer.json();
  expect(result.sources.length).toBeGreaterThan(0);
  const source = new URL(result.sources[0].url, "https://crm.test");
  expect((await request(source.pathname + source.search)).status).toBe(200);
});

test("network imports remain review-only and safe to repeat", async () => {
  const data = { format: "csv", content: "First Name,Last Name,URL,Email Address,Company,Position\nAlice,Example,https://www.linkedin.com/in/alice-example/,,Acme,Founder", confirm: true };
  const first = await request("/api/assistant/network/imports", { method: "POST", data });
  expect(first.status).toBe(200);
  expect((await request("/api/assistant/network/imports", { method: "POST", data })).ok).toBe(true);
  expect(db.sqlite.query("SELECT count(*) AS n FROM contacts").get().n).toBe(1);
  expect(db.sqlite.query("SELECT count(*) AS n FROM assistant_network_imports").get().n).toBe(1);
});

test("manual jobs are processed with real feature dispatch and no outreach", async () => {
  const created = await request("/api/assistant/automations/jobs", { method: "POST", data: { name: "Daily attention", template: "attention", schedule: { type: "daily", time: "09:00" }, timezone: "Asia/Kolkata" } });
  expect(created.status).toBe(201);
  const { job } = await created.json();
  expect((await request(`/api/assistant/automations/jobs/${job.id}/run`, { method: "POST", data: {} })).status).toBe(202);
  const promises = [];
  worker.scheduled({}, env, { waitUntil(promise) { promises.push(promise); } });
  await Promise.all(promises);
  const response = await request(`/api/assistant/automations/jobs/${job.id}/runs`);
  const { runs } = await response.json();
  expect(runs[0].status).toBe("succeeded");
  expect(runs[0].summary).toContain("relationship");
  expect(db.sqlite.query("SELECT count(*) AS n FROM email_events").get().n).toBe(0);
});


test("disabled users cannot use retained workspace tokens", async () => {
  const token = await tokenFor("viewer", "disabled-viewer-token");
  db.sqlite.exec("UPDATE users SET status='disabled' WHERE id='viewer'");
  expect((await request("/api/assistant/contacts", { token })).status).toBe(403);
});

test("MCP tools reach real scoped CRM and knowledge dispatch", async () => {
  async function rpc(method, params) {
    const response = await worker.fetch(new Request("https://crm.test/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: "Bearer " + env.CRM_API_TOKEN, "x-workspace-id": "workspace_default" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }), env);
    expect(response.status).toBe(200);
    return response.json();
  }
  const initialized = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "Integration test", version: "1" } });
  expect(initialized.result.capabilities.tools).toBeTruthy();
  const result = await rpc("tools/call", { name: "crm_contact", arguments: { contactId: "alice" } });
  expect(JSON.stringify(result)).toContain("Alice");
  const search = await rpc("tools/call", { name: "assistant_search", arguments: { query: "Acme", limit: 5 } });
  expect(JSON.stringify(search)).toContain("Acme");
  const draft = await rpc("tools/call", { name: "assistant_prepare_draft", arguments: { contactId: "alice", instructions: "Follow up" } });
  expect(draft.error || draft.result?.isError).toBeTruthy();
  expect(db.sqlite.query("SELECT count(*) AS n FROM assistant_drafts").get().n).toBe(0);
});
