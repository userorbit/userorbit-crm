// Serialized callbacks need the name helper that Wrangler adds when bundling.
export const mailboxCallbackHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Connecting your mailbox</title><style>body{font:16px system-ui;margin:12vh auto;max-width:540px;padding:24px;color:#24232b}p{line-height:1.6}a{color:#6150bd}</style></head><body><h1>Connecting your mailbox</h1><p id="status" role="status">Finishing your secure connection…</p><a href="/assistant#mail">Return to mailboxes</a><script>function __name(fn) { return fn; } (${finishMailboxConnection.toString()})();</script></body></html>`;

function finishMailboxConnection() {
  const status = document.querySelector("#status");
  const token = localStorage.getItem("crmApiToken");
  const workspaceId = localStorage.getItem("crmWorkspaceId");
  if (!token || !workspaceId) { status.textContent = "Sign in to CRM in this browser, then reconnect the mailbox from the assistant."; return; }
  fetch(location.pathname + location.search, { method: "POST", headers: { authorization: "Bearer " + token, "x-workspace-id": workspaceId, "content-type": "application/json" }, body: "{}" }).then(async (response) => {
    const result = await response.json();
    history.replaceState(null, "", location.pathname);
    if (!response.ok) throw new Error(result.error || "Connection could not be completed.");
    status.textContent = "Mailbox connected. Returning to your assistant…";
    location.replace("/assistant#mail");
  }).catch((error) => { history.replaceState(null, "", location.pathname); status.textContent = error.message; });
}
