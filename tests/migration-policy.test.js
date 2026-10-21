import { afterEach, beforeEach, expect, test } from "bun:test";
import { createD1 } from "./helpers/d1.js";
import { enforceMigrationPolicy } from "../src/migration-policy.js";

let db;
const auth = { user: { id: "ic", name: "Example IC" } };
beforeEach(() => {
  db = createD1({ migrations: false });
  db.sqlite.exec(`
    CREATE TABLE workspaces (id TEXT, team_id TEXT);
    CREATE TABLE legacy_memberships (source_workspace_id TEXT, user_id TEXT, team_id TEXT, role TEXT);
    INSERT INTO workspaces VALUES ('own', 'imported-team'), ('unrelated', 'other-team');
    INSERT INTO legacy_memberships VALUES ('source', 'ic', 'imported-team', 'ic'), ('source', 'lead', 'imported-team', 'founder'), ('source', 'manager', 'imported-team', 'manager');
  `);
});
afterEach(() => db.close());

function guard(path, method = "POST", input = {}, identity = auth, workspaceId = "own") {
  const request = new Request("https://crm.test/api/" + path, {
    method,
    headers: { "content-type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(input),
  });
  return enforceMigrationPolicy(request, { DB: db.DB }, path, workspaceId, identity);
}

test("migrated ICs cannot change lifecycle or owner through direct, import, merge, or assistant routes", async () => {
  for (const key of ["status", "owner", "ownerId", "owner_id"]) {
    await expect(guard("accounts/company", "PATCH", { [key]: "new" })).rejects.toMatchObject({ status: 403 });
    await expect(guard("accounts", "POST", { name: "Company", [key]: "new" })).rejects.toMatchObject({ status: 403 });
  }
  for (const path of ["import/accounts.csv", "accounts/company/merge", "assistant/automations/jobs", "sequences", "messages/send", "teams", "workspaces", "workspace-tokens", "opportunities"]) {
    await expect(guard(path)).rejects.toMatchObject({ status: 403 });
  }
  await expect(guard("dialer/sessions/session/next", "GET")).rejects.toMatchObject({ status: 403 });
  await expect(guard("sequences", "GET")).rejects.toMatchObject({ status: 403 });
  await expect(guard("warmup", "GET")).rejects.toMatchObject({ status: 403 });
});

test("company creation defaults to the IC display owner and leaves the body readable", async () => {
  const request = await guard("accounts", "POST", { name: "Company" });
  expect(await request.json()).toEqual({ name: "Company", owner: "Example IC" });
  const update = await guard("accounts/company", "PATCH", { observation: "Updated research" });
  expect(await update.json()).toEqual({ observation: "Updated research" });
});

test("owned execution, self settings, and reads remain available", async () => {
  for (const [path, method] of [["contacts", "POST"], ["tasks", "POST"], ["tasks/task", "PATCH"], ["communications", "POST"], ["contacts/contact/unsubscribe", "POST"], ["auth/password", "POST"], ["dashboard/preferences", "PATCH"], ["accounts", "GET"], ["assistant/knowledge/search", "GET"]]) {
    expect((await guard(path, method)).method).toBe(method);
  }
});

test("nonmigrated users and team leads keep their existing permissions", async () => {
  for (const identity of [{ user: { id: "lead" } }, { user: { id: "ordinary" } }]) {
    expect((await guard("sequences", "POST", {}, identity)).method).toBe("POST");
  }
  expect((await guard("sequences", "POST", {}, auth, "unrelated")).method).toBe("POST");
});

test("migrated managers cannot grant team access while keeping team data and reporting permissions", async () => {
  const manager = { user: { id: "manager" } };
  for (const method of ["POST", "PATCH", "DELETE"]) {
    for (const path of ["team-invitations", "team-invitations/invitation"]) {
      await expect(guard(path, method, { role: "owner" }, manager)).rejects.toMatchObject({ status: 403 });
    }
  }
  for (const [path, method] of [["team-invitations", "GET"], ["accounts/company", "PATCH"], ["tasks", "POST"], ["reports", "GET"]]) {
    expect((await guard(path, method, {}, manager)).method).toBe(method);
  }
  expect((await guard("team-invitations", "POST", {}, { user: { id: "lead" } })).method).toBe("POST");
  expect((await guard("team-invitations", "POST", {}, { user: { id: "ordinary" } })).method).toBe("POST");
  expect((await guard("team-invitations", "POST", {}, manager, "unrelated")).method).toBe("POST");
});

test("invalid account payloads produce client errors before mutation", async () => {
  await expect(guard("accounts", "POST", null)).rejects.toMatchObject({ status: 400 });
  await expect(guard("accounts", "POST", [])).rejects.toMatchObject({ status: 400 });
});


test("migrated ICs can maintain contact details and private Google connections without gaining outreach rights", async () => {
  expect((await guard("contacts/contact", "PATCH", { title: "Head of Sales" })).method).toBe("PATCH");
  for (const key of ["status", "owner", "ownerId", "accountId", "workspaceId"]) {
    await expect(guard("contacts/contact", "PATCH", { [key]: "changed" })).rejects.toMatchObject({ status: 403 });
  }
  for (const path of ["assistant/mail/connect", "assistant/mail/oauth/callback", "assistant/mail/connections/mine/sync", "assistant/mail/connections/mine/calendar-sync"]) {
    expect((await guard(path)).method).toBe("POST");
  }
  expect((await guard("assistant/mail/connections/mine", "DELETE")).method).toBe("DELETE");
  await expect(guard("assistant/mail/send")).rejects.toMatchObject({ status: 403 });
  await expect(guard("assistant/updates/guessed/review", "POST", { action: "accept" })).rejects.toMatchObject({ status: 403 });
});
