import { test, expect, afterEach } from "bun:test";
import { createD1 } from "./helpers/d1.js";
import {
  handleRequest,
  startOAuth,
  handleOAuthCallback,
} from "../src/assistant/mail.js";
const fixtures = [];
afterEach(() => fixtures.splice(0).forEach((f) => f.close()));
function setup() {
  const db = createD1();
  fixtures.push(db);
  db.sqlite.exec(
    "INSERT INTO users(id,email,name,created_at,updated_at) VALUES ('u','u@test.com','U','now','now'),('other','other@test.com','Other','now','now')",
  );
  const env = {
      DB: db.DB,
      GOOGLE_CLIENT_ID: "client",
      GOOGLE_CLIENT_SECRET: "secret",
      CRM_PUBLIC_URL: "https://crm.test",
      ASSISTANT_MAIL_TOKEN_KEY: "test-encryption-key-at-least-32-characters",
    },
    context = {
      workspaceId: "workspace_default",
      auth: { kind: "session", user: { id: "u" } },
      helpers: {
        requireWorkspaceWrite: async () => {},
        assertContactOutreachAllowed: async () => {},
      },
    },
    calls = [];
  let respond = (url) =>
    url.includes("/token")
      ? { access_token: "access", refresh_token: "refresh", expires_in: 3600 }
      : { emailAddress: "me@test.com" };
  env.MAIL_FETCH = async (url, options) => {
    calls.push({ url: String(url), options });
    const result = await respond(String(url), options);
    return result instanceof Response ? result : Response.json(result);
  };
  return {
    ...db,
    env,
    context,
    calls,
    setRespond(fn) {
      respond = fn;
    },
    async connect(intent = "workspace") {
      const { url } = await startOAuth(env, context, "gmail", intent);
      const result = await handleOAuthCallback(
        new Request(
          `https://crm.test/api/assistant/mail/oauth/callback?code=x&state=${new URL(url).searchParams.get("state")}`,
        ),
        env,
        context,
      );
      expect(result.status).toBe(200);
      calls.length = 0;
      return db.sqlite.query("SELECT * FROM assistant_mail_connections").get();
    },
    async req(path, method = "GET", body, override = {}) {
      return handleRequest(
        new Request("https://crm.test/api/assistant/" + path, {
          method,
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
        env,
        { ...context, ...override, path: path.split("?")[0] },
      );
    },
  };
}
const original = {
  id: "m1",
  threadId: "thread1",
  internalDate: "1700000000000",
  payload: {
    mimeType: "text/plain",
    headers: [
      { name: "From", value: "Client <client@test.com>" },
      { name: "To", value: "me@test.com, peer@test.com" },
      { name: "Cc", value: "cc@test.com" },
      { name: "Message-ID", value: "<original@test.com>" },
      { name: "Subject", value: "Question" },
    ],
    body: { data: btoa("Original body") },
  },
};
const compose = (c) => ({
  connectionId: c.id,
  confirmed: true,
  idempotencyKey: "unique_send_key_12345",
  to: "client@test.com",
  subject: "Hello ✓",
  body: "Hi ✓",
});
test("Google setup reports only missing variable names and derives canonical callback", async () => {
  const f = setup();
  const ready = await (await f.req("mail/setup")).json();
  expect(ready.ready).toBe(true);
  expect(ready.redirectUri).toBe(
    "https://crm.test/api/assistant/mail/oauth/callback",
  );
  expect(JSON.stringify(ready)).not.toContain("secret");
  delete f.env.GOOGLE_CLIENT_SECRET;
  expect((await (await f.req("mail/setup")).json()).missing).toContain(
    "GOOGLE_CLIENT_SECRET",
  );
});
test("Workspace grant has read-only Gmail and calendar; send is separately explicit", async () => {
  const f = setup();
  const { url } = await startOAuth(f.env, f.context, "gmail", "workspace");
  expect(new URL(url).searchParams.get("scope")).toContain(
    "calendar.events.readonly",
  );
  expect(new URL(url).searchParams.get("scope")).not.toContain("gmail.send");
  const c = await f.connect();
  expect(c.credentials).not.toContain("refresh");
  expect((await f.req("mail/send", "POST", compose(c))).status).toBe(403);
  expect(f.calls).toHaveLength(0);
});
test("Sending requires session, confirmation, valid recipients and suppression approval", async () => {
  const f = setup(),
    c = await f.connect("send");
  f.setRespond(() => {
    throw Error("No provider request allowed");
  });
  expect(
    (
      await f.req("mail/send", "POST", compose(c), {
        auth: { kind: "api", user: { id: "u" } },
      })
    ).status,
  ).toBe(403);
  expect(
    (await f.req("mail/send", "POST", { ...compose(c), confirmed: false }))
      .status,
  ).toBe(400);
  expect(
    (
      await f.req("mail/send", "POST", {
        ...compose(c),
        to: "client@test.com\r\nBcc: steal@test.com",
      })
    ).status,
  ).toBe(400);
  f.context.helpers.assertContactOutreachAllowed = async () => {
    throw Object.assign(Error("Suppressed"), { status: 409 });
  };
  expect((await f.req("mail/send", "POST", compose(c))).status).toBe(409);
  expect(f.calls).toHaveLength(0);
});
test("Send idempotency prevents duplicate delivery and key content changes", async () => {
  const f = setup(),
    c = await f.connect("send");
  const preview = await (
    await f.req("mail/send-preview", "POST", compose(c))
  ).json();
  const content = { ...compose(c), previewHash: preview.previewHash };
  f.setRespond(() => ({ id: "sent1" }));
  expect((await (await f.req("mail/send", "POST", content)).json()).sent).toBe(
    true,
  );
  expect(
    (await (await f.req("mail/send", "POST", content)).json()).duplicate,
  ).toBe(true);
  expect(f.calls).toHaveLength(1);
  expect(
    (await f.req("mail/send", "POST", { ...content, body: "Different" }))
      .status,
  ).toBe(409);
  expect(f.calls).toHaveLength(1);
  const raw = JSON.parse(f.calls[0].options.body).raw;
  expect(atob(raw.replaceAll("-", "+").replaceAll("_", "/"))).toContain(
    "Content-Type: text/plain",
  );
});
test("Uncertain provider failures cannot be retried into duplicate sends", async () => {
  const f = setup(),
    c = await f.connect("send");
  const preview = await (
    await f.req("mail/send-preview", "POST", compose(c))
  ).json();
  const content = { ...compose(c), previewHash: preview.previewHash };
  f.setRespond(() => new Response("", { status: 503 }));
  expect((await f.req("mail/send", "POST", content)).status).toBe(503);
  expect((await f.req("mail/send", "POST", content)).status).toBe(409);
  expect(f.calls).toHaveLength(1);
  expect(
    f.sqlite.query("SELECT status FROM assistant_mail_sends").get().status,
  ).toBe("uncertain");
});
test("Reply-all derives recipients from authorized message and excludes self", async () => {
  const f = setup(),
    c = await f.connect("send");
  let sent;
  f.setRespond((url, options) =>
    url.includes("/messages/send")
      ? ((sent = JSON.parse(options.body)), { id: "sent2" })
      : original,
  );
  const content = {
    ...compose(c),
    mode: "replyAll",
    messageId: "m1",
    to: "injected@test.com",
  };
  const preview = await (
    await f.req("mail/send-preview", "POST", content)
  ).json();
  expect(preview.preview.to).toEqual(["client@test.com"]);
  const response = await f.req("mail/send", "POST", {
    ...compose(c),
    previewHash: preview.previewHash,
    mode: "replyAll",
    messageId: "m1",
    to: "injected@test.com",
  });
  expect(response.status).toBe(200);
  const raw = atob(sent.raw.replaceAll("-", "+").replaceAll("_", "/"));
  expect(raw).toContain("To: client@test.com");
  expect(raw).toContain("Cc: peer@test.com, cc@test.com");
  expect(raw).toContain("In-Reply-To: <original@test.com>");
  expect(raw).not.toContain("injected@test.com");
  expect(sent.threadId).toBe("thread1");
});
test("Inbox provider reads bounded at 20 and cannot use another user's connection", async () => {
  const f = setup(),
    c = await f.connect();
  f.setRespond((url) =>
    url.includes("?format=full")
      ? original
      : {
          messages: Array.from({ length: 40 }, (_, i) => ({ id: "m" + i })),
          nextPageToken: "next",
        },
  );
  let response = await f.req("mail/inbox?connectionId=" + c.id);
  expect((await response.json()).messages).toHaveLength(20);
  expect(f.calls).toHaveLength(21);
  expect(f.calls[0].url).toContain("maxResults=20");
  f.calls.length = 0;
  expect(
    (
      await f.req("mail/inbox?connectionId=" + c.id, "GET", null, {
        auth: { kind: "session", user: { id: "other" } },
      })
    ).status,
  ).toBe(404);
  expect(f.calls).toHaveLength(0);
});
test("Revoked accounts require reconnection and no further provider requests", async () => {
  const f = setup(),
    c = await f.connect();
  f.setRespond(() => new Response("", { status: 401 }));
  expect((await f.req("mail/inbox?connectionId=" + c.id)).status).toBe(401);
  expect(
    f.sqlite.query("SELECT status FROM assistant_mail_connections").get()
      .status,
  ).toBe("reconnect");
  expect((await f.req("mail/inbox?connectionId=" + c.id)).status).toBe(409);
  expect(f.calls).toHaveLength(1);
});
test("Private calendar pagination incremental updates cancellation and cursor expiry", async () => {
  const f = setup(),
    c = await f.connect();
  let page = 0;
  f.setRespond(() =>
    ++page === 1
      ? {
          items: [
            {
              id: "event",
              summary: "Private",
              start: { dateTime: "2026-10-21T12:00:00Z" },
              end: { dateTime: "2026-10-21T13:00:00Z" },
            },
          ],
          nextPageToken: "page2",
        }
      : { items: [], nextSyncToken: "incremental" },
  );
  expect(
    (
      await (
        await f.req(`mail/connections/${c.id}/calendar-sync`, "POST", {})
      ).json()
    ).hasMore,
  ).toBe(true);
  await f.req(`mail/connections/${c.id}/calendar-sync`, "POST", {});
  expect(f.calls[1].url).toContain("pageToken=page2");
  expect(f.sqlite.query("SELECT count(*) n FROM calendar_events").get().n).toBe(
    0,
  );
  expect((await (await f.req("mail/calendar")).json()).events).toHaveLength(1);
  expect(
    (
      await (
        await f.req("mail/calendar", "GET", null, {
          auth: { kind: "session", user: { id: "other" } },
        })
      ).json()
    ).events,
  ).toHaveLength(0);
  f.setRespond(() => ({
    items: [{ id: "event", status: "cancelled" }],
    nextSyncToken: "next",
  }));
  await f.req(`mail/connections/${c.id}/calendar-sync`, "POST", {});
  expect(f.calls.at(-1).url).toContain("syncToken=incremental");
  expect((await (await f.req("mail/calendar")).json()).events).toHaveLength(0);
  f.setRespond(() => new Response("", { status: 410 }));
  expect(
    (await f.req(`mail/connections/${c.id}/calendar-sync`, "POST", {})).status,
  ).toBe(409);
  expect(
    f.sqlite
      .query("SELECT calendar_cursor_json FROM assistant_mail_connections")
      .get().calendar_cursor_json,
  ).toBe("{}");
});
test("Drafts stay personal and disconnect purges private calendar/drafts", async () => {
  const f = setup(),
    c = await f.connect();
  expect(
    (await f.req("mail/drafts", "POST", { ...compose(c), id: "draft1" }))
      .status,
  ).toBe(200);
  expect((await (await f.req("mail/drafts")).json()).drafts).toHaveLength(1);
  expect(
    (
      await (
        await f.req("mail/drafts", "GET", null, {
          auth: { kind: "session", user: { id: "other" } },
        })
      ).json()
    ).drafts,
  ).toHaveLength(0);
  await f.req("mail/drafts/draft1", "DELETE", null, {
    auth: { kind: "session", user: { id: "other" } },
  });
  expect((await (await f.req("mail/drafts")).json()).drafts).toHaveLength(1);
  f.setRespond(() => ({}));
  await f.req("mail/connections/" + c.id, "DELETE");
  expect(
    f.sqlite.query("SELECT count(*) n FROM assistant_mail_drafts").get().n,
  ).toBe(0);
  expect(f.calls.at(-1).url).toBe("https://oauth2.googleapis.com/revoke");
});
test("Attachment access requires its exact authorized MIME part and enforces size", async () => {
  const f = setup(),
    c = await f.connect();
  f.setRespond((url) =>
    url.includes("/attachments/")
      ? { data: btoa("file") }
      : {
          ...original,
          payload: {
            mimeType: "multipart/mixed",
            parts: [
              {
                filename: "test.pdf",
                mimeType: "application/pdf",
                body: { attachmentId: "a1", size: 4 },
              },
            ],
          },
        },
  );
  expect(
    (await f.req(`mail/attachments/m1/unknown?connectionId=${c.id}`)).status,
  ).toBe(404);
  const file = await f.req(`mail/attachments/m1/a1?connectionId=${c.id}`);
  expect(file.headers.get("Content-Disposition")).toContain("attachment");
  expect(await file.text()).toBe("file");
  f.setRespond(() => ({
    ...original,
    payload: { filename: "big", body: { attachmentId: "a1", size: 6000000 } },
  }));
  expect(
    (await f.req(`mail/attachments/m1/a1?connectionId=${c.id}`)).status,
  ).toBe(413);
});
test("Preview binds owner and complete content; changed or missing preview cannot send", async () => {
  const f = setup(),
    c = await f.connect("send");
  const input = compose(c),
    preview = await (await f.req("mail/send-preview", "POST", input)).json();
  expect((await f.req("mail/send", "POST", input)).status).toBe(400);
  expect(
    (
      await f.req("mail/send", "POST", {
        ...input,
        previewHash: preview.previewHash,
        body: "Changed after review",
      })
    ).status,
  ).toBe(409);
  expect(
    (await f.req("mail/send", "POST", { ...input, previewHash: "tampered" }))
      .status,
  ).toBe(400);
  expect(f.calls).toHaveLength(0);
});
test("Compose attachments survive draft preview and MIME send with bounded size", async () => {
  const f = setup(),
    c = await f.connect("send");
  const input = {
    ...compose(c),
    attachments: [
      {
        filename: "quote ✓.pdf",
        mimeType: "application/pdf",
        data: btoa("pdf bytes"),
      },
    ],
  };
  await f.req("mail/drafts", "POST", input);
  expect(
    (await (await f.req("mail/drafts")).json()).drafts[0].content.attachments[0]
      .filename,
  ).toBe("quote ✓.pdf");
  const preview = await (
    await f.req("mail/send-preview", "POST", input)
  ).json();
  expect(preview.preview.attachments).toHaveLength(1);
  f.setRespond(() => ({ id: "attachment-send" }));
  expect(
    (
      await f.req("mail/send", "POST", {
        ...input,
        previewHash: preview.previewHash,
      })
    ).status,
  ).toBe(200);
  const raw = JSON.parse(f.calls[0].options.body).raw,
    decoded = atob(raw.replaceAll("-", "+").replaceAll("_", "/"));
  expect(decoded).toContain("multipart/mixed");
  expect(decoded).toContain("Content-Type: application/pdf");
  expect(decoded).toContain("filename*=UTF-8''quote%20%E2%9C%93.pdf");
  expect(decoded).toContain(btoa("pdf bytes"));
  expect(
    (
      await f.req("mail/send-preview", "POST", {
        ...input,
        attachments: [{ filename: "unsafe\r\nheader", data: btoa("x") }],
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await f.req("mail/send-preview", "POST", {
        ...input,
        attachments: [
          { filename: "large", data: btoa("a".repeat(5 * 1024 * 1024 + 4)) },
        ],
      })
    ).status,
  ).toBe(413);
});
test("Forward preview includes quoted original exactly once and send matches reviewed body", async () => {
  const f = setup(),
    c = await f.connect("send");
  let sent;
  f.setRespond((url, options) =>
    url.includes("/messages/send")
      ? ((sent = JSON.parse(options.body)), { id: "forward" })
      : original,
  );
  const input = { ...compose(c), mode: "forward", messageId: "m1" },
    preview = await (await f.req("mail/send-preview", "POST", input)).json();
  expect(preview.preview.body).toContain("Original body");
  expect(
    (
      await f.req("mail/send", "POST", {
        ...input,
        previewHash: preview.previewHash,
      })
    ).status,
  ).toBe(200);
  const decoded = atob(sent.raw.replaceAll("-", "+").replaceAll("_", "/")),
    encodedBody = decoded.split("\r\n\r\n")[1].replaceAll("\r\n", "");
  const body = atob(encodedBody);
  expect(body.match(/Forwarded message/g)).toHaveLength(1);
  expect(body).toContain("Original body");
});
test("Actual OAuth token scopes override requested grant and expired state remains single use", async () => {
  const f = setup();
  const { url } = await startOAuth(f.env, f.context, "gmail", "send");
  f.setRespond((url) =>
    url.includes("/token")
      ? {
          access_token: "access",
          refresh_token: "refresh",
          scope: "https://www.googleapis.com/auth/gmail.readonly",
        }
      : { emailAddress: "me@test.com" },
  );
  const request = new Request(
    "https://crm.test/api/assistant/mail/oauth/callback?code=c&state=" +
      new URL(url).searchParams.get("state"),
  );
  expect((await handleOAuthCallback(request, f.env, f.context)).status).toBe(
    200,
  );
  expect((await handleOAuthCallback(request, f.env, f.context)).status).toBe(
    400,
  );
  const list = await (await f.req("mail/connections")).json();
  expect(list.connections[0].canSend).toBe(false);
  expect(list.connections[0].calendarEnabled).toBe(false);
});
test("Replying to sent mail targets original recipients rather than self", async () => {
  const f = setup(),
    c = await f.connect("send");
  f.setRespond(() => ({
    ...original,
    labelIds: ["SENT"],
    payload: {
      ...original.payload,
      headers: [
        { name: "From", value: "me@test.com" },
        { name: "To", value: "client@test.com" },
        { name: "Subject", value: "Question" },
      ],
    },
  }));
  const preview = await (
    await f.req("mail/send-preview", "POST", {
      ...compose(c),
      mode: "reply",
      messageId: "m1",
    })
  ).json();
  expect(preview.preview.to).toEqual(["client@test.com"]);
});
test("Disconnect still erases local private data when encryption key unavailable", async () => {
  const f = setup(),
    c = await f.connect();
  delete f.env.ASSISTANT_MAIL_TOKEN_KEY;
  expect((await f.req("mail/connections/" + c.id, "DELETE")).status).toBe(200);
  expect(
    f.sqlite.query("SELECT count(*) n FROM assistant_mail_connections").get().n,
  ).toBe(0);
});
test("Workspace endpoints reject scalar JSON and stream oversized bodies without Content-Length", async () => {
  const f = setup();
  for (const body of ["null", "[]", "3", '"text"']) {
    const response = await handleRequest(
      new Request("https://crm.test", { method: "POST", body }),
      f.env,
      { ...f.context, path: "mail/send-preview" },
    );
    expect(response.status).toBe(400);
  }
  let pulled = 0,
    cancelled = false;
  const stream = new ReadableStream({
    pull(controller) {
      pulled++;
      controller.enqueue(new Uint8Array(1000000));
    },
    cancel() {
      cancelled = true;
    },
  });
  const response = await handleRequest(
    new Request("https://crm.test", {
      method: "POST",
      body: stream,
      duplex: "half",
    }),
    f.env,
    { ...f.context, path: "mail/send-preview" },
  );
  expect(response.status).toBe(413);
  expect(cancelled).toBe(true);
  expect(pulled).toBeLessThan(12);
});
