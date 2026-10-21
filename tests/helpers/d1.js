import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function createD1({ migrations = true } = {}) {
  const sqlite = new Database(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  function prepare(sql) {
    let values = [];
    return {
      bind(...input) { values = input; return this; },
      async all() { return { results: sqlite.prepare(sql).all(...values), success: true }; },
      async first(column) { const row = sqlite.prepare(sql).get(...values); return column ? row?.[column] ?? null : row; },
      async run() { const result = sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } }; },
      _execute() { return this.run(); },
    };
  }
  const DB = {
    prepare,
    async batch(statements) {
      sqlite.exec("BEGIN");
      try { const result = []; for (const statement of statements) result.push(await statement._execute()); sqlite.exec("COMMIT"); return result; }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
    async exec(sql) { sqlite.exec(sql); return { count: 1 }; },
  };
  if (migrations) {
    const dir = resolve(import.meta.dir, "../../migrations");
    for (const file of readdirSync(dir).filter((file) => file.endsWith(".sql")).sort()) sqlite.exec(readFileSync(resolve(dir, file), "utf8"));
  }
  return { DB, sqlite, close() { sqlite.close(); } };
}
