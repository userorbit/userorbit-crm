import { afterEach, expect, mock, test } from "bun:test";
import { createD1 } from "./helpers/d1.js";
mock.module("cloudflare:sockets", () => ({ connect() { throw new Error("Network sends forbidden in pagination tests"); } }));
const { default: worker } = await import("../src/worker.js");
let db;
afterEach(() => db?.close());

test("all accounts are reachable in stable bounded pages without changing the API array response", async () => {
  db = createD1();
  const insert = db.sqlite.prepare("INSERT INTO accounts(id,name,workspace_id,created_at,updated_at) VALUES(?,?,?,?,?)");
  for (let i = 176; i >= 0; i -= 1) insert.run(`account-${String(i).padStart(3, "0")}`, `Account ${i}`, "workspace_default", "2026", "2026");
  insert.run("foreign", "Foreign workspace", "unrelated-workspace", "2026", "2026");
  async function list(query = "") {
    const response = await worker.fetch(new Request("https://crm.test/api/accounts" + query, { headers: { authorization: "Bearer test-token" } }), { DB: db.DB, CRM_API_TOKEN: "test-token" });
    expect(response.status).toBe(200);
    return response.json();
  }
  const first = await list();
  const second = await list("?offset=100");
  expect(Array.isArray(first)).toBe(true);
  expect(first).toHaveLength(100);
  expect(second).toHaveLength(77);
  expect([...first, ...second].map((account) => account.id)).toEqual(Array.from({ length: 177 }, (_, i) => `account-${String(i).padStart(3, "0")}`));
  expect(await list("?offset=200")).toEqual([]);
  expect(await list("?offset=100&limit=1")).toHaveLength(1);
  expect(await list("?limit=1000")).toHaveLength(100);
  expect(await list("?offset=-9&limit=2")).toHaveLength(2);
  expect(await list("?offset=invalid&limit=invalid")).toHaveLength(100);
  const filtered = await list("?q=Account%20176&offset=0");
  expect(filtered.map((account) => account.id)).toEqual(["account-176"]);
});
