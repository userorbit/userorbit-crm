import { test, expect, beforeEach, afterEach } from "bun:test";
import { createD1 } from "./helpers/d1.js";
import {
  handleRequest,
  detectCommitments,
} from "../src/assistant/intelligence.js";
let db, env, context;
beforeEach(() => {
  db = createD1();
  env = { DB: db.DB };
  db.sqlite
    .exec(`INSERT INTO accounts(id,name,created_at,updated_at,workspace_id) VALUES ('a','Acme','2026','2026','workspace_default'),('b','Other','2026','2026','elsewhere');
    INSERT INTO contacts(id,account_id,name,email,created_at,updated_at) VALUES ('c','a','Alice','alice@example.com','2026','2026'),('d','b','Hidden','hidden@example.com','2026','2026');
    CREATE TABLE IF NOT EXISTS assistant_mail_messages (id TEXT PRIMARY KEY, connection_id TEXT, workspace_id TEXT,user_id TEXT,provider_message_id TEXT,contact_id TEXT,from_email TEXT,to_json TEXT,subject TEXT,body TEXT,direction TEXT,sent_at TEXT,thread_id TEXT,source_url TEXT);`);
  db.sqlite
    .exec(`INSERT OR IGNORE INTO users(id,email,name,created_at,updated_at) VALUES('u','u@example.com','User','2026','2026'),('other','other@example.com','Other','2026','2026');
    INSERT OR IGNORE INTO workspaces(id,team_id,name,slug,created_at,updated_at) VALUES('elsewhere','team_default','Other','other','2026','2026');
    CREATE TABLE IF NOT EXISTS assistant_mail_connections(id TEXT PRIMARY KEY,workspace_id TEXT,user_id TEXT,provider TEXT,account_email TEXT,credentials TEXT,created_at TEXT);`);
  for (const [connectionId, userId, workspaceId] of [
    ["conn-u", "u", "workspace_default"],
    ["conn-other", "other", "workspace_default"],
    ["conn-foreign", "u", "elsewhere"],
  ])
    db.sqlite
      .prepare(
        "INSERT INTO assistant_mail_connections(id,workspace_id,user_id,provider,account_email,credentials,created_at) VALUES(?,?,?,?,?,?,?)",
      )
      .run(
        connectionId,
        workspaceId,
        userId,
        "gmail",
        userId + "@example.com",
        "test",
        "2026",
      );
  context = {
    path: "",
    workspaceId: "workspace_default",
    auth: { user: { id: "u" } },
    helpers: {
      requireWorkspaceWrite: async (_, auth) => {
        if (auth.role === "viewer")
          throw Object.assign(new Error("Forbidden"), { status: 403 });
      },
      getNextBestActions: async () => [
        {
          id: "existing",
          title: "Existing CRM action",
          priority: 40,
          accountId: "a",
        },
      ],
    },
  };
});
afterEach(() => db.close());
function message(
  id,
  body,
  direction = "inbound",
  user = "u",
  workspace = "workspace_default",
  contact = "c",
) {
  db.sqlite
    .prepare(
      "INSERT INTO assistant_mail_messages (id,connection_id,workspace_id,user_id,provider_message_id,contact_id,from_email,to_json,subject,body,direction,sent_at,thread_id,source_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      id,
      workspace === "elsewhere" ? "conn-foreign" : "conn-" + user,
      workspace,
      user,
      id,
      contact,
      "alice@example.com",
      "[]",
      "Planning",
      body,
      direction,
      "2026-01-01T12:00:00Z",
      "thread",
      "https://mail.example.com/message/" + id,
    );
}
async function api(path, method = "GET", body, ctx = context) {
  const result = await handleRequest(
    new Request("https://crm.example/api/assistant/intelligence/" + path, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    env,
    { ...ctx, path: "intelligence/" + path },
  );
  return result?.json();
}
test("extracts explicit evidence, scopes users/workspaces and deduplicates without resetting review", async () => {
  message("one", "I will send the proposal tomorrow.");
  message("private", "I will share secret notes.", "outbound", "other");
  message(
    "foreign",
    "I will share foreign notes.",
    "outbound",
    "u",
    "elsewhere",
  );
  const first = await api("commitments/extract", "POST", {});
  expect(first.commitments).toHaveLength(1);
  expect(first.commitments[0].quote).toBe("I will send the proposal tomorrow.");
  expect(first.commitments[0].due_at).toBeNull();
  const id = first.commitments[0].id;
  await api("commitments/" + id, "PATCH", { status: "accepted" });
  const again = await api("commitments/extract", "POST", {});
  expect(again.commitments).toHaveLength(1);
  expect(again.commitments[0].status).toBe("accepted");
  await expect(
    api(
      "commitments/" + id,
      "PATCH",
      { status: "resolved" },
      { ...context, auth: { user: { id: "other" } } },
    ),
  ).rejects.toMatchObject({ status: 404 });
});
test("task conversion requires acceptance and is repeat-safe", async () => {
  message("one", "I'll send the proposal.", "outbound");
  const {
    commitments: [item],
  } = await api("commitments/extract", "POST", {});
  await expect(
    api(`commitments/${item.id}/task`, "POST", {}),
  ).rejects.toMatchObject({ status: 409 });
  await api("commitments/" + item.id, "PATCH", {
    status: "accepted",
    dueAt: "2026-12-01T12:00:00Z",
  });
  const first = await api(`commitments/${item.id}/task`, "POST", {});
  const second = await api(`commitments/${item.id}/task`, "POST", {});
  expect(first.taskId).toBe(second.taskId);
  expect(db.sqlite.query("SELECT * FROM tasks").all()).toHaveLength(1);
  expect(db.sqlite.query("SELECT notes FROM tasks").get().notes).toContain(
    item.source_url,
  );
});
test("attention incorporates core helper and honors dismiss/snooze/restore", async () => {
  message("one", "Could we discuss the plan?");
  const result = await api("attention");
  expect(result.suggestions.map((s) => s.type)).toContain("reply_waiting");
  expect(result.suggestions.some((s) => s.key === "core:existing")).toBe(true);
  const item = result.suggestions.find((s) => s.type === "reply_waiting");
  await api("attention/" + item.id, "PATCH", {
    status: "snoozed",
    snoozedUntil: "2099-01-01T00:00:00Z",
  });
  expect(
    (await api("attention")).suggestions.some((s) => s.id === item.id),
  ).toBe(false);
  await api("attention/" + item.id, "PATCH", { status: "active" });
  expect(
    (await api("attention")).suggestions.some((s) => s.id === item.id),
  ).toBe(true);
  await api("attention/" + item.id, "PATCH", { status: "dismissed" });
  expect(
    (await api("attention")).suggestions.some((s) => s.id === item.id),
  ).toBe(false);
  await expect(
    api("attention/" + item.id, "PATCH", {
      status: "snoozed",
      snoozedUntil: "2020-01-01T00:00:00Z",
    }),
  ).rejects.toMatchObject({ status: 400 });
});
test("briefs use stored events and personal mail with workspace isolation", async () => {
  db.sqlite.exec(
    `INSERT INTO calendar_events(id,workspace_id,account_id,contact_id,title,starts_at,created_at,updated_at) VALUES('event','workspace_default','a','c','Planning','2026-12-01T12:00:00Z','2026','2026')`,
  );
  message("one", "Agenda: project scope.");
  message("hidden", "Private agenda", "inbound", "other");
  const brief = await api("briefs/event");
  expect(brief.event.title).toBe("Planning");
  expect(brief.recentMessages).toHaveLength(1);
  expect(brief.sources.some((s) => s.messageId === "one")).toBe(true);
  await expect(
    api("briefs/event", "GET", undefined, {
      ...context,
      workspaceId: "elsewhere",
    }),
  ).rejects.toMatchObject({ status: 404 });
});
test("drafts only select own sent samples; fallback is clearly unfinished and can be edited", async () => {
  message("own", "Hello, thanks for checking in.", "outbound");
  message("received", "Incoming");
  message("other", "Secret style", "outbound", "other");
  expect(
    (await api("writing-samples")).samples.map((s) => s.messageId),
  ).toEqual(["own"]);
  await expect(
    api("drafts", "POST", {
      contactId: "c",
      instruction: "Follow up",
      sampleIds: ["other"],
    }),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    api("drafts", "POST", {
      contactId: "c",
      instruction: "Follow up",
      sampleIds: ["received"],
    }),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    api("drafts", "POST", { contactId: "d", instruction: "Follow up" }),
  ).rejects.toMatchObject({ status: 404 });
  const { draft } = await api("drafts", "POST", {
    contactId: "c",
    instruction: "Follow up",
    sampleIds: ["own"],
  });
  expect(draft.provider).toBe("deterministic");
  expect(draft.body).toContain("[Add your message");
  expect(draft.sampleIds).toEqual(["own"]);
  expect(
    (
      await api("drafts/" + draft.id, "PATCH", {
        body: "A reviewed message.",
        status: "reviewed",
      })
    ).draft.status,
  ).toBe("reviewed");
  expect(
    (
      await api("drafts", "GET", undefined, {
        ...context,
        auth: { user: { id: "other" } },
      })
    ).drafts,
  ).toHaveLength(0);
});
test("malformed input and viewer writes fail without changes", async () => {
  await expect(api("drafts", "POST", [], context)).rejects.toMatchObject({
    status: 400,
  });
  await expect(
    api(
      "commitments/extract",
      "POST",
      {},
      { ...context, auth: { user: { id: "u" }, role: "viewer" } },
    ),
  ).rejects.toMatchObject({ status: 403 });
  expect(
    db.sqlite.query("SELECT * FROM assistant_commitments").all(),
  ).toHaveLength(0);
  await expect(
    api("drafts", "POST", { contactId: "c", instruction: "" }),
  ).rejects.toMatchObject({ status: 400 });
});
test("missing mail gracefully degrades but other DB errors propagate", async () => {
  db.sqlite.exec("DROP TABLE assistant_mail_messages");
  expect((await api("commitments/extract", "POST", {})).mailAvailable).toBe(
    false,
  );
  expect((await api("attention")).mailAvailable).toBe(false);
  db.sqlite.exec("CREATE TABLE assistant_mail_messages (wrong TEXT)");
  await expect(api("writing-samples")).rejects.toThrow();
});
test("configured AI extraction validates evidence and provider errors fall back", async () => {
  message("one", "I will send the proposal.");
  env.OPENAI_API_KEY = "test-key";
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json({
        output_text: JSON.stringify({
          commitments: [
            { messageId: "one", quote: "Invented promise that was never made" },
          ],
        }),
      });
    expect((await api("commitments/extract", "POST", {})).provider).toBe(
      "deterministic",
    );
    globalThis.fetch = async () =>
      Response.json({
        output_text: JSON.stringify({
          subject: "Next steps",
          body: "Hi Alice, could we review the proposal?",
        }),
      });
    expect(
      (
        await api("drafts", "POST", {
          contactId: "c",
          instruction: "Ask about proposal",
        })
      ).draft.provider,
    ).toBe("openai");
    globalThis.fetch = async () =>
      new Response("rate limited", { status: 429 });
    expect(
      (
        await api("drafts", "POST", {
          contactId: "c",
          instruction: "Ask about proposal",
        })
      ).draft.provider,
    ).toBe("deterministic");
  } finally {
    globalThis.fetch = original;
  }
});
test("detector ignores quoted and conditional/request-only content", () => {
  expect(
    detectCommitments([
      {
        provider_message_id: "m",
        body: "> I will send the old proposal.\nCould you send it?\nWe may review it.",
      },
    ]),
  ).toEqual([]);
});
test("conditional and forwarded promises are excluded", () => {
  expect(
    detectCommitments([
      {
        provider_message_id: "m",
        body: "If approved, I will send the contract.\nOn Monday, Alice wrote:\nI will deliver the report.",
      },
    ]),
  ).toEqual([]);
});
test("AI empty findings are respected and malformed entries do not crash", async () => {
  message("one", "I will send the proposal.");
  env.OPENAI_API_KEY = "test-key";
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json({ output_text: JSON.stringify({ commitments: [] }) });
    const empty = await api("commitments/extract", "POST", {});
    expect(empty.provider).toBe("openai");
    expect(empty.commitments).toHaveLength(0);
    globalThis.fetch = async () =>
      Response.json({
        output_text: JSON.stringify({
          commitments: [
            null,
            { messageId: "one", quote: "I will send the proposal." },
          ],
        }),
      });
    const valid = await api("commitments/extract", "POST", {});
    expect(valid.provider).toBe("openai");
    expect(valid.commitments).toHaveLength(1);
  } finally {
    globalThis.fetch = original;
  }
});
test("sent sample lookup and relationship reciprocity survive busy inboxes", async () => {
  message("own", "Earlier sent message", "outbound");
  db.sqlite.exec(
    "UPDATE assistant_mail_messages SET sent_at='2025-01-01T00:00:00Z'",
  );
  for (let i = 0; i < 105; i++) message("incoming-" + i, "Hello");
  expect(
    (await api("writing-samples")).samples.map((s) => s.messageId),
  ).toEqual(["own"]);
  const reply = (await api("attention")).suggestions.find(
    (s) => s.type === "reply_waiting",
  );
  expect(reply.priority).toBe(85);
});
