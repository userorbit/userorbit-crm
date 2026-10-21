import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { createD1 } from "./helpers/d1.js";
mock.module("cloudflare:sockets", () => ({ connect() { throw new Error("Network sends forbidden in regression tests"); } }));
const { default: worker } = await import("../src/worker.js");
let database;
let env;
beforeEach(() => { database = createD1(); env = { DB: database.DB, CRM_API_TOKEN: "test-bootstrap-only" }; });
afterEach(() => database.close());
async function api(path, { method = "GET", data, token = env.CRM_API_TOKEN, workspaceId } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (workspaceId) headers["x-workspace-id"] = workspaceId;
  return worker.fetch(new Request(`https://crm.test/api/${path}`, { method, headers, body: data ? JSON.stringify(data) : undefined }), env);
}

describe("existing CRM behavior", () => {
  test("all migrations apply and default templates survive", () => {
    expect(database.sqlite.query("SELECT count(*) AS n FROM email_templates").get().n).toBe(4);
    expect(database.sqlite.query("SELECT count(*) AS n FROM sequence_steps").get().n).toBe(4);
  });
  test("public pages load and private APIs require authentication", async () => {
    const page = await worker.fetch(new Request("https://crm.test/app"), env);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("Sign in");
    expect((await api("summary", { token: "" })).status).toBe(401);
  });
  test("dashboard and existing API collections remain readable", async () => {
    for (const path of ["me", "summary", "accounts", "tasks", "opportunities", "calendar/events", "communications", "next-best-actions", "reports", "sequences"]) {
      const response = await api(path);
      expect({ path, status: response.status, body: response.ok ? null : await response.text() }).toEqual({ path, status: 200, body: null });
    }
  });
  test("account create, task create, and contact timeline still work", async () => {
    const accountResponse = await api("accounts", { method: "POST", data: { name: "Regression Co", domain: "regression.example", segment: "product", contacts: [{ name: "A Person", email: "a@regression.example" }] } });
    expect(accountResponse.status).toBe(201);
    const account = await accountResponse.json();
    const contact = database.sqlite.query("SELECT id FROM contacts WHERE account_id = ?").get(account.id);
    expect(contact).toBeTruthy();
    const task = await api("tasks", { method: "POST", data: { accountId: account.id, contactId: contact.id, title: "Prepare demo", dueAt: "2026-11-01T10:00:00.000Z" } });
    expect(task.status).toBe(201);
    const timeline = await api(`contacts/${contact.id}`);
    expect(timeline.status).toBe(200);
    expect((await timeline.json()).tasks).toHaveLength(1);
    expect((await api(`accounts/${account.id}`)).status).toBe(200);
  });
  test("workspace boundaries reject foreign records", async () => {
    const response = await api("summary", { workspaceId: "does-not-exist" });
    expect(response.status).not.toBe(200);
  });
});
