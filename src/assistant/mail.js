// Read-only mailbox ingestion. This module never sends email or creates contacts.
const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
const GRAPH = "https://graph.microsoft.com/v1.0/me";
const now = () => Date.now();
const iso = () => new Date().toISOString();
const stmt = (env, sql, ...args) => env.DB.prepare(sql).bind(...args);
const fail = (status, message) => Object.assign(new Error(message), { status });
const b64 = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
const unb64 = (text) =>
  Uint8Array.from(atob(text.replaceAll("-", "+").replaceAll("_", "/")), (c) =>
    c.charCodeAt(0),
  );
const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
async function key(env) {
  if (!env.ASSISTANT_MAIL_TOKEN_KEY || env.ASSISTANT_MAIL_TOKEN_KEY.length < 32)
    throw fail(503, "Mailbox encryption key is not configured");
  return crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(env.ASSISTANT_MAIL_TOKEN_KEY),
    ),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}
async function seal(env, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return (
    b64(iv) +
    "." +
    b64(
      new Uint8Array(
        await crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          await key(env),
          new TextEncoder().encode(JSON.stringify(value)),
        ),
      ),
    )
  );
}
async function unseal(env, value) {
  const [iv, data] = value.split(".");
  return JSON.parse(
    new TextDecoder().decode(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: unb64(iv) },
        await key(env),
        unb64(data),
      ),
    ),
  );
}
function config(env, provider) {
  if (!["gmail", "microsoft"].includes(provider))
    throw fail(400, "Unsupported mail provider");
  const prefix =
    provider === "gmail" ? "ASSISTANT_GOOGLE" : "ASSISTANT_MICROSOFT";
  const client = env[prefix + "_CLIENT_ID"],
    secret = env[prefix + "_CLIENT_SECRET"];
  const redirect = env[prefix + "_REDIRECT_URI"];
  if (!client || !secret || !redirect)
    throw fail(503, "Mail provider is not configured");
  return {
    client,
    secret,
    redirect,
    authorize:
      provider === "gmail"
        ? "https://accounts.google.com/o/oauth2/v2/auth"
        : "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token:
      provider === "gmail"
        ? "https://oauth2.googleapis.com/token"
        : "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope:
      provider === "gmail"
        ? "https://www.googleapis.com/auth/gmail.readonly"
        : "offline_access User.Read Mail.Read",
  };
}
async function http(env, url, options = {}) {
  const response = await (env.MAIL_FETCH || fetch)(url, {
    ...options,
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw fail(
      response.status,
      response.status === 429
        ? "Provider rate limited; retry later"
        : "Mail provider request failed",
    );
  return response.json();
}
async function token(env, provider, fields) {
  const c = config(env, provider);
  return http(env, c.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.client,
      client_secret: c.secret,
      ...fields,
    }),
  });
}
export async function startOAuth(env, context, provider) {
  const c = config(env, provider);
  await key(env);
  const state = random(),
    verifier = random();
  await stmt(
    env,
    "DELETE FROM assistant_mail_oauth_states WHERE expires_at < ?",
    now(),
  ).run();
  await stmt(
    env,
    "INSERT INTO assistant_mail_oauth_states VALUES (?,?,?,?,?,?,?)",
    state,
    context.workspaceId,
    context.auth.user.id,
    provider,
    await seal(env, verifier),
    c.redirect,
    now() + 600000,
  ).run();
  const url = new URL(c.authorize);
  url.search = new URLSearchParams({
    client_id: c.client,
    redirect_uri: c.redirect,
    response_type: "code",
    scope: c.scope,
    state,
    code_challenge: b64(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(verifier),
        ),
      ),
    ),
    code_challenge_method: "S256",
    ...(provider === "gmail"
      ? { access_type: "offline", prompt: "consent" }
      : {}),
  }).toString();
  return { url: url.href };
}
export async function handleOAuthCallback(request, env, context) {
  // Coordinator must authenticate this callback and verify current workspace write membership.
  if (!context?.auth?.user?.id)
    return Response.json({ error: "Authentication required" }, { status: 401 });
  if (context.helpers?.requireWorkspaceWrite)
    await context.helpers.requireWorkspaceWrite(
      env,
      context.auth,
      context.workspaceId,
    );
  const url = new URL(request.url);
  const state = await stmt(
    env,
    "DELETE FROM assistant_mail_oauth_states WHERE state=? AND workspace_id=? AND user_id=? AND expires_at>? RETURNING *",
    url.searchParams.get("state") || "",
    context.workspaceId,
    context.auth.user.id,
    now(),
  ).first();
  if (!state)
    return Response.json(
      { error: "Invalid or expired OAuth state" },
      { status: 400 },
    );
  if (!url.searchParams.get("code") || url.searchParams.has("error"))
    return Response.json(
      { error: "Mailbox authorization was not completed" },
      { status: 400 },
    );
  try {
    const tokens = await token(env, state.provider, {
      grant_type: "authorization_code",
      code: url.searchParams.get("code"),
      redirect_uri: state.redirect_uri,
      code_verifier: await unseal(env, state.verifier),
    });
    if (!tokens.refresh_token || !tokens.access_token)
      throw fail(
        400,
        "Provider did not grant offline access; reconnect with consent",
      );
    const headers = { Authorization: `Bearer ${tokens.access_token}` };
    const profile = await http(
      env,
      state.provider === "gmail"
        ? GMAIL + "/profile"
        : GRAPH + "?$select=mail,userPrincipalName",
      { headers },
    );
    const email = (
      profile.emailAddress ||
      profile.mail ||
      profile.userPrincipalName ||
      ""
    ).toLowerCase();
    if (!email.includes("@"))
      throw fail(400, "Provider did not return a mailbox address");
    const credentials = await seal(env, {
      ...tokens,
      expires_at: now() + Number(tokens.expires_in || 3600) * 1000,
    });
    const id = crypto.randomUUID();
    await stmt(
      env,
      `INSERT INTO assistant_mail_connections (id,workspace_id,user_id,provider,account_email,credentials,created_at) VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(workspace_id,user_id,provider,account_email) DO UPDATE SET credentials=excluded.credentials,status='active',last_error=NULL,next_sync_at=0`,
      id,
      state.workspace_id,
      state.user_id,
      state.provider,
      email,
      credentials,
      iso(),
    ).run();
    return Response.json({
      connected: true,
      provider: state.provider,
      accountEmail: email,
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: error.status || 502 },
    );
  }
}
function addresses(value) {
  return [
    ...new Set(
      (value || "")
        .toLowerCase()
        .match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/g) || [],
    ),
  ];
}
function plain(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
async function gmailBody(env, api, messageId, part) {
  if (part.filename) return "";
  if (part.parts) {
    const preferred =
      part.mimeType === "multipart/alternative"
        ? [
            part.parts.find((p) => p.mimeType === "text/plain") ||
              part.parts.find((p) => p.mimeType === "text/html") ||
              part.parts[0],
          ]
        : part.parts;
    return (
      await Promise.all(
        preferred.filter(Boolean).map((p) => gmailBody(env, api, messageId, p)),
      )
    )
      .filter(Boolean)
      .join("\n");
  }
  if (!["text/plain", "text/html"].includes(part.mimeType)) return "";
  const data =
    part.body?.data ||
    (part.body?.attachmentId
      ? (
          await api(
            `${GMAIL}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(part.body.attachmentId)}`,
          )
        ).data
      : "");
  const body = new TextDecoder().decode(unb64(data || ""));
  return part.mimeType === "text/html" ? plain(body) : body;
}
export async function normalizeGmail(env, api, m, email) {
  const header = (name) =>
    m.payload?.headers?.find((h) => h.name.toLowerCase() === name)?.value || "";
  const from = addresses(header("from"))[0] || "";
  return {
    id: m.id,
    from,
    to: addresses(header("to") + "," + header("cc") + "," + header("bcc")),
    subject: header("subject"),
    body: await gmailBody(env, api, m.id, m.payload || {}),
    direction:
      m.labelIds?.includes("SENT") || from === email ? "outbound" : "inbound",
    sentAt: new Date(Number(m.internalDate)).toISOString(),
    thread: m.threadId,
    url: `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(m.id)}`,
  };
}
export function normalizeMicrosoft(m, email) {
  const from = (m.from?.emailAddress?.address || "").toLowerCase();
  return {
    id: m.id,
    from,
    to: [
      ...(m.toRecipients || []),
      ...(m.ccRecipients || []),
      ...(m.bccRecipients || []),
    ]
      .map((r) => (r.emailAddress?.address || "").toLowerCase())
      .filter(Boolean),
    subject: m.subject || "",
    body:
      m.body?.contentType?.toLowerCase() === "html"
        ? plain(m.body.content)
        : m.body?.content || "",
    direction: from === email ? "outbound" : "inbound",
    sentAt: m.sentDateTime || m.receivedDateTime || null,
    thread: m.conversationId || null,
    url: m.webLink || null,
  };
}
async function save(env, c, m) {
  const candidates = m.direction === "outbound" ? m.to : [m.from];
  const matched = [];
  for (const email of new Set(
    candidates.filter((e) => e !== c.account_email),
  )) {
    const rows = await stmt(
      env,
      "SELECT c.id FROM contacts c JOIN accounts a ON a.id=c.account_id WHERE a.workspace_id=? AND lower(c.email)=?",
      c.workspace_id,
      email,
    ).all();
    matched.push(...rows.results.map((r) => r.id));
  }
  await stmt(
    env,
    `INSERT INTO assistant_mail_messages (id,connection_id,workspace_id,user_id,provider_message_id,contact_id,from_email,to_json,subject,body,direction,sent_at,thread_id,source_url)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM assistant_mail_connections WHERE id=? AND lease_id=?)
    ON CONFLICT(connection_id,provider_message_id) DO UPDATE SET contact_id=excluded.contact_id,body=excluded.body,subject=excluded.subject,to_json=excluded.to_json`,
    crypto.randomUUID(),
    c.id,
    c.workspace_id,
    c.user_id,
    m.id,
    matched.length === 1 ? matched[0] : null,
    m.from,
    JSON.stringify(m.to),
    m.subject,
    m.body,
    m.direction,
    m.sentAt,
    m.thread || null,
    m.url || null,
    c.id,
    c.lease_id,
  ).run();
}
function safeGraph(url) {
  const parsed = new URL(url);
  if (
    parsed.origin !== "https://graph.microsoft.com" ||
    !parsed.pathname.startsWith("/v1.0/me/messages") ||
    parsed.username ||
    parsed.password
  )
    throw fail(502, "Invalid provider pagination URL");
  return url;
}
export async function syncConnection(env, id, workspaceId, userId) {
  const lease = random();
  const c = await stmt(
    env,
    `UPDATE assistant_mail_connections SET lease_until=?,lease_id=? WHERE id=? AND workspace_id=? AND user_id=? AND status='active' AND lease_until<? RETURNING *`,
    now() + 120000,
    lease,
    id,
    workspaceId,
    userId,
    now(),
  ).first();
  if (!c) throw fail(409, "Mailbox unavailable or already syncing");
  let imported = 0;
  try {
    let credentials = await unseal(env, c.credentials);
    if (!credentials.expires_at || credentials.expires_at < now() + 60000) {
      const refreshed = await token(env, c.provider, {
        grant_type: "refresh_token",
        refresh_token: credentials.refresh_token,
      });
      if (!refreshed.access_token)
        throw fail(401, "Mailbox requires reconnection");
      credentials = {
        ...credentials,
        ...refreshed,
        expires_at: now() + Number(refreshed.expires_in || 3600) * 1000,
      };
      await stmt(
        env,
        "UPDATE assistant_mail_connections SET credentials=? WHERE id=? AND lease_id=?",
        await seal(env, credentials),
        c.id,
        lease,
      ).run();
    }
    const deadline = now() + 55000;
    const api = (url) => {
      if (now() > deadline) throw fail(503, "Sync time budget reached");
      return http(env, url, {
        headers: {
          Authorization: `Bearer ${credentials.access_token}`,
          Prefer: 'outlook.body-content-type="text", IdType="ImmutableId"',
        },
      });
    };
    let cursor = JSON.parse(c.cursor_json);
    if (c.provider === "gmail") {
      if (!cursor.anchor)
        cursor.anchor = (await api(GMAIL + "/profile")).historyId;
      let page;
      if (!cursor.pending) {
        try {
          const url = new URL(
            GMAIL + (cursor.history ? "/history" : "/messages"),
          );
          url.searchParams.set("maxResults", "20");
          if (cursor.history) {
            url.searchParams.set("startHistoryId", cursor.history);
            url.searchParams.set("historyTypes", "messageAdded");
          }
          if (cursor.page) url.searchParams.set("pageToken", cursor.page);
          page = await api(url.href);
        } catch (error) {
          if (error.status !== 404 && error.status !== 400) throw error;
          // Stale history/page tokens restart safely; saved messages are deduplicated.
          await stmt(
            env,
            "UPDATE assistant_mail_connections SET cursor_json='{}' WHERE id=? AND lease_id=?",
            c.id,
            lease,
          ).run();
          throw fail(409, "Mailbox cursor expired; full sync will restart");
        }
        const ids = [
          ...new Set(
            cursor.history
              ? (page.history || []).flatMap((h) =>
                  (h.messagesAdded || []).map((x) => x.message.id),
                )
              : (page.messages || []).map((m) => m.id),
          ),
        ];
        const nextCursor = page.nextPageToken
          ? { ...cursor, page: page.nextPageToken }
          : {
              anchor: cursor.anchor,
              history: cursor.history
                ? page.historyId || cursor.history
                : cursor.anchor,
            };
        cursor = { ...cursor, pending: ids, after: nextCursor };
      }
      await stmt(
        env,
        "UPDATE assistant_mail_connections SET cursor_json=? WHERE id=? AND lease_id=?",
        JSON.stringify(cursor),
        c.id,
        lease,
      ).run();
      for (const messageId of cursor.pending.slice(0, 20)) {
        let message;
        try {
          message = await api(
            `${GMAIL}/messages/${encodeURIComponent(messageId)}?format=full`,
          );
        } catch (error) {
          if (error.status !== 404) throw error;
        }
        if (message && !message.labelIds?.includes("DRAFT")) {
          await save(
            env,
            c,
            await normalizeGmail(env, api, message, c.account_email),
          );
          imported++;
        }
        cursor.pending = cursor.pending.slice(1);
        // Checkpoint each completed message so slow pages make durable progress.
        await stmt(
          env,
          "UPDATE assistant_mail_connections SET cursor_json=? WHERE id=? AND lease_id=?",
          JSON.stringify(cursor),
          c.id,
          lease,
        ).run();
      }
      if (!cursor.pending.length) cursor = cursor.after;
    } else {
      const started = cursor.started || iso();
      const url = new URL(GRAPH + "/messages");
      url.searchParams.set("$top", "20");
      url.searchParams.set(
        "$select",
        "id,from,toRecipients,ccRecipients,bccRecipients,subject,body,sentDateTime,receivedDateTime,conversationId,webLink,lastModifiedDateTime,isDraft",
      );
      if (cursor.watermark)
        url.searchParams.set(
          "$filter",
          `lastModifiedDateTime ge ${cursor.watermark}`,
        );
      let page;
      try {
        page = await api(cursor.next ? safeGraph(cursor.next) : url.href);
      } catch (e) {
        if (cursor.next && [400, 410].includes(e.status)) {
          await stmt(
            env,
            "UPDATE assistant_mail_connections SET cursor_json=? WHERE id=? AND lease_id=?",
            JSON.stringify({ watermark: cursor.watermark }),
            c.id,
            lease,
          ).run();
          throw fail(409, "Mailbox cursor expired; sync will restart");
        }
        throw e;
      }
      for (const m of page.value || []) {
        if (m.isDraft) continue;
        await save(env, c, normalizeMicrosoft(m, c.account_email));
        imported++;
      }
      cursor = page["@odata.nextLink"]
        ? { ...cursor, started, next: safeGraph(page["@odata.nextLink"]) }
        : { watermark: new Date(Date.parse(started) - 300000).toISOString() };
    }
    await stmt(
      env,
      "UPDATE assistant_mail_connections SET cursor_json=?,last_sync_at=?,last_error=NULL,next_sync_at=? WHERE id=? AND lease_id=?",
      JSON.stringify(cursor),
      iso(),
      now() + (cursor.next || cursor.page || cursor.pending ? 1000 : 300000),
      c.id,
      lease,
    ).run();
    return {
      imported,
      hasMore: !!(cursor.next || cursor.page || cursor.pending),
    };
  } catch (error) {
    const reconnect = [400, 401, 403].includes(error.status);
    await stmt(
      env,
      "UPDATE assistant_mail_connections SET last_error=?,next_sync_at=?,status=? WHERE id=? AND lease_id=?",
      reconnect
        ? "Mailbox requires reconnection"
        : "Sync interrupted; will retry",
      now() + 300000,
      reconnect ? "reconnect" : "active",
      c.id,
      lease,
    ).run();
    throw error;
  } finally {
    await stmt(
      env,
      "UPDATE assistant_mail_connections SET lease_until=0,lease_id=NULL WHERE id=? AND lease_id=?",
      c.id,
      lease,
    ).run();
  }
}
export async function runScheduled(env, helpers) {
  const rows = await stmt(
    env,
    "SELECT c.id,c.workspace_id,c.user_id FROM assistant_mail_connections c JOIN users u ON u.id=c.user_id AND u.status='active' WHERE c.status='active' AND c.next_sync_at<=? AND c.lease_until<? ORDER BY c.next_sync_at,c.id LIMIT 2",
    now(),
    now(),
  ).all();
  const results = [];
  for (const c of rows.results) {
    try {
      const user = await stmt(
        env,
        "SELECT id FROM users WHERE id=? AND status='active'",
        c.user_id,
      ).first();
      if (!user) throw fail(403, "Active user required");
      if (!helpers?.requireWorkspaceWrite)
        throw fail(503, "Membership checker required");
      await helpers.requireWorkspaceWrite(
        env,
        { user: { id: c.user_id } },
        c.workspace_id,
      );
    } catch {
      // Authorization failures must leave room for other users on the next run.
      await stmt(
        env,
        "UPDATE assistant_mail_connections SET next_sync_at=?,last_error=? WHERE id=? AND workspace_id=? AND user_id=? AND status='active' AND lease_until<?",
        now() + 300000,
        "Sync deferred; workspace access required",
        c.id,
        c.workspace_id,
        c.user_id,
        now(),
      ).run();
      results.push({ id: c.id, error: "Sync deferred" });
      continue;
    }
    try {
      results.push({
        id: c.id,
        ...(await syncConnection(env, c.id, c.workspace_id, c.user_id)),
      });
    } catch {
      results.push({ id: c.id, error: "Sync deferred" });
    }
  }
  return results;
}
export async function handleRequest(request, env, context) {
  const { path, workspaceId, auth } = context;
  if (!path.startsWith("mail/")) return null;
  if (!auth?.user?.id)
    return Response.json({ error: "Authentication required" }, { status: 401 });
  const userId = auth.user.id;
  try {
    if (
      !["GET", "HEAD"].includes(request.method) &&
      context.helpers?.requireWorkspaceWrite
    )
      await context.helpers.requireWorkspaceWrite(env, auth, workspaceId);
    if (path === "mail/connections" && request.method === "GET") {
      const rows = await stmt(
        env,
        "SELECT id,provider,account_email,status,last_sync_at,last_error,created_at FROM assistant_mail_connections WHERE workspace_id=? AND user_id=?",
        workspaceId,
        userId,
      ).all();
      return Response.json({ connections: rows.results });
    }
    if (path === "mail/connect" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        throw fail(400, "Invalid JSON");
      }
      return Response.json(await startOAuth(env, context, body?.provider));
    }
    if (path === "mail/messages" && request.method === "GET") {
      const url = new URL(request.url),
        offset = Number(url.searchParams.get("offset") || 0);
      if (!Number.isSafeInteger(offset) || offset < 0)
        throw fail(400, "Invalid offset");
      const rows = await stmt(
        env,
        "SELECT * FROM assistant_mail_messages WHERE workspace_id=? AND user_id=? ORDER BY sent_at DESC,id LIMIT 50 OFFSET ?",
        workspaceId,
        userId,
        offset,
      ).all();
      return Response.json({
        messages: rows.results,
        nextOffset: rows.results.length === 50 ? offset + 50 : null,
      });
    }
    if (path.startsWith("mail/messages/") && request.method === "GET") {
      let messageId;
      try {
        messageId = decodeURIComponent(path.slice("mail/messages/".length));
      } catch {
        throw fail(400, "Invalid message ID");
      }
      const message = await stmt(
        env,
        "SELECT * FROM assistant_mail_messages WHERE workspace_id=? AND user_id=? AND (provider_message_id=? OR id=?) ORDER BY sent_at DESC LIMIT 1",
        workspaceId,
        userId,
        messageId,
        messageId,
      ).first();
      if (!message) throw fail(404, "Message not found");
      return Response.json({ message });
    }
    const match = path.match(/^mail\/connections\/([^/]+)(\/sync)?$/);
    if (match && request.method === "POST" && match[2])
      return Response.json(
        await syncConnection(env, match[1], workspaceId, userId),
      );
    if (match && request.method === "DELETE" && !match[2]) {
      await env.DB.batch([
        stmt(
          env,
          "DELETE FROM assistant_mail_messages WHERE workspace_id=? AND user_id=? AND connection_id=?",
          workspaceId,
          userId,
          match[1],
        ),
        stmt(
          env,
          "DELETE FROM assistant_mail_connections WHERE workspace_id=? AND user_id=? AND id=?",
          workspaceId,
          userId,
          match[1],
        ),
      ]);
      return Response.json({ disconnected: true });
    }
    return null;
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: error.status || 500 },
    );
  }
}
