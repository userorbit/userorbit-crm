import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { createD1 } from "./helpers/d1.js";
import { verifyLegacyPassword } from "../src/legacy-password.js";

mock.module("cloudflare:sockets", () => ({ connect() { throw new Error("Network sends forbidden in authentication tests"); } }));
const { default: worker } = await import("../src/worker.js");

// Produced by the old CRM's hash-wasm implementation with a fixed test salt.
const legacyHash = "$argon2id$v=19$m=19456,t=2,p=1$AAECAwQFBgcICQoLDA0ODw$n28UVrTFk2spABQHsDh2xOQ36xQ7LJ19nCwzAVGKOSo";
const password = "migration-test-Ü🔒";
let database;
beforeEach(() => {
  database = createD1();
  database.sqlite.prepare("INSERT INTO users (id,email,name,status,password_hash,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
    .run("migrated-user", "migrated@example.test", "Migrated user", "active", legacyHash, "2026", "2026");
});
afterEach(() => database.close());

function login(candidate) {
  return worker.fetch(new Request("https://crm.test/api/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "migrated@example.test", password: candidate }),
  }), { DB: database.DB });
}

test("existing Argon2id password signs in and upgrades once to the normal password format", async () => {
  expect((await login(password)).status).toBe(200);
  const upgraded = database.sqlite.query("SELECT password_hash FROM users WHERE id = 'migrated-user'").get().password_hash;
  expect(upgraded).toStartWith("pbkdf2_sha256$100000$");
  expect((await login(password)).status).toBe(200);
  expect(database.sqlite.query("SELECT password_hash FROM users WHERE id = 'migrated-user'").get().password_hash).toBe(upgraded);
  expect((await login("wrong password")).status).toBe(401);
});

test("wrong passwords do not change the imported credential or create a session", async () => {
  expect((await login("wrong password")).status).toBe(401);
  expect(database.sqlite.query("SELECT password_hash FROM users WHERE id = 'migrated-user'").get().password_hash).toBe(legacyHash);
  expect(database.sqlite.query("SELECT COUNT(*) AS n FROM user_sessions").get().n).toBe(0);
});

test("disabled migrated users cannot sign in", async () => {
  database.sqlite.exec("UPDATE users SET status = 'disabled' WHERE id = 'migrated-user'");
  expect((await login(password)).status).toBe(401);
});

test("unsupported and malformed parameters fail closed before performing expensive work", () => {
  for (const hash of [null, "", legacyHash.replace("m=19456", "m=1048576"), legacyHash.replace("t=2", "t=200"), legacyHash.replace("p=1", "p=8"), legacyHash.replace("v=19", "v=16"), legacyHash.slice(0, -1), `${legacyHash}$extra`]) {
    expect(verifyLegacyPassword(password, hash)).toBe(false);
  }
});
