import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createD1 } from "./helpers/d1.js";

test("assistant migrations preserve populated CRM records and foreign keys", () => {
  const db = createD1({ migrations: false });
  try {
    const dir = resolve(import.meta.dir, "../migrations");
    const migrations = readdirSync(dir).filter((name) => name.endsWith(".sql")).sort();
    for (const name of migrations.filter((name) => name < "0048")) db.sqlite.exec(readFileSync(resolve(dir, name), "utf8"));
    db.sqlite.exec(`INSERT INTO accounts(id,name,domain,workspace_id,created_at,updated_at) VALUES ('preserve','Existing account','existing.example','workspace_default','2026','2026');
      INSERT INTO contacts(id,account_id,name,email,created_at,updated_at) VALUES ('preserve-person','preserve','Existing person','person@existing.example','2026','2026');
      INSERT INTO email_events(id,contact_id,account_id,direction,status,subject,body,created_at) VALUES ('preserve-mail','preserve-person','preserve','inbound','received','Existing conversation','Keep this complete body','2026');
      INSERT INTO tasks(id,account_id,contact_id,title,status,workspace_id,created_at,updated_at) VALUES ('preserve-task','preserve','preserve-person','Existing follow-up','open','workspace_default','2026','2026');`);
    const before = Object.fromEntries(["accounts", "contacts", "email_events", "tasks", "email_templates", "sequence_steps"].map((table) => [table, db.sqlite.query(`SELECT * FROM ${table} ORDER BY id`).all()]));
    for (const name of migrations.filter((name) => name >= "0048")) db.sqlite.exec(readFileSync(resolve(dir, name), "utf8"));
    for (const [table, rows] of Object.entries(before)) {
      const columns=Object.keys(rows[0] || {});
      if (columns.length) expect(db.sqlite.query(`SELECT ${columns.join(",")} FROM ${table} ORDER BY id`).all()).toEqual(rows);
    }
    expect(db.sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(db.sqlite.query("SELECT count(*) AS n FROM assistant_mail_messages").get().n).toBe(0);
    expect(db.sqlite.query("SELECT count(*) AS n FROM assistant_jobs").get().n).toBe(0);
  } finally { db.close(); }
});
