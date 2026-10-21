import { readBody } from "./shared.js";
import { http, token, seal, unseal, normalizeGmail } from "./mail.js";
const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
const CALENDAR =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const scope = (name) => `https://www.googleapis.com/auth/${name}`;
export function googleScopes(intent) {
  return [
    scope("gmail.readonly"),
    ...(intent !== "readonly" ? [scope("calendar.events.readonly")] : []),
    ...(intent === "send" ? [scope("gmail.send")] : []),
  ].join(" ");
}
const fail = (status, message) => Object.assign(new Error(message), { status });
const stmt = (env, sql, ...args) => env.DB.prepare(sql).bind(...args);
const b64 = (value) => {
  const bytes = new TextEncoder().encode(value),
    chunks = [];
  for (let offset = 0; offset < bytes.length; offset += 8192)
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
  return btoa(chunks.join(""))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
};
const parse = (request) => readBody(request, 7500000);

function safeId(id) {
  if (!/^[a-zA-Z0-9_-]{1,256}$/.test(id || ""))
    throw fail(400, "Invalid provider ID");
  return encodeURIComponent(id);
}
function scopes(c) {
  return new Set(c.granted_scopes.split(/\s+/));
}
async function connection(env, context, id) {
  const c = await stmt(
    env,
    "SELECT * FROM assistant_mail_connections WHERE id=? AND workspace_id=? AND user_id=? AND provider='gmail'",
    id,
    context.workspaceId,
    context.auth.user.id,
  ).first();
  if (!c) throw fail(404, "Google connection not found");
  if (c.status !== "active")
    throw fail(409, "Google account requires reconnection");
  return c;
}
async function apiClient(env, c) {
  const active = await stmt(
    env,
    "SELECT id FROM assistant_mail_connections WHERE id=? AND status='active'",
    c.id,
  ).first();
  if (!active) throw fail(409, "Google connection disconnected");
  let credentials = await unseal(env, c.credentials);
  if (!credentials.expires_at || credentials.expires_at < Date.now() + 60000) {
    try {
      const refreshed = await token(env, "gmail", {
        grant_type: "refresh_token",
        refresh_token: credentials.refresh_token,
      });
      if (!refreshed.access_token)
        throw fail(401, "Google account requires reconnection");
      credentials = {
        ...credentials,
        ...refreshed,
        expires_at: Date.now() + Number(refreshed.expires_in || 3600) * 1000,
      };
      await stmt(
        env,
        "UPDATE assistant_mail_connections SET credentials=? WHERE id=? AND status='active'",
        await seal(env, credentials),
        c.id,
      ).run();
    } catch (error) {
      if ([400, 401, 403].includes(error.status))
        await stmt(
          env,
          "UPDATE assistant_mail_connections SET status='reconnect',last_error='Google account requires reconnection' WHERE id=?",
          c.id,
        ).run();
      throw error;
    }
  }
  let remaining = 55;
  return async (url, options = {}) => {
    if (--remaining < 0) throw fail(429, "Request budget reached");
    const active = await stmt(
      env,
      "SELECT id FROM assistant_mail_connections WHERE id=? AND status='active'",
      c.id,
    ).first();
    if (!active) throw fail(409, "Google connection disconnected");
    try {
      return await http(env, url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${credentials.access_token}`,
        },
      });
    } catch (error) {
      if ([401, 403].includes(error.status))
        await stmt(
          env,
          "UPDATE assistant_mail_connections SET status='reconnect',last_error='Google account requires reconnection' WHERE id=?",
          c.id,
        ).run();
      throw error;
    }
  };
}
const headersOf = (message) =>
  Object.fromEntries(
    (message.payload?.headers || []).map((h) => [
      h.name.toLowerCase(),
      h.value,
    ]),
  );
const emails = (value) => [
  ...new Set(
    (Array.isArray(value) ? value.join(",") : String(value || ""))
      .toLowerCase()
      .match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/g) || [],
  ),
];
function recipients(value) {
  if (value == null || value === "") return [];
  const items = Array.isArray(value) ? value : String(value).split(",");
  if (
    items.length > 30 ||
    items.some(
      (x) =>
        typeof x !== "string" ||
        !/^[^\s<>@,\r\n]+@[^\s<>@,\r\n]+\.[^\s<>@,\r\n]+$/.test(x.trim()),
    )
  )
    throw fail(400, "Use valid email addresses");
  return [...new Set(items.map((x) => x.trim().toLowerCase()))];
}
function draftContent(input) {
  const mode = input.mode || "compose";
  if (!["compose", "reply", "replyAll", "forward"].includes(mode))
    throw fail(400, "Invalid message mode");
  const content = {
    mode,
    to: recipients(input.to),
    cc: recipients(input.cc),
    bcc: recipients(input.bcc),
    subject: String(input.subject || ""),
    body: String(input.body || ""),
    messageId: input.messageId || null,
    attachments: validateAttachments(input.attachments),
  };
  if (
    content.subject.length > 500 ||
    /[\r\n]/.test(content.subject) ||
    content.body.length > 200000
  )
    throw fail(400, "Message exceeds limits");
  if (mode !== "compose") safeId(content.messageId);
  return content;
}
function validateAttachments(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 10)
    throw fail(400, "Up to 10 attachments allowed");
  let total = 0;
  return value.map((file) => {
    if (typeof file?.data === "string" && file.data.length > 6990508)
      throw fail(413, "Attachments exceed 5 MB limit");
    if (
      !file ||
      typeof file.filename !== "string" ||
      !file.filename ||
      file.filename.length > 200 ||
      /[\r\n\0]/.test(file.filename) ||
      typeof file.data !== "string" ||
      file.data.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(file.data)
    )
      throw fail(400, "Invalid attachment");
    total +=
      (file.data.length * 3) / 4 -
      (file.data.endsWith("==") ? 2 : file.data.endsWith("=") ? 1 : 0);
    if (total > 5 * 1024 * 1024)
      throw fail(413, "Attachments exceed 5 MB limit");
    const mimeType = file.mimeType || "application/octet-stream";
    if (!/^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(mimeType))
      throw fail(400, "Invalid attachment content type");
    return { filename: file.filename, mimeType, data: file.data };
  });
}
async function contentHash(content) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(content)),
      ),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
const mime64 = (value) => {
  const raw = b64(value).replaceAll("-", "+").replaceAll("_", "/");
  return raw + "=".repeat((4 - (raw.length % 4)) % 4);
};
async function messageView(env, api, message, c) {
  const normalized = await normalizeGmail(env, api, message, c.account_email);
  let attachments = [];
  const walk = (part, depth = 0) => {
    if (depth > 10) return;
    if (part.filename && part.body?.attachmentId)
      attachments.push({
        id: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size || 0,
      });
    for (const child of (part.parts || []).slice(0, 100))
      walk(child, depth + 1);
  };
  walk(message.payload || {});
  const h = headersOf(message);
  return { ...normalized, cc: emails(h.cc), to: emails(h.to), attachments };
}
async function canonicalMessage(env, c, api, input) {
  const content = draftContent(input);
  let threadId,
    replyHeaders = "";
  if (content.mode !== "compose") {
    const original = await api(
        `${GMAIL}/messages/${safeId(content.messageId)}?format=full`,
      ),
      h = headersOf(original);
    if (content.mode === "reply" || content.mode === "replyAll") {
      const fromSelf = emails(h.from).includes(c.account_email);
      content.to = emails(fromSelf ? h.to : h["reply-to"] || h.from).filter(
        (e) => e !== c.account_email,
      );
      if (content.mode === "replyAll")
        content.cc = [...new Set([...emails(h.to), ...emails(h.cc)])].filter(
          (e) => e !== c.account_email && !content.to.includes(e),
        );
      else content.cc = [];
      content.subject = /^re:/i.test(h.subject || "")
        ? h.subject
        : `Re: ${h.subject || ""}`;
      threadId = original.threadId;
      const mid = h["message-id"];
      if (mid && /^[^\r\n]{1,500}$/.test(mid))
        replyHeaders = `In-Reply-To: ${mid}\r\nReferences: ${mid}\r\n`;
    } else {
      content.subject = /^fwd:/i.test(content.subject)
        ? content.subject
        : `Fwd: ${content.subject || h.subject || ""}`;
      const normalized = await normalizeGmail(
        env,
        api,
        original,
        c.account_email,
      );
      content.body += `\n\n---------- Forwarded message ----------\nFrom: ${h.from || ""}\nDate: ${h.date || ""}\nSubject: ${h.subject || ""}\nTo: ${h.to || ""}\n\n${normalized.body}`;
    }
  }
  return { content, threadId, replyHeaders };
}
async function previewSend(env, context, c, api, input) {
  if (context.auth.kind !== "session")
    throw fail(403, "Sending requires your signed-in browser session");
  if (!scopes(c).has(scope("gmail.send")))
    throw fail(403, "Reconnect Google with sending permission");
  const { content, threadId, replyHeaders } = await canonicalMessage(
    env,
    c,
    api,
    input,
  );
  const hash = await contentHash(content);
  return {
    preview: content,
    previewHash: await seal(env, {
      hash,
      connectionId: c.id,
      userId: context.auth.user.id,
      workspaceId: context.workspaceId,
      threadId,
      replyHeaders,
      expiresAt: Date.now() + 600000,
    }),
  };
}
async function send(env, context, c, api, input) {
  if (context.auth.kind !== "session")
    throw fail(403, "Sending requires your signed-in browser session");
  if (input.confirmed !== true)
    throw fail(400, "Review and confirm the message before sending");
  if (!scopes(c).has(scope("gmail.send")))
    throw fail(403, "Reconnect Google with sending permission");
  const { content } = await canonicalMessage(env, c, api, input);
  const key = input.idempotencyKey;
  if (typeof key !== "string" || !/^[a-zA-Z0-9_-]{16,100}$/.test(key))
    throw fail(400, "A unique send key is required");
  if (
    !content.to.length ||
    content.to.length + content.cc.length + content.bcc.length > 30
  )
    throw fail(400, "Between 1 and 30 recipients required");
  if (
    /[\r\n]/.test(content.subject) ||
    content.subject.length > 500 ||
    content.body.length > 250000
  )
    throw fail(400, "Message exceeds limits");
  if (!context.helpers?.assertContactOutreachAllowed)
    throw fail(503, "Outreach policy checker unavailable");
  for (const email of [...content.to, ...content.cc, ...content.bcc])
    await context.helpers.assertContactOutreachAllowed(
      env,
      context.workspaceId,
      email,
    );
  if (typeof input.previewHash !== "string" || input.previewHash.length > 4000)
    throw fail(400, "Preview the message before sending");
  let preview;
  try {
    preview = await unseal(env, input.previewHash);
  } catch {
    throw fail(400, "Invalid send preview");
  }
  const hash = await contentHash(content);
  if (
    preview.expiresAt < Date.now() ||
    preview.connectionId !== c.id ||
    preview.userId !== context.auth.user.id ||
    preview.workspaceId !== context.workspaceId ||
    preview.hash !== hash
  )
    throw fail(409, "Message changed or preview expired; review it again");
  const { threadId, replyHeaders } = preview;

  const previous = await stmt(
    env,
    "SELECT * FROM assistant_mail_sends WHERE connection_id=? AND idempotency_key=?",
    c.id,
    key,
  ).first();
  if (previous) {
    if (previous.payload_hash !== hash)
      throw fail(409, "Send key already used for different content");
    if (previous.status === "sent")
      return {
        sent: true,
        messageId: previous.provider_message_id,
        duplicate: true,
      };
    throw fail(
      409,
      "Previous send is pending or uncertain; check Sent before sending again",
    );
  }
  const inserted = await stmt(
    env,
    "INSERT OR IGNORE INTO assistant_mail_sends (id,connection_id,workspace_id,user_id,idempotency_key,payload_hash,status,created_at) VALUES (?,?,?,?,?,?,'pending',?)",
    crypto.randomUUID(),
    c.id,
    context.workspaceId,
    context.auth.user.id,
    key,
    hash,
    new Date().toISOString(),
  ).run();
  if (!inserted.meta.changes)
    throw fail(409, "This send is already processing");
  const boundary = `userorbit_${crypto.randomUUID().replaceAll("-", "")}`;
  let body = `Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${
    mime64(content.body)
      .match(/.{1,76}/g)
      ?.join("\r\n") || ""
  }`;
  if (content.attachments.length) {
    body = `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n--${boundary}\r\n${body}`;
    for (const file of content.attachments)
      body += `\r\n--${boundary}\r\nContent-Type: ${file.mimeType}\r\nContent-Disposition: attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}\r\nContent-Transfer-Encoding: base64\r\n\r\n${file.data.match(/.{1,76}/g)?.join("\r\n") || ""}`;
    body += `\r\n--${boundary}--`;
  }
  const raw = b64(
    `From: ${c.account_email}\r\nTo: ${content.to.join(", ")}\r\n${content.cc.length ? `Cc: ${content.cc.join(", ")}\r\n` : ""}${content.bcc.length ? `Bcc: ${content.bcc.join(", ")}\r\n` : ""}Subject: =?UTF-8?B?${mime64(content.subject)}?=\r\n${replyHeaders || ""}MIME-Version: 1.0\r\n${body}`,
  );

  try {
    const result = await api(`${GMAIL}/messages/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw, ...(threadId ? { threadId } : {}) }),
    });
    await stmt(
      env,
      "UPDATE assistant_mail_sends SET status='sent',provider_message_id=? WHERE connection_id=? AND idempotency_key=?",
      result.id,
      c.id,
      key,
    ).run();
    return { sent: true, messageId: result.id };
  } catch (error) {
    await stmt(
      env,
      "UPDATE assistant_mail_sends SET status='uncertain' WHERE connection_id=? AND idempotency_key=?",
      c.id,
      key,
    ).run();
    throw error;
  }
}
export async function syncGoogleCalendar(env, context, c) {
  c = await connection(env, context, c.id);
  if (!scopes(c).has(scope("calendar.events.readonly")))
    throw fail(403, "Reconnect Google with calendar permission");
  const api = await apiClient(env, c),
    cursor = JSON.parse(c.calendar_cursor_json || "{}"),
    url = new URL(CALENDAR);
  url.searchParams.set("maxResults", "50");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("showDeleted", "true");
  if (cursor.syncToken) url.searchParams.set("syncToken", cursor.syncToken);
  else {
    url.searchParams.set(
      "timeMin",
      cursor.timeMin || new Date(Date.now() - 30 * 86400000).toISOString(),
    );
    url.searchParams.set(
      "timeMax",
      cursor.timeMax || new Date(Date.now() + 180 * 86400000).toISOString(),
    );
    cursor.timeMin = url.searchParams.get("timeMin");
    cursor.timeMax = url.searchParams.get("timeMax");
  }
  if (cursor.pageToken) url.searchParams.set("pageToken", cursor.pageToken);
  let page;
  try {
    page = await api(url.href);
  } catch (error) {
    if (error.status === 410) {
      await env.DB.batch([
        stmt(
          env,
          "DELETE FROM assistant_calendar_events WHERE connection_id=?",
          c.id,
        ),
        stmt(
          env,
          "UPDATE assistant_mail_connections SET calendar_cursor_json='{}' WHERE id=?",
          c.id,
        ),
      ]);
      throw fail(409, "Calendar cursor expired; sync again to refresh");
    }
    throw error;
  }
  let imported = 0;
  for (const event of (page.items || []).slice(0, 50)) {
    if (event.status === "cancelled") {
      await stmt(
        env,
        "DELETE FROM assistant_calendar_events WHERE connection_id=? AND provider_event_id=?",
        c.id,
        event.id,
      ).run();
      continue;
    }
    const starts = event.start?.dateTime || event.start?.date,
      ends = event.end?.dateTime || event.end?.date;
    if (!starts || !event.id) continue;
    await stmt(
      env,
      `INSERT INTO assistant_calendar_events (id,connection_id,workspace_id,user_id,provider_event_id,title,description,starts_at,ends_at,location,meeting_url,attendees_json,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM assistant_mail_connections WHERE id=? AND status='active') ON CONFLICT(connection_id,provider_event_id) DO UPDATE SET title=excluded.title,description=excluded.description,starts_at=excluded.starts_at,ends_at=excluded.ends_at,location=excluded.location,meeting_url=excluded.meeting_url,attendees_json=excluded.attendees_json,updated_at=excluded.updated_at`,
      crypto.randomUUID(),
      c.id,
      c.workspace_id,
      c.user_id,
      event.id,
      String(event.summary || "Untitled meeting").slice(0, 1000),
      String(event.description || "").slice(0, 50000),
      starts,
      ends || null,
      String(event.location || "").slice(0, 2000),
      event.hangoutLink || null,
      JSON.stringify(
        (event.attendees || [])
          .slice(0, 100)
          .map((a) => a.email)
          .filter(Boolean),
      ),
      new Date().toISOString(),
      c.id,
    ).run();
    imported++;
  }
  const next = page.nextPageToken
    ? { ...cursor, pageToken: page.nextPageToken }
    : page.nextSyncToken
      ? { syncToken: page.nextSyncToken }
      : {};
  await stmt(
    env,
    "UPDATE assistant_mail_connections SET calendar_cursor_json=? WHERE id=? AND status='active'",
    JSON.stringify(next),
    c.id,
  ).run();
  return { imported, hasMore: !!page.nextPageToken };
}
export async function handleGoogleWorkspace(request, env, context) {
  const { path, workspaceId, auth } = context,
    url = new URL(request.url);
  if (path === "mail/setup" && request.method === "GET") {
    const missing = [];
    if (!env.ASSISTANT_GOOGLE_CLIENT_ID && !env.GOOGLE_CLIENT_ID)
      missing.push("GOOGLE_CLIENT_ID");
    if (!env.ASSISTANT_GOOGLE_CLIENT_SECRET && !env.GOOGLE_CLIENT_SECRET)
      missing.push("GOOGLE_CLIENT_SECRET");
    if (
      !env.ASSISTANT_MAIL_TOKEN_KEY ||
      env.ASSISTANT_MAIL_TOKEN_KEY.length < 32
    )
      missing.push("ASSISTANT_MAIL_TOKEN_KEY");
    if (!env.ASSISTANT_GOOGLE_REDIRECT_URI && !env.CRM_PUBLIC_URL)
      missing.push("CRM_PUBLIC_URL");
    return Response.json({
      ready: !missing.length,
      missing,
      redirectUri:
        env.ASSISTANT_GOOGLE_REDIRECT_URI ||
        (env.CRM_PUBLIC_URL
          ? `${env.CRM_PUBLIC_URL.replace(/\/$/, "")}/api/assistant/mail/oauth/callback`
          : null),
      scopes: {
        workspace: googleScopes("workspace"),
        send: googleScopes("send"),
      },
    });
  }
  const match = path.match(
    /^mail\/(inbox|threads\/[^/]+|attachments\/[^/]+\/[^/]+|drafts(?:\/[^/]+)?|send-preview|send|calendar|connections\/[^/]+\/calendar-sync)$/,
  );
  if (!match) return null;
  if (!["GET", "POST", "DELETE"].includes(request.method))
    throw fail(405, "Method not allowed");
  if (request.method !== "GET") {
    if (!context.helpers?.requireWorkspaceWrite)
      throw fail(503, "Membership checker required");
    await context.helpers.requireWorkspaceWrite(env, auth, workspaceId);
  }
  const input = request.method === "POST" ? await parse(request) : {};
  if (path === "mail/calendar" && request.method === "GET")
    return Response.json({
      events: (
        await stmt(
          env,
          "SELECT e.* FROM assistant_calendar_events e JOIN assistant_mail_connections c ON c.id=e.connection_id AND c.status='active' WHERE e.workspace_id=? AND e.user_id=? ORDER BY e.starts_at DESC LIMIT 100",
          workspaceId,
          auth.user.id,
        ).all()
      ).results,
    });
  if (path === "mail/drafts" && request.method === "GET")
    return Response.json({
      drafts: (
        await stmt(
          env,
          "SELECT * FROM assistant_mail_drafts WHERE workspace_id=? AND user_id=? ORDER BY updated_at DESC LIMIT 50",
          workspaceId,
          auth.user.id,
        ).all()
      ).results.map((d) => ({
        ...d,
        content: JSON.parse(d.content_json),
        content_json: undefined,
      })),
    });
  if (path.startsWith("mail/drafts/") && request.method === "DELETE") {
    await stmt(
      env,
      "DELETE FROM assistant_mail_drafts WHERE id=? AND workspace_id=? AND user_id=?",
      path.split("/")[2],
      workspaceId,
      auth.user.id,
    ).run();
    return Response.json({ deleted: true });
  }
  const id = path.endsWith("/calendar-sync")
      ? path.split("/")[2]
      : input.connectionId || url.searchParams.get("connectionId"),
    c = await connection(env, context, id);
  if (path === "mail/drafts" && request.method === "POST") {
    const content = draftContent(input),
      id = input.id || crypto.randomUUID();
    if (typeof id !== "string" || id.length > 100)
      throw fail(400, "Invalid draft ID");
    await stmt(
      env,
      `INSERT INTO assistant_mail_drafts VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET content_json=excluded.content_json,updated_at=excluded.updated_at WHERE workspace_id=excluded.workspace_id AND user_id=excluded.user_id AND connection_id=excluded.connection_id`,
      id,
      c.id,
      workspaceId,
      auth.user.id,
      JSON.stringify(content),
      new Date().toISOString(),
    ).run();
    return Response.json({ saved: true, id });
  }
  if (path.endsWith("/calendar-sync") && request.method === "POST")
    return Response.json(await syncGoogleCalendar(env, context, c));
  if (
    (path === "mail/send" || path === "mail/send-preview") &&
    auth.kind !== "session"
  )
    throw fail(403, "Sending requires your signed-in browser session");
  const api = await apiClient(env, c);
  if (path === "mail/send-preview" && request.method === "POST")
    return Response.json(await previewSend(env, context, c, api, input));
  if (path === "mail/send" && request.method === "POST")
    return Response.json(await send(env, context, c, api, input));
  if (path === "mail/inbox" && request.method === "GET") {
    const folder = url.searchParams.get("folder") || "INBOX",
      q = url.searchParams.get("query") || "",
      pageToken = url.searchParams.get("pageToken");
    if (
      !["INBOX", "SENT", "DRAFT", "STARRED", "ALL"].includes(folder) ||
      q.length > 200 ||
      (pageToken && pageToken.length > 2000)
    )
      throw fail(400, "Invalid inbox filters");
    const endpoint = new URL(`${GMAIL}/messages`);
    endpoint.searchParams.set("maxResults", "20");
    if (folder !== "ALL") endpoint.searchParams.set("labelIds", folder);
    if (q) endpoint.searchParams.set("q", q);
    if (pageToken) endpoint.searchParams.set("pageToken", pageToken);
    const page = await api(endpoint.href),
      messages = [];
    for (const m of (page.messages || []).slice(0, 20)) {
      const message = await api(
        `${GMAIL}/messages/${safeId(m.id)}?format=full`,
      );
      messages.push(await messageView(env, api, message, c));
    }
    return Response.json({
      messages,
      nextPageToken: page.nextPageToken || null,
    });
  }
  if (path.startsWith("mail/threads/") && request.method === "GET") {
    const result = await api(
      `${GMAIL}/threads/${safeId(path.split("/")[2])}?format=full`,
    );
    const messages = [];
    for (const message of (result.messages || []).slice(-50))
      messages.push(await messageView(env, api, message, c));
    return Response.json({ messages });
  }
  if (path.startsWith("mail/attachments/") && request.method === "GET") {
    const [, , messageId, attachmentId] = path.split("/");
    const message = await api(
      `${GMAIL}/messages/${safeId(messageId)}?format=full`,
    );
    const find = (part, depth = 0) =>
      depth > 10
        ? null
        : part.body?.attachmentId === attachmentId
          ? part
          : (part.parts || [])
              .slice(0, 100)
              .map((p) => find(p, depth + 1))
              .find(Boolean);
    const part = find(message.payload || {});
    if (!part?.filename) throw fail(404, "Attachment not found");
    if (part.body.size > 5 * 1024 * 1024)
      throw fail(413, "Attachment exceeds 5 MB limit");
    const file = await api(
      `${GMAIL}/messages/${safeId(messageId)}/attachments/${safeId(attachmentId)}`,
    );
    if (!file.data || file.data.length > 7 * 1024 * 1024)
      throw fail(413, "Attachment exceeds limit");
    const bytes = Uint8Array.from(
      atob(file.data.replaceAll("-", "+").replaceAll("_", "/")),
      (x) => x.charCodeAt(0),
    );
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(part.filename.slice(0, 200))}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  }
  throw fail(405, "Method not allowed");
}
