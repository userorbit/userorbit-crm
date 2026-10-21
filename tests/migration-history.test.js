import { afterEach, beforeEach, expect, test } from "bun:test";
import { createD1 } from "./helpers/d1.js";
import { handleMigrationHistory, migrationHistoryHtml } from "../src/migration-history.js";
let db;
beforeEach(() => {
  db = createD1({ migrations: false });
  db.sqlite.exec(`CREATE TABLE legacy_records(id TEXT PRIMARY KEY,source_table TEXT,source_id TEXT,workspace_id TEXT,title TEXT,payload_json TEXT,created_at TEXT,updated_at TEXT);
    CREATE TABLE legacy_record_access(record_id TEXT,user_id TEXT,PRIMARY KEY(record_id,user_id));
    CREATE TABLE legacy_record_chunks(record_id TEXT,chunk_index INTEGER,data TEXT,PRIMARY KEY(record_id,chunk_index));
    CREATE TABLE legacy_record_blobs(record_id TEXT,chunk_index INTEGER,data TEXT,PRIMARY KEY(record_id,chunk_index));`);
  for (const [id, type, title, user] of [["orbit:accounts:1", "accounts", "Visible <script>alert(1)</script>", "alice"], ["orbit:mail:2", "mail", "Private mail", "bob"]]) {
    db.sqlite.prepare("INSERT INTO legacy_records VALUES(?,?,?,?,?,?,?,?)").run(id, type, id.split(":").pop(), "w", title, JSON.stringify({ name: title }), "2026", "2026");
    db.sqlite.prepare("INSERT INTO legacy_record_access VALUES(?,?)").run(id, user);
  }
});
afterEach(() => db.close());
function request(path = "", { user = "alice", kind = "session", status = "active", method = "GET" } = {}) {
  return handleMigrationHistory(new Request(`https://crm.test/api/migration-history${path}`, { method }), { DB: db.DB }, { requireAuth: async () => ({ kind, user: { id: user, status, role: "owner" } }) });
}

test("list, counts and detail obey source ACL, including an administrator", async () => {
  const response = await request();
  expect(response.headers.get("cache-control")).toBe("no-store");
  const result = await response.json();
  expect(result.records.map((r) => r.id)).toEqual(["orbit:accounts:1"]);
  expect(result.types).toEqual([{ type: "accounts", count: 1 }]);
  expect((await request("/orbit%3Amail%3A2")).status).toBe(404);
  expect((await (await request("/orbit%3Aaccounts%3A1")).json()).payload.name).toContain("<script>");
  expect((await (await request("", { user: "admin" })).json()).records).toEqual([]);
  expect((await (await request("", { user: "bob" })).json()).types).toEqual([{ type: "mail", count: 1 }]);
});

test("bootstrap, workspace tokens, invitations and inactive users cannot read history", async () => {
  for (const kind of ["bootstrap", "workspace_token", "invite"]) expect((await request("", { kind })).status).toBe(403);
  expect((await request("", { status: "disabled" })).status).toBe(403);
  expect((await request("", { method: "DELETE" })).status).toBe(405);
});

test("SQL filters bind parameters, escape wildcard searches and cap pagination", async () => {
  expect((await (await request("?type=mail")).json()).records).toEqual([]);
  expect((await (await request("?type=' OR 1=1 --")).json()).records).toEqual([]);
  expect((await (await request("?search=%25")).json()).records).toEqual([]);
  expect((await (await request("?search=Visible&limit=1000000")).json()).limit).toBe(100);
  expect((await (await request("?search=Visible")).json()).records).toHaveLength(1);
  expect((await request("/%E0%A4%A")).status).toBe(404);
});

test("chunked details and attachment downloads require record ACL and preserve exact bytes", async () => {
  const id = "orbit:accounts:1";
  const payload = JSON.stringify({ name: 'bad\r\n"name', attachment_download: true, note: "large original record" });
  db.sqlite.prepare("UPDATE legacy_records SET payload_json = ? WHERE id = ?").run('{"_chunked":true}', id);
  db.sqlite.prepare("INSERT INTO legacy_record_chunks VALUES(?,?,?)").run(id, 1, payload.slice(20));
  db.sqlite.prepare("INSERT INTO legacy_record_chunks VALUES(?,?,?)").run(id, 0, payload.slice(0, 20));
  const bytes = Uint8Array.from([0, 1, 255, 40]);
  db.sqlite.prepare("INSERT INTO legacy_record_blobs VALUES(?,?,?)").run(id, 0, btoa(String.fromCharCode(...bytes)));
  expect((await (await request("/" + encodeURIComponent(id))).json()).payload.note).toBe("large original record");
  const response = await request("/" + encodeURIComponent(id) + "/attachment");
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/octet-stream");
  expect(response.headers.get("content-disposition")).toBe('attachment; filename="bad___name"');
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  expect((await request("/" + encodeURIComponent(id) + "/attachment", { user: "bob" })).status).toBe(404);
  expect((await request("/orbit%3Amail%3A2/attachment", { user: "bob" })).status).toBe(404);
});

test("HTML embeds no records and renders untrusted titles and payload with textContent", async () => {
  const html = migrationHistoryHtml();
  expect(html).toContain("textContent = record.title");
  expect(html).toContain("detail.textContent = JSON.stringify");
  expect(html).not.toContain("innerHTML");
  expect(html).not.toContain("alert(1)");
  expect(html).toContain("crmApiToken");
  expect(html).toContain("https://gtm.userorb.com");
  const response = await handleMigrationHistory(new Request("https://crm.test/migration-history"), {}, {});
  expect(response.status).toBe(200);
  expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
});
