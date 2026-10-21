import { expect, test } from "bun:test";
import { readBody } from "../src/assistant/shared.js";
import { createD1 } from "./helpers/d1.js";

test("assistant request parser rejects invalid, oversized and non-object JSON", async () => {
  for (const body of ["{", "null", "[]", '"text"']) {
    await expect(readBody(new Request("https://test/", { method: "POST", body }))).rejects.toHaveProperty("status", 400);
  }
  await expect(readBody(new Request("https://test/", { method: "POST", body: JSON.stringify({ text: "x".repeat(50) }) }), 20)).rejects.toHaveProperty("status", 413);
  expect(await readBody(new Request("https://test/", { method: "POST", body: '{"query":"demo"}' }))).toEqual({ query: "demo" });
});

test("D1 batch statement bindings are independent", async () => {
  const db = createD1({ migrations: false });
  db.sqlite.exec("CREATE TABLE entries (id INTEGER PRIMARY KEY, value TEXT)");
  const statement = db.DB.prepare("INSERT INTO entries VALUES (?, ?)");
  await db.DB.batch([statement.bind(1, "one"), statement.bind(2, "two")]);
  expect(db.sqlite.query("SELECT value FROM entries ORDER BY id").all()).toEqual([{ value: "one" }, { value: "two" }]);
  db.close();
});

test("D1 batches roll back on an error", async () => {
  const db = createD1({ migrations: false });
  db.sqlite.exec("CREATE TABLE entries (id INTEGER PRIMARY KEY)");
  const statement = db.DB.prepare("INSERT INTO entries VALUES (?)");
  await expect(db.DB.batch([statement.bind(1), statement.bind(1)])).rejects.toThrow();
  expect(db.sqlite.query("SELECT count(*) AS n FROM entries").get().n).toBe(0);
  db.close();
});
