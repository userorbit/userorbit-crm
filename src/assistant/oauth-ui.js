import { faviconHead } from "../brand-assets.js";
import { designSystemCss, icon } from "../design-system.js";

// Serialized callbacks need the name helper that Wrangler adds when bundling.
export const mailboxCallbackHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Connecting your mailbox · Userorbit</title><style>${designSystemCss}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;flex-direction:column;background:var(--bg-main,#171714);color:var(--text-primary,#fafaf8);font:13px/1.6 Inter,Arial,sans-serif}a{color:inherit;text-decoration:none}header{height:64px;padding:0 28px;display:flex;align-items:center;gap:10px;font-size:16px;font-weight:600;border-bottom:1px solid var(--border-primary,rgba(250,250,248,.12))}.brand-mark{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:var(--accent,#4f46e5);color:var(--text-primary-action,#fff)}main{flex:1;display:grid;place-items:center;padding:40px 20px}.connection-card{width:100%;max-width:420px;background:var(--bg-primary,#1c1c18);border:1px solid var(--border-primary,rgba(250,250,248,.12));border-radius:12px;padding:32px}.connection-icon{display:grid;place-items:center;width:44px;height:44px;border:1px solid var(--border-primary,rgba(250,250,248,.12));border-radius:10px;background:var(--bg-tertiary,#30302a);color:var(--brand-text,#a5b4fc);margin-bottom:24px}h1{font-size:20px;font-weight:500;letter-spacing:-.3px;line-height:1.4;margin:0 0 10px}p{margin:0;color:var(--text-secondary,#b5b5aa)}#status{min-height:66px;margin-bottom:24px}.return-link{display:flex;align-items:center;justify-content:center;gap:8px;min-height:34px;background:var(--accent,#4f46e5);color:var(--text-primary-action,#fff);border:1px solid transparent;border-radius:8px;font-weight:500}.return-link:hover{filter:brightness(.94)}.connection-note{display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--text-tertiary,#929288);margin-top:20px}footer{padding:20px;text-align:center;font-size:11px;color:var(--text-tertiary,#929288)}svg{flex-shrink:0;vertical-align:middle}
.connection-card[data-state=error] .connection-icon{color:var(--red,#f19795)}.connection-card[data-state=error] #status{color:var(--text-secondary,#b5b5aa)}
</style>${faviconHead}</head><body><header><a class="brand-mark" href="/app" aria-label="Userorbit CRM">${icon("orbit",20)}</a>Userorbit CRM</header><main><section class="connection-card" aria-labelledby="connection-title"><div class="connection-icon">${icon("mail",22)}</div><h1 id="connection-title">Connecting your mailbox</h1><p id="status" role="status" aria-live="polite">Finishing your secure connection…</p><a class="return-link" href="/assistant#mail">Return to mailboxes${icon("arrow-right",15)}</a><p class="connection-note">${icon("shield",13)}Your connection is securely encrypted</p></section></main><footer>Relationship assistant · Userorbit CRM</footer><script>function __name(fn) { return fn; } (${finishMailboxConnection.toString()})();</script></body></html>`;

function finishMailboxConnection() {
  const status = document.querySelector("#status");
  function showError(message) {
    status.textContent = message;
    document.querySelector("#connection-title").textContent = "Mailbox not connected";
    document.querySelector(".connection-card").dataset.state = "error";
    document.querySelector(".connection-note").textContent = "Return to mailboxes to try connecting again.";
  }
  const token = localStorage.getItem("crmApiToken");
  const workspaceId = localStorage.getItem("crmWorkspaceId");
  if (!token || !workspaceId) { showError("Sign in to CRM in this browser, then reconnect the mailbox from the assistant."); return; }
  fetch(location.pathname + location.search, { method: "POST", headers: { authorization: "Bearer " + token, "x-workspace-id": workspaceId, "content-type": "application/json" }, body: "{}" }).then(async (response) => {
    const result = await response.json();
    history.replaceState(null, "", location.pathname);
    if (!response.ok) throw new Error(result.error || "Connection could not be completed.");
    status.textContent = "Mailbox connected. Returning to your assistant…";
    location.replace("/assistant#mail");
  }).catch((error) => { history.replaceState(null, "", location.pathname); showError(error.message); });
}
