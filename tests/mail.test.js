import { test, expect, afterEach } from "bun:test";
import { createD1 } from "./helpers/d1.js";
import {
  handleRequest,
  handleOAuthCallback,
  startOAuth,
  syncConnection,
  runScheduled,
} from "../src/assistant/mail.js";
const fixtures = [];
afterEach(() => {
  for (const f of fixtures.splice(0)) f.close();
});
function setup(provider = "gmail") {
  const db = createD1();
  fixtures.push(db);
  db.sqlite.exec(
    "INSERT INTO users(id,email,name,created_at,updated_at) VALUES ('u','u@test.com','U','now','now'),('other','other@test.com','O','now','now')",
  );
  const env = {
    DB: db.DB,
    ASSISTANT_MAIL_TOKEN_KEY: "test-encryption-key-at-least-32-characters",
    ASSISTANT_GOOGLE_CLIENT_ID: "google",
    ASSISTANT_GOOGLE_CLIENT_SECRET: "secret",
    ASSISTANT_GOOGLE_REDIRECT_URI: "https://crm.test/callback",
    ASSISTANT_MICROSOFT_CLIENT_ID: "ms",
    ASSISTANT_MICROSOFT_CLIENT_SECRET: "secret",
    ASSISTANT_MICROSOFT_REDIRECT_URI: "https://crm.test/callback",
  };
  const context = {
    workspaceId: "workspace_default",
    auth: { user: { id: "u" } },
    helpers: { requireWorkspaceWrite: async () => {} },
  };
  const calls = [];
  let responder;
  env.MAIL_FETCH = async (url, options) => {
    calls.push({ url: String(url), options });
    const result = await responder(String(url), options);
    return result instanceof Response ? result : Response.json(result);
  };
  return {
    ...db,
    env,
    context,
    calls,
    setRespond(fn) {
      responder = fn;
    },
    async connect() {
      responder = (url) =>
        url.includes("token")
          ? {
              access_token: "ACCESS",
              refresh_token: "REFRESH",
              expires_in: 3600,
            }
          : provider === "gmail"
            ? { emailAddress: "me@test.com", historyId: "100" }
            : { mail: "me@test.com" };
      const { url } = await startOAuth(env, context, provider);
      const state = new URL(url).searchParams.get("state");
      const response = await handleOAuthCallback(
        new Request("https://crm.test/callback?code=code&state=" + state),
        env,
        context,
      );
      expect(response.status).toBe(200);
      return db.sqlite.query("SELECT * FROM assistant_mail_connections").get();
    },
  };
}
const message = (id = "m1") => ({
  id,
  threadId: "thread",
  internalDate: "1700000000000",
  labelIds: ["SENT"],
  payload: {
    mimeType: "text/plain",
    headers: [
      { name: "From", value: "Me <me@test.com>" },
      { name: "To", value: "Unknown <unknown@test.com>" },
      { name: "Subject", value: "Hello" },
    ],
    body: { data: Buffer.from("Full body ✓").toString("base64url") },
  },
});
test("OAuth PKCE, owner binding, single-use state and encrypted credentials", async () => {
  const f = setup();
  f.setRespond(() => {
    throw Error("must not exchange");
  });
  const { url } = await startOAuth(f.env, f.context, "gmail");
  const auth = new URL(url),
    state = auth.searchParams.get("state");
  expect(auth.searchParams.get("code_challenge_method")).toBe("S256");
  const callback = new Request(
    "https://crm.test/callback?code=c&state=" + state,
  );
  expect(
    (
      await handleOAuthCallback(callback, f.env, {
        ...f.context,
        auth: { user: { id: "other" } },
      })
    ).status,
  ).toBe(400);
  expect(
    f.sqlite.query("SELECT count(*) n FROM assistant_mail_oauth_states").get()
      .n,
  ).toBe(1);
  f.setRespond((url) =>
    url.includes("token")
      ? { access_token: "ACCESS", refresh_token: "REFRESH" }
      : { emailAddress: "me@test.com" },
  );
  expect((await handleOAuthCallback(callback, f.env, f.context)).status).toBe(
    200,
  );
  expect((await handleOAuthCallback(callback, f.env, f.context)).status).toBe(
    400,
  );
  const c = f.sqlite.query("SELECT * FROM assistant_mail_connections").get();
  expect(c.credentials).not.toContain("REFRESH");
  const list = await handleRequest(new Request("https://crm.test"), f.env, {
    ...f.context,
    path: "mail/connections",
  });
  expect(JSON.stringify(await list.json())).not.toContain("credentials");
});
test("Gmail full bodies, sent direction, pagination, dedup and unmatched context", async () => {
  const f = setup(),
    c = await f.connect();
  let listCount = 0;
  f.setRespond((url) =>
    url.endsWith("/profile")
      ? { historyId: "100" }
      : url.includes("format=full")
        ? message()
        : url.includes("/history")
          ? {
              historyId: "102",
              history: [{ messagesAdded: [{ message: { id: "m1" } }] }],
            }
          : ++listCount === 1
            ? { messages: [{ id: "m1" }], nextPageToken: "page2" }
            : { messages: [{ id: "m1" }] },
  );
  expect(
    (await syncConnection(f.env, c.id, c.workspace_id, c.user_id)).hasMore,
  ).toBe(true);
  await syncConnection(f.env, c.id, c.workspace_id, c.user_id);
  await syncConnection(f.env, c.id, c.workspace_id, c.user_id);
  const rows = f.sqlite.query("SELECT * FROM assistant_mail_messages").all();
  expect(rows).toHaveLength(1);
  expect(rows[0].body).toBe("Full body ✓");
  expect(rows[0].direction).toBe("outbound");
  expect(rows[0].contact_id).toBeNull();
  expect(f.sqlite.query("SELECT count(*) n FROM contacts").get().n).toBe(0);
  expect(
    JSON.parse(
      f.sqlite.query("SELECT cursor_json FROM assistant_mail_connections").get()
        .cursor_json,
    ).history,
  ).toBe("102");
});
test("Transient failures retain cursor and retry safely, stale history restarts", async () => {
  const f = setup(),
    c = await f.connect();
  f.setRespond((url) =>
    url.endsWith("/profile")
      ? { historyId: "100" }
      : new Response("", { status: 429 }),
  );
  await expect(
    syncConnection(f.env, c.id, c.workspace_id, c.user_id),
  ).rejects.toThrow("rate limited");
  expect(
    f.sqlite
      .query(
        "SELECT cursor_json,lease_until,status FROM assistant_mail_connections",
      )
      .get(),
  ).toEqual({ cursor_json: "{}", lease_until: 0, status: "active" });
  f.sqlite.exec(
    "UPDATE assistant_mail_connections SET cursor_json='{" +
      '"history":"old","anchor":"old"' +
      "}'",
  );
  f.setRespond(() => new Response("", { status: 404 }));
  await expect(
    syncConnection(f.env, c.id, c.workspace_id, c.user_id),
  ).rejects.toThrow("cursor expired");
  expect(
    f.sqlite.query("SELECT cursor_json FROM assistant_mail_connections").get()
      .cursor_json,
  ).toBe("{}");
});
test("Microsoft full history, overlap cursor, refresh rotation and hostile next-link rejection", async () => {
  const f = setup("microsoft"),
    c = await f.connect();
  let stage = 0;
  f.setRespond((url) => {
    if (url.includes("messages"))
      return stage++ === 0
        ? {
            value: [
              {
                id: "ms1",
                from: { emailAddress: { address: "me@test.com" } },
                toRecipients: [],
                body: { contentType: "html", content: "<p>Entire body</p>" },
                sentDateTime: "2026-01-01T00:00:00Z",
              },
            ],
            "@odata.nextLink":
              "https://graph.microsoft.com/v1.0/me/messages?$skip=20",
          }
        : { value: [] };
    throw Error(url);
  });
  expect(
    (await syncConnection(f.env, c.id, c.workspace_id, c.user_id)).hasMore,
  ).toBe(true);
  await syncConnection(f.env, c.id, c.workspace_id, c.user_id);
  expect(
    f.sqlite.query("SELECT direction,body FROM assistant_mail_messages").get(),
  ).toEqual({ direction: "outbound", body: " Entire body " });
  expect(
    JSON.parse(
      f.sqlite.query("SELECT cursor_json FROM assistant_mail_connections").get()
        .cursor_json,
    ).watermark,
  ).toBeTruthy();
  f.setRespond(() => ({
    value: [],
    "@odata.nextLink": "https://evil.test/steal",
  }));
  await expect(
    syncConnection(f.env, c.id, c.workspace_id, c.user_id),
  ).rejects.toThrow("Invalid provider pagination");
  expect(f.calls.some((c) => c.url.includes("evil"))).toBe(false);
});
test("personal scoping, viewer denial, malformed JSON and disconnect purge", async () => {
  const f = setup(),
    c = await f.connect();
  f.setRespond((url) =>
    url.endsWith("/profile")
      ? { historyId: "100" }
      : url.includes("format=full")
        ? message()
        : { messages: [{ id: "m1" }] },
  );
  await syncConnection(f.env, c.id, c.workspace_id, c.user_id);
  const other = {
    ...f.context,
    auth: { user: { id: "other" } },
    path: "mail/messages",
  };
  expect(
    (
      await (
        await handleRequest(new Request("https://crm.test"), f.env, other)
      ).json()
    ).messages,
  ).toHaveLength(0);
  await expect(
    syncConnection(f.env, c.id, c.workspace_id, "other"),
  ).rejects.toThrow("unavailable");
  const viewer = {
    ...f.context,
    path: "mail/connect",
    helpers: {
      requireWorkspaceWrite: async () => {
        throw Object.assign(Error("Forbidden"), { status: 403 });
      },
    },
  };
  expect(
    (
      await handleRequest(
        new Request("https://crm.test", { method: "POST", body: "{}" }),
        f.env,
        viewer,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await handleRequest(
        new Request("https://crm.test", { method: "POST", body: "oops" }),
        f.env,
        { ...f.context, path: "mail/connect" },
      )
    ).status,
  ).toBe(400);
  await handleRequest(
    new Request("https://crm.test", { method: "DELETE" }),
    f.env,
    { ...f.context, path: "mail/connections/" + c.id },
  );
  expect(
    f.sqlite.query("SELECT count(*) n FROM assistant_mail_messages").get().n,
  ).toBe(0);
  expect(
    f.sqlite.query("SELECT count(*) n FROM assistant_mail_connections").get().n,
  ).toBe(0);
});
test("scheduled sync verifies current membership", async () => {
  const f = setup(),
    c = await f.connect();
  f.calls.length = 0;
  f.setRespond(() => {
    throw Error("should not contact provider");
  });
  expect(
    await runScheduled(f.env, {
      requireWorkspaceWrite: async () => {
        throw Error("removed member");
      },
    }),
  ).toEqual([{ id: c.id, error: "Sync deferred" }]);
  expect(f.calls).toHaveLength(0);
});
test("scheduled sync blocks disabled users even with write membership", async () => {
  const f = setup();
  const c = await f.connect();
  f.sqlite.exec("UPDATE users SET status='disabled' WHERE id='u'");
  f.calls.length = 0;
  f.setRespond(() => {
    throw Error("disabled user must not contact provider");
  });
  expect(await runScheduled(f.env, f.context.helpers)).toEqual([
    { id: c.id, error: "Sync deferred" },
  ]);
  expect(f.calls).toHaveLength(0);
  expect(
    f.sqlite.query("SELECT lease_until FROM assistant_mail_connections").get()
      .lease_until,
  ).toBe(0);
});
test("Refresh token rotates once and stays encrypted", async () => {
  const f = setup("microsoft");
  let refreshes = 0;
  f.setRespond((url) =>
    url.includes("token")
      ? { access_token: "old", refresh_token: "refresh-old", expires_in: 1 }
      : { mail: "me@test.com" },
  );
  const { url } = await startOAuth(f.env, f.context, "microsoft");
  await handleOAuthCallback(
    new Request(
      "https://crm.test/callback?code=c&state=" +
        new URL(url).searchParams.get("state"),
    ),
    f.env,
    f.context,
  );
  const c = f.sqlite.query("SELECT * FROM assistant_mail_connections").get();
  f.setRespond((url, options) => {
    if (url.includes("/token")) {
      refreshes++;
      expect(options.body.get("refresh_token")).toBe("refresh-old");
      return {
        access_token: "new",
        refresh_token: "refresh-new",
        expires_in: 3600,
      };
    }
    expect(options.headers.Authorization).toBe("Bearer new");
    return { value: [] };
  });
  await syncConnection(f.env, c.id, c.workspace_id, c.user_id);
  await syncConnection(f.env, c.id, c.workspace_id, c.user_id);
  expect(refreshes).toBe(1);
  expect(
    f.sqlite.query("SELECT credentials FROM assistant_mail_connections").get()
      .credentials,
  ).not.toContain("refresh-new");
});
test("Gmail large history batches resume within 20 messages and exclude drafts", async () => {
  const f = setup(),
    c = await f.connect();
  f.sqlite.exec(
    "UPDATE assistant_mail_connections SET cursor_json='{" +
      '"history":"100","anchor":"100"' +
      "}'",
  );
  let lists = 0;
  f.setRespond((url) => {
    if (url.includes("format=full")) {
      const id = url.split("/messages/")[1].split("?")[0];
      return { ...message(id), labelIds: id === "m0" ? ["DRAFT"] : ["SENT"] };
    }
    lists++;
    return {
      historyId: "200",
      history: [
        {
          messagesAdded: Array.from({ length: 25 }, (_, i) => ({
            message: { id: "m" + i },
          })),
        },
      ],
    };
  });
  expect(
    (await syncConnection(f.env, c.id, c.workspace_id, c.user_id)).hasMore,
  ).toBe(true);
  expect(
    f.sqlite.query("SELECT count(*) n FROM assistant_mail_messages").get().n,
  ).toBe(19);
  await syncConnection(f.env, c.id, c.workspace_id, c.user_id);
  expect(lists).toBe(1);
  expect(
    f.sqlite.query("SELECT count(*) n FROM assistant_mail_messages").get().n,
  ).toBe(24);
  const source = await handleRequest(new Request("https://crm.test"), f.env, {
    ...f.context,
    path: "mail/messages/m1",
  });
  expect((await source.json()).message.provider_message_id).toBe("m1");
  expect(
    (
      await handleRequest(new Request("https://crm.test"), f.env, {
        ...f.context,
        path: "mail/messages/m1",
        workspaceId: "another",
      })
    ).status,
  ).toBe(404);
});
test("Microsoft invalid pagination recovers without requiring reconnect; leases prevent overlap", async () => {
  const f = setup("microsoft"),
    c = await f.connect();
  f.sqlite.exec(
    "UPDATE assistant_mail_connections SET cursor_json='{" +
      '"next":"https://graph.microsoft.com/v1.0/me/messages?$skip=20"' +
      "}'",
  );
  f.setRespond(() => new Response("", { status: 400 }));
  await expect(
    syncConnection(f.env, c.id, c.workspace_id, c.user_id),
  ).rejects.toThrow("cursor expired");
  expect(
    f.sqlite
      .query("SELECT status,cursor_json FROM assistant_mail_connections")
      .get(),
  ).toEqual({ status: "active", cursor_json: "{}" });
  f.sqlite
    .query("UPDATE assistant_mail_connections SET lease_until=?")
    .run(Date.now() + 100000);
  await expect(
    syncConnection(f.env, c.id, c.workspace_id, c.user_id),
  ).rejects.toThrow("already syncing");
});
test("Matching uses exact existing address within the mailbox workspace", async () => {
  const f = setup(),
    c = await f.connect();
  f.sqlite.exec(
    "INSERT INTO accounts(id,name,workspace_id,created_at,updated_at) VALUES ('a','Account','workspace_default','now','now'); INSERT INTO contacts(id,account_id,name,email,created_at,updated_at) VALUES ('contact','a','Existing','unknown@test.com','now','now')",
  );
  f.setRespond((url) =>
    url.endsWith("/profile")
      ? { historyId: "100" }
      : url.includes("format=full")
        ? message()
        : { messages: [{ id: "m1" }] },
  );
  await syncConnection(f.env, c.id, c.workspace_id, c.user_id);
  expect(
    f.sqlite.query("SELECT contact_id FROM assistant_mail_messages").get()
      .contact_id,
  ).toBe("contact");
});
test("Partially failed Gmail page resumes without re-fetching completed messages", async () => {
  const f = setup(),
    c = await f.connect();
  let fail = true,
    firstFetches = 0;
  f.setRespond((url) => {
    if (url.endsWith("/profile")) return { historyId: "100" };
    if (url.includes("/messages/m1?")) {
      firstFetches++;
      return message("m1");
    }
    if (url.includes("/messages/m2?"))
      return fail ? new Response("", { status: 503 }) : message("m2");
    return { messages: [{ id: "m1" }, { id: "m2" }] };
  });
  await expect(
    syncConnection(f.env, c.id, c.workspace_id, c.user_id),
  ).rejects.toThrow();
  fail = false;
  await syncConnection(f.env, c.id, c.workspace_id, c.user_id);
  expect(firstFetches).toBe(1);
  expect(
    f.sqlite.query("SELECT count(*) n FROM assistant_mail_messages").get().n,
  ).toBe(2);
});
test("Expired OAuth state and wrong workspace cannot exchange codes", async () => {
  const f = setup();
  f.setRespond(() => {
    throw Error("must not exchange");
  });
  const { url } = await startOAuth(f.env, f.context, "gmail");
  const request = new Request(
    "https://crm.test/callback?code=c&state=" +
      new URL(url).searchParams.get("state"),
  );
  expect(
    (
      await handleOAuthCallback(request, f.env, {
        ...f.context,
        workspaceId: "different",
      })
    ).status,
  ).toBe(400);
  f.sqlite.exec("UPDATE assistant_mail_oauth_states SET expires_at=0");
  expect((await handleOAuthCallback(request, f.env, f.context)).status).toBe(
    400,
  );
  expect(f.calls).toHaveLength(0);
});
