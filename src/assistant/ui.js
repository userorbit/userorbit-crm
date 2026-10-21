// Serialized callbacks need the name helper that Wrangler adds when bundling.
export const assistantHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relationship assistant · Userorbit CRM</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#24232b;background:#f7f7f9;font-synthesis:none;-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}*{box-sizing:border-box}body{margin:0}button,input,select,textarea{font:inherit}button,a.button{min-height:40px;padding:9px 14px;border:1px solid #dedde5;border-radius:8px;background:white;color:inherit;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:background .15s,transform .15s}button:hover,a.button:hover{background:#efedf6}button:active{transform:scale(.96)}button:disabled{opacity:.5;cursor:wait}button.primary{background:#6150bd;color:white;border-color:#6150bd}a{color:#6150bd}button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid #b5a6f3;outline-offset:2px}.layout{display:grid;grid-template-columns:225px 1fr;min-height:100dvh}aside{background:#fff;border-right:1px solid #e9e8ee;padding:24px 16px;position:sticky;top:0;height:100dvh}.brand{font-size:15px;font-weight:700;padding:0 10px 24px}.brand span{display:block;font-size:12px;font-weight:400;color:#74707f;margin-top:4px}nav{display:grid;gap:4px}nav button{justify-content:flex-start;border-color:transparent;background:transparent}nav button[aria-current=page]{background:#eeebfa;color:#514096;font-weight:600}.back{display:block;margin:24px 12px;font-size:13px}main{max-width:1160px;width:100%;padding:40px 48px;margin:0 auto}header{display:flex;gap:20px;justify-content:space-between;align-items:center;margin-bottom:28px}h1{font-size:28px;letter-spacing:-.8px;margin:0 0 8px;text-wrap:balance}h2{font-size:17px;margin:0 0 12px}h3{font-size:15px;margin:0 0 8px}p{line-height:1.6;text-wrap:pretty;margin:8px 0}.muted{font-size:13px;color:#706b7d}.eyebrow{color:#70608e;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}.panel,.item{background:white;border-radius:14px;padding:22px;box-shadow:0 0 0 1px #24232b0b,0 3px 12px #24232b04;margin-bottom:18px}.item{padding:18px;border-radius:10px;margin-top:12px;margin-bottom:0}.item p{font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}label{display:grid;gap:7px;font-size:13px;font-weight:500;margin-bottom:14px}input,select,textarea{min-height:42px;border:1px solid #dedde5;border-radius:8px;padding:10px 12px;background:white;width:100%;color:inherit}textarea{min-height:110px;resize:vertical}label.check{display:flex;align-items:center;gap:10px}label.check input{width:18px;min-height:18px}.status{padding:12px 16px;border-radius:9px;margin-bottom:18px;background:#eeeaf9;font-size:14px}.status.error{background:#fcebed;color:#9a293d}.empty{padding:20px 0;color:#706b7d;font-size:14px}.pill{display:inline-block;font-size:11px;padding:4px 7px;background:#f1eff7;color:#625678;border-radius:5px;margin:4px 4px 0 0}.sources{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;margin-top:12px}.workspace{min-width:160px;width:auto;max-width:260px}.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}.answer{white-space:pre-wrap}pre{white-space:pre-wrap;font-size:13px;background:#f5f4f8;border-radius:8px;padding:14px;overflow-wrap:anywhere}[hidden]{display:none!important}@media(max-width:760px){.layout{display:block}aside{position:static;height:auto;padding:16px;border-right:0;border-bottom:1px solid #e9e8ee}.brand{padding-bottom:12px}nav{display:flex;overflow:auto}nav button{white-space:nowrap}.back{margin:12px 8px 0}main{padding:24px 18px}header{align-items:flex-start;flex-direction:column}.workspace{width:100%;max-width:none}.grid{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){button,a.button{transition:none}button:active{transform:none}}
</style></head><body><div class="layout"><aside><div class="brand">Userorbit CRM<span>Relationship assistant</span></div><nav aria-label="Assistant sections" id="navigation"></nav><a class="back" href="/app">← Back to CRM</a></aside><main><header><div><div class="eyebrow">Your relationships, remembered</div><h1 id="heading">Today</h1><p class="muted" id="subtitle">People and promises worth your attention.</p></div><label class="visually-hidden" for="workspace">Workspace</label><select class="workspace" id="workspace"></select></header><div id="status" role="status" aria-live="polite" hidden></div><section id="content" aria-busy="true"></section></main></div><script>function __name(fn) { return fn; } (${assistantClient.toString()})();</script></body></html>`;

function assistantClient() {
  const $ = (selector) => document.querySelector(selector);
  const sections = {
    today: ["Today", "People and promises worth your attention."],
    commitments: ["Promises", "Track what you owe and what you are waiting for."],
    meetings: ["Meeting briefs", "Walk into your next conversation caught up."],
    drafts: ["Draft a note", "Prepare a personal follow-up. You decide when to send it."],
    knowledge: ["Ask your CRM", "Find answers in your history, with sources you can check."],
    network: ["Your network", "Bring in connections, trace introductions, and follow changes."],
    mail: ["Mailboxes", "Connect your history to build relationship context."],
    jobs: ["Recurring jobs", "Choose what your assistant should keep an eye on."],
    connections: ["AI connections", "Use your CRM from the AI tools you already work in."],
  };
  const state = { section: location.hash.slice(1) || "today", workspaceId: localStorage.getItem("crmWorkspaceId") || "", token: localStorage.getItem("crmApiToken") || "", contacts: [], generation: 0 };
  if (!sections[state.section]) state.section = "today";
  function node(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined && text !== null) el.textContent = String(text);
    if (className) el.className = className;
    return el;
  }
  function announce(message, error = false) { const el = $("#status"); el.hidden = false; el.className = "status" + (error ? " error" : ""); el.textContent = message; }
  async function api(path, options = {}) {
    const response = await fetch("/api/" + path, { ...options, headers: { "content-type": "application/json", authorization: "Bearer " + state.token, "x-workspace-id": state.workspaceId, ...options.headers } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The request could not be completed.");
    return data;
  }
  const post = (path, data = {}) => api("assistant/" + path, { method: "POST", body: JSON.stringify(data) });
  function button(label, action, primary = false) {
    const el = node("button", label, primary ? "primary" : "");
    el.type = "button";
    el.addEventListener("click", async () => { el.disabled = true; try { await action(); } catch (error) { announce(error.message, true); } finally { el.disabled = false; } });
    return el;
  }
  function panel(title, description) { const el = node("div", null, "panel"); if (title) el.append(node("h2", title)); if (description) el.append(node("p", description, "muted")); return el; }
  function field(form, label, name, type = "text", options = []) {
    const wrap = node("label", label);
    let input;
    if (type === "select") { input = node("select"); for (const [value, text] of options) { const option = node("option", text); option.value = value; input.append(option); } }
    else { input = node(type === "textarea" ? "textarea" : "input"); if (type !== "textarea") input.type = type; }
    input.name = name; wrap.append(input); form.append(wrap); return input;
  }
  function formBox(title, description, submit, action) {
    const box = panel(title, description); const form = node("form"); box.append(form);
    const submitButton = node("button", submit, "primary"); submitButton.type = "submit";
    form.addEventListener("submit", async (event) => { event.preventDefault(); submitButton.disabled = true; try { await action(Object.fromEntries(new FormData(form)), form); } catch (error) { announce(error.message, true); } finally { submitButton.disabled = false; } });
    form.finish = () => form.append(submitButton); return { box, form };
  }
  function list(container, data, render, empty = "Nothing to show yet.") { if (!data.length) container.append(node("p", empty, "empty")); else for (const item of data) container.append(render(item)); }
  function array(data, keys = []) { if (Array.isArray(data)) return data; for (const key of keys) if (Array.isArray(data?.[key])) return data[key]; return []; }
  function sources(container, data) {
    const links = node("div", null, "sources");
    for (const source of array(data)) {
      const raw = source.url || source.sourceUrl || source.source_url || source.href;
      if (raw) { const url = new URL(raw, location.origin); if (!["https:", "http:"].includes(url.protocol)) continue; const link = node("a", source.title || source.subject || source.label || "View source"); link.href = url.href;
        if (url.origin === location.origin && url.pathname.startsWith("/api/")) link.addEventListener("click", async (event) => { event.preventDefault(); try { const data = await api(url.pathname.slice(5) + url.search); const source = data.source || data.message || data; const viewer = panel(source.title || source.subject || "Source"); viewer.append(node("p", source.body || source.text || source.excerpt || source.content || source.description || source.observation || source.notes || [source.name, source.email, source.domain].filter(Boolean).join(" · ") || "No readable text is available for this source."), button("Close source", () => viewer.remove())); container.append(viewer); } catch (error) { announce(error.message, true); } });
        link.target = "_blank"; link.rel = "noopener noreferrer"; links.append(link); }
      else links.append(node("span", source.title || source.label || source.id || "CRM history", "pill"));
    }
    container.append(links);
  }
  function card(title, detail, evidence) { const el = node("article", null, "item"); el.append(node("h3", title), node("p", detail || "")); if (evidence) sources(el, evidence); return el; }
  function output(container, data) {
    container.replaceChildren();
    let text = data.answer || data.body || data.summary || data.text;
    if (text && data.event?.starts_at) text = text.replace(data.event.starts_at, new Date(data.event.starts_at).toLocaleString());
    if (text && data.sources) for (const [index, source] of data.sources.entries()) if (source.id) text = text.split("[" + source.id + "]").join("[" + (index + 1) + "]");
    if (text && !(data.id && data.subject !== undefined && data.body !== undefined)) container.append(node("p", text, "answer"));
    if (data.subject) container.prepend(node("h3", data.subject));
    if (data.answerMode === "extractive" || ["fallback", "deterministic"].includes(data.provider)) container.append(node("p", "Prepared from saved evidence. AI generation is not configured or was unavailable.", "muted"));
    sources(container, data.sources || data.citations);
    for (const [key, label] of [["commitments", "Open promises"], ["tasks", "Open tasks"], ["recentMessages", "Recent conversations"], ["opportunities", "Opportunities"]]) {
      if (data[key]?.length) { container.append(node("h3", label)); for (const item of data[key]) container.append(card(item.title || item.subject || item.name || item.quote, item.excerpt || item.notes || item.quote || item.stage || item.status, item.url ? [item] : item.source_url ? [{ url: item.source_url, title: "Evidence" }] : [])); }
    }
    if (data.id && data.subject !== undefined && data.body !== undefined) {
      const editor = node("form"); field(editor, "Subject", "subject").value = data.subject; field(editor, "Draft text", "body", "textarea").value = data.body;
      const actions = node("div", null, "actions"); actions.append(button("Copy draft", async () => { await navigator.clipboard.writeText(editor.elements.body.value); announce("Draft copied. Review and send it from your email client."); }), button("Save reviewed draft", async () => { await api("assistant/intelligence/drafts/" + encodeURIComponent(data.id), { method: "PATCH", body: JSON.stringify({ subject: editor.elements.subject.value, body: editor.elements.body.value, status: "reviewed" }) }); announce("Reviewed draft saved."); })); editor.append(actions); container.append(editor);
    }
  }
  async function show() {
    const generation = ++state.generation;
    $("#heading").textContent = sections[state.section][0]; $("#subtitle").textContent = sections[state.section][1];
    for (const el of $("#navigation").children) el.setAttribute("aria-current", el.dataset.section === state.section ? "page" : "false");
    const content = $("#content"); content.replaceChildren(node("p", "Loading…", "muted")); content.setAttribute("aria-busy", "true");
    const page = node("div");
    try {
      await views[state.section](page);
      if (generation === state.generation) content.replaceChildren(...page.childNodes);
    } catch (error) { if (generation === state.generation) { content.replaceChildren(node("p", error.message, "empty")); announce(error.message, true); } }
    finally { if (generation === state.generation) content.setAttribute("aria-busy", "false"); }
  }
  const views = {
    async today(page) {
      const box = panel("Worth your attention", "Each suggestion should explain why now. A quiet day can stay quiet."); page.append(box);
      const data = await api("assistant/intelligence/attention");
      list(box, array(data, ["items", "suggestions", "actions"]), (item) => {
        const el = card(item.title || item.contactName || "Follow up", item.reason || item.detail || item.summary, item.sources);
        if (item.id) { const actions = node("div", null, "actions"); actions.append(button("Snooze a week", async () => { await api("assistant/intelligence/attention/" + encodeURIComponent(item.id), { method: "PATCH", body: JSON.stringify({ status: "snoozed", snoozedUntil: new Date(Date.now() + 7 * 86400000).toISOString() }) }); await show(); }), button("Dismiss", async () => { await api("assistant/intelligence/attention/" + encodeURIComponent(item.id), { method: "PATCH", body: JSON.stringify({ status: "dismissed" }) }); await show(); })); el.append(actions); }
        return el;
      }, "No outstanding suggestions. Connect a mailbox to add conversation context.");
    },
    async commitments(page) {
      const box = panel("Open promises", "Review suggestions before adding them to your task list.");
      box.append(button("Find promises in recent mail", async () => { const result = await post("intelligence/commitments/extract"); announce(result.message || "Recent conversations reviewed."); await show(); }, true)); page.append(box);
      const data = await api("assistant/intelligence/commitments");
      list(box, array(data, ["commitments", "items"]).filter((item) => !["resolved", "dismissed"].includes(item.status)), (item) => {
        const el = card(item.title || item.text || item.description, [item.quote, item.dueAt || item.due_at, item.status].filter(Boolean).join(" · "), item.sources || [{ url: item.source_url, title: "Promise evidence" }]);
        const deadline = node("input"); deadline.type = "datetime-local"; deadline.setAttribute("aria-label", "Due date for " + item.title);
        if (item.due_at) { const date = new Date(item.due_at); const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); deadline.value = local.toISOString().slice(0, 16); }
        const actions = node("div", null, "actions");
        actions.append(deadline, button("Save due date", async () => { await api("assistant/intelligence/commitments/" + encodeURIComponent(item.id), { method: "PATCH", body: JSON.stringify({ status: item.status, dueAt: deadline.value ? new Date(deadline.value).toISOString() : null }) }); announce("Due date saved."); await show(); }));
        if (item.deadlineText || item.suggestedDueDate) el.append(node("p", "Deadline to review: " + (item.suggestedDueDate || item.deadlineText), "muted"));
        if (item.suggestedDueAt && !item.due_at) { const date = new Date(item.suggestedDueAt); deadline.value = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
        if (item.resolutionEvidence?.length) { el.append(node("p", "A later message may have completed this promise. Review the evidence before marking complete.", "muted")); for (const evidence of item.resolutionEvidence) el.append(card(evidence.subject || "Completion evidence", evidence.quote, [evidence])); }
        if (item.status === "proposed") actions.append(button("Accept promise", async () => { await api("assistant/intelligence/commitments/" + encodeURIComponent(item.id), { method: "PATCH", body: JSON.stringify({ status: "accepted" }) }); await show(); }));
        if (item.status === "accepted" && !item.task_id) actions.append(button("Create task", async () => { await post("intelligence/commitments/" + encodeURIComponent(item.id) + "/task"); announce("Task created."); await show(); }));
        actions.append(button("Mark complete", async () => { await api("assistant/intelligence/commitments/" + encodeURIComponent(item.id), { method: "PATCH", body: JSON.stringify({ status: "resolved" }) }); await show(); })); el.append(actions); return el;
      }, "No promises found yet. Connect your mail, then review recent conversations.");
    },
    async meetings(page) {
      const data = await api("calendar/events"); const box = panel("Upcoming conversations", "Briefs use your saved meeting and CRM history."); page.append(box);
      const meetings = array(data, ["events"]).filter((event) => new Date(event.starts_at || event.startsAt) > new Date()).slice(0, 15);
      list(box, meetings, (meeting) => {
        const el = card(meeting.title, new Date(meeting.starts_at || meeting.startsAt).toLocaleString());
        const result = node("div"); el.append(button("Prepare brief", async () => { output(result, await api("assistant/intelligence/briefs/" + encodeURIComponent(meeting.id))); }), result); return el;
      }, "No upcoming meetings. Connect a calendar in CRM Settings or add a meeting.");
    },
    async drafts(page) {
      const { box, form } = formBox("Write a follow-up", "Grounded in CRM context and your own writing samples. Review the draft before using it.", "Prepare draft", async (data) => { output(result, (await post("intelligence/drafts", { contactId: data.contactId, instruction: data.instruction, sampleIds: Array.from(form.querySelectorAll("input[name=sampleId]:checked"), (input) => input.value) })).draft); });
      field(form, "Contact", "contactId", "select", state.contacts.map((contact) => [contact.id, contact.name + " · " + contact.email]));
      const intent = field(form, "What should the note do?", "instruction", "textarea"); intent.required = true; intent.placeholder = "Follow up on our proposal and ask about timing.";
      const samples = await api("assistant/intelligence/writing-samples");
      if (samples.samples?.length) { form.append(node("p", "Choose writing samples to guide the tone (up to five).", "muted")); for (const sample of samples.samples.slice(0, 10)) { const label = node("label", sample.subject || "Sent message", "check"); const input = node("input"); input.type = "checkbox"; input.name = "sampleId"; input.value = sample.messageId || sample.provider_message_id || sample.id; label.prepend(input); form.append(label); } }
      form.finish(); const result = panel("Your draft"); page.append(box, result);
    },
    async knowledge(page) {
      const { box, form } = formBox("Ask about your history", "Answers link back to the records they use.", "Find answer", async (data) => { output(answer, await post("knowledge/ask", data)); });
      const query = field(form, "Your question", "query"); query.required = true; query.placeholder = "What did we agree with Acme?"; form.finish(); const answer = panel("Answer"); page.append(box, answer);
      const upload = formBox("Add a document or note", "Use a text note, Markdown, CSV, or supported PDF file.", "Save to knowledge", async (data, form) => {
        const file = form.elements.file.files[0]; const payload = { name: data.title, text: data.text };
        if (file) { if (file.size > 1048576) throw new Error("Choose a file smaller than 1 MiB."); payload.name = file.name; payload.mimeType = file.type; const bytes = new Uint8Array(await file.arrayBuffer()); let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) { payload.mimeType = "application/pdf"; payload.dataBase64 = btoa(binary); delete payload.text; } else { payload.text = new TextDecoder().decode(bytes); payload.mimeType = "text/plain"; } }
        await post("knowledge/documents", payload); announce("Saved to your knowledge."); await show();
      });
      field(upload.form, "Title", "title").required = true; field(upload.form, "Note", "text", "textarea"); const file = field(upload.form, "Or choose a file", "file", "file"); file.accept = ".txt,.md,.csv,.pdf"; upload.form.finish(); page.append(upload.box);
      const documents = await api("assistant/knowledge/documents"); const library = panel("Saved documents"); page.append(library);
      list(library, array(documents, ["documents", "items"]), (document) => { const el = card(document.name, document.mime_type || "Saved note"); el.append(button("Delete", async () => { await api("assistant/knowledge/documents/" + encodeURIComponent(document.id), { method: "DELETE" }); await show(); })); return el; });
    },
    async network(page) {
      const importer = formBox("Import LinkedIn history", "Preview your connections before saving. Unmatched people stay separate for review.", "Preview import", async (data) => {
        const file = importer.form.elements.file.files[0]; if (!file) throw new Error("Choose a LinkedIn CSV or JSON export.");
        const payload = { content: await file.text(), format: file.name.endsWith(".json") ? "json" : "csv" };
        const preview = await post("network/imports/preview", payload); result.replaceChildren(node("p", (preview.count || array(preview, ["people", "rows", "items"]).length) + " connections ready to review."));
        for (const person of array(preview, ["rows", "people", "items"]).slice(0, 20)) result.append(card(person.name, [person.company, person.title, ...(person.warnings || [])].filter(Boolean).join(" · ")));
        result.append(button("Import connections", async () => { await post("network/imports", { ...payload, confirm: true }); announce("Connections imported."); await show(); }, true));
      });
      field(importer.form, "LinkedIn export", "file", "file").accept = ".csv,.json"; importer.form.finish(); const result = panel("Import preview"); page.append(importer.box, result);
      const route = formBox("Find a warm introduction", "Only paths supported by saved relationships are shown.", "Find a route", async (data) => {
        const response = await api("assistant/network/paths?to=" + encodeURIComponent(data.to)); paths.replaceChildren(); list(paths, array(response, ["paths", "routes"]), (path) => card(path.title || path.nodes?.map((entry) => entry === "self" ? "Me" : state.contacts.find((person) => "contact:" + person.id === entry)?.name || imported.find((person) => "import:" + person.id === entry)?.name || "Saved connection").join(" → ") || "Introduction path", path.reason || path.edges?.map((edge) => edge.evidence).join(" → "), path.edges?.map((edge) => ({ title: edge.relationship, url: edge.source_url }))), "No supported introduction path found.");
      });
      field(route.form, "Person at your target company", "to", "select", state.contacts.map((contact) => ["contact:" + contact.id, contact.name + " · " + contact.account_name])).required = true; route.form.finish(); const paths = panel("Introduction paths"); page.append(route.box, paths);
      const imported = array(await api("assistant/network/imports"), ["items"]);
      const review = panel("Imported connections", "Link an identity to a CRM contact only when you are sure they are the same person."); page.append(review);
      list(review, imported.slice(0, 50), (person) => {
        const el = card(person.name, [person.company, person.title, person.status].filter(Boolean).join(" · "));
        const select = node("select"); select.setAttribute("aria-label", "Match " + person.name + " to contact");
        const empty = node("option", "Choose a matching contact"); empty.value = ""; select.append(empty);
        for (const contact of state.contacts) { const option = node("option", contact.name + " · " + contact.account_name); option.value = contact.id; select.append(option); }
        el.append(select, button("Confirm match", async () => { if (!select.value) throw new Error("Choose a contact to match."); await post("network/imports/" + encodeURIComponent(person.id) + "/match", { confirm: true, contact_id: select.value }); await show(); })); return el;
      });
      const capture = formBox("Save a LinkedIn profile", "Capture a profile you have chosen to save. It stays in your review queue.", "Save profile", async (data) => { await post("network/capture", { ...data, confirm: true }); announce("Profile saved for review."); await show(); });
      field(capture.form, "Name", "name").required = true; field(capture.form, "LinkedIn profile URL", "url", "url").required = true; field(capture.form, "Company", "company"); field(capture.form, "Title", "title"); capture.form.finish(); page.append(capture.box);
      const nodes = [["self", "Me"], ...state.contacts.map((person) => ["contact:" + person.id, person.name]), ...imported.filter((person) => person.status !== "rejected").map((person) => ["import:" + person.id, person.name + " (imported)"])];
      const edge = formBox("Record an introduction or relationship", "Every connection needs evidence you can explain.", "Save relationship", async (data) => { await post("network/edges", { ...data, confirm: true }); announce("Relationship saved."); });
      field(edge.form, "From", "from_node", "select", nodes); field(edge.form, "To", "to_node", "select", nodes);
      field(edge.form, "Relationship", "relationship", "select", [["introduced", "Introduced"], ["referral", "Referred"], ["colleague", "Worked together"], ["connection", "Connected"]]);
      field(edge.form, "Evidence", "evidence", "textarea").required = true; field(edge.form, "Source URL (optional)", "source_url", "url"); edge.form.finish(); page.append(edge.box);
      const snapshot = formBox("Record a change observation", "The first snapshot establishes a baseline. Later snapshots show what changed.", "Save observation", async (data) => {
        await post("network/observations", { confirm: true, entity_type: "contact", entity_id: data.contactId, values: { title: data.title, company: data.company }, source_url: data.source_url, evidence: data.evidence }); announce("Observation saved."); await show();
      });
      field(snapshot.form, "Contact", "contactId", "select", state.contacts.map((person) => [person.id, person.name])); field(snapshot.form, "Current title", "title"); field(snapshot.form, "Current company", "company"); field(snapshot.form, "Source URL", "source_url", "url").required = true; field(snapshot.form, "Evidence", "evidence", "textarea").required = true; snapshot.form.finish(); page.append(snapshot.box);
      const monitors = await api("assistant/network/monitors");
      if (monitors.configured) {
        const monitor = formBox("Watch a contact", "Checks your configured observation provider at most once a day.", "Start watching", async (data) => { await post("network/monitors", { confirm: true, entity_type: "contact", entity_id: data.contactId, url: data.url, interval_hours: 24 }); announce("Monitor created."); await show(); });
        field(monitor.form, "Contact", "contactId", "select", state.contacts.map((person) => [person.id, person.name])); field(monitor.form, "Public profile URL", "url", "url").required = true; monitor.form.finish(); page.append(monitor.box);
        list(monitor.box, monitors.items || [], (item) => { const el = card(item.url, item.last_status || "Waiting for first check"); el.append(button("Stop watching", async () => { await api("assistant/network/monitors/" + encodeURIComponent(item.id), { method: "DELETE" }); await show(); })); return el; });
      } else { const info = panel("Automatic change monitoring"); info.append(node("p", "An administrator can connect an observation provider to enable scheduled profile and company checks.", "muted")); page.append(info); }
      const changes = await api("assistant/network/alerts"); const updates = panel("Network changes"); page.append(updates);
      list(updates, array(changes, ["changes", "items", "observations"]), (change) => card(change.title || change.kind || "Network update", change.summary || [change.before_value, change.after_value].filter(Boolean).join(" → "), [{ url: change.source_url, title: "Evidence" }]));
    },
    async mail(page) {
      const box = panel("Connect your mailbox", "History is private to your account. Disconnect whenever you like."); page.append(box);
      const actions = node("div", null, "actions");
      for (const [provider, label] of [["gmail", "Connect Gmail"], ["microsoft", "Connect Microsoft 365"]]) actions.append(button(label, async () => { const result = await post("mail/connect", { provider }); const url = new URL(result.url || result.authorizationUrl); if (url.protocol !== "https:") throw new Error("Invalid connection URL"); location.assign(url.href); }, true)); box.append(actions);
      const data = await api("assistant/mail/connections");
      list(box, array(data, ["connections", "items"]), (connection) => {
        const el = card(connection.account_email || connection.provider, connection.status + (connection.last_error ? " · " + connection.last_error : "")); const controls = node("div", null, "actions");
        controls.append(button("Sync now", async () => { const result = await post("mail/connections/" + encodeURIComponent(connection.id) + "/sync"); announce(result.hasMore ? "Imported this batch. More history will continue in the background." : "Mailbox synchronized."); await show(); }), button("Disconnect", async () => { await api("assistant/mail/connections/" + encodeURIComponent(connection.id), { method: "DELETE" }); await show(); })); el.append(controls); return el;
      }, "No mailbox connected yet. Your administrator must configure the provider credentials before first use.");
    },
    async jobs(page) {
      const data = await api("assistant/automations/jobs");
      const create = formBox("Give your assistant a recurring job", "Results appear here when something useful changes.", "Create job", async (data) => { if (!data.instructions.trim()) delete data.instructions; await post("automations/jobs", { ...data, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, schedule: { type: data.frequency, time: String(data.hour).padStart(2, "0") + ":00", ...(data.frequency === "weekly" ? { days: [1] } : {}) } }); announce("Recurring job created."); await show(); });
      field(create.form, "Name", "name").required = true;
      field(create.form, "Job", "template", "select", [["attention", "Review relationships"], ["commitments", "Review open promises"], ["meeting_brief", "Prepare upcoming meetings"], ["network_changes", "Review network changes"], ["cited_research", "Research a saved question"]]);
      field(create.form, "Instructions", "instructions", "textarea"); field(create.form, "Frequency", "frequency", "select", [["daily", "Daily"], ["weekly", "Weekly"]]); const hour = field(create.form, "Hour (your time zone)", "hour", "number"); hour.min = "0"; hour.max = "23"; hour.value = "9"; create.form.finish(); page.append(create.box);
      const jobs = panel("Your jobs"); page.append(jobs);
      list(jobs, array(data, ["jobs", "items"]), (job) => { const el = card(job.name, job.instructions || job.template); const controls = node("div", null, "actions"); controls.append(button("Run now", async () => { await post("automations/jobs/" + encodeURIComponent(job.id) + "/run"); announce("Job queued. Its result will appear in history after the next scheduled run."); await show(); }), button("View history", async () => { const data = await api("assistant/automations/jobs/" + encodeURIComponent(job.id) + "/runs"); history.replaceChildren(); list(history, array(data, ["runs", "items"]), (run) => { const entry = card(run.status, run.summary || run.error_code || "Waiting for execution"); if (Array.isArray(run.result)) for (const item of run.result.slice(0, 10)) entry.append(card(item.title || item.event?.title || item.name || "Review item", item.reason || item.summary || item.evidence || item.quote || item.status, item.sources || (item.source_url ? [{ url: item.source_url, title: "Evidence" }] : []))); else if (run.result?.answer) output(entry, run.result); return entry; }); }), button(job.enabled ? "Pause" : "Resume", async () => { await api("assistant/automations/jobs/" + encodeURIComponent(job.id), { method: "PATCH", body: JSON.stringify({ enabled: !job.enabled }) }); await show(); })); const history = node("div");
        controls.append(button("Edit instructions", async () => { history.replaceChildren(); const editor = node("textarea"); editor.value = job.instructions; editor.setAttribute("aria-label", "Instructions for " + job.name); history.append(editor, button("Save instructions", async () => { await api("assistant/automations/jobs/" + encodeURIComponent(job.id), { method: "PATCH", body: JSON.stringify({ instructions: editor.value }) }); announce("Instructions updated."); await show(); })); }));
        el.append(controls, history); return el; });
      const notifications = await api("assistant/automations/notifications"); const inbox = panel("Updates from your assistant"); page.append(inbox);
      list(inbox, notifications.notifications || [], (notice) => { const el = card(notice.title || "Job update", notice.summary || notice.message); if (!notice.read_at) el.append(button("Mark read", async () => { await post("automations/notifications/" + encodeURIComponent(notice.id) + "/read"); await show(); })); return el; });
    },
    async connections(page) {
      const approval = formBox("Approve an AI draft request", "Review the exact request before granting a one-use approval. Approval expires after five minutes.", "Review request", async (data) => {
        preview.replaceChildren(node("h3", "Draft request"), node("p", "Contact: " + (state.contacts.find((contact) => contact.id === data.contactId)?.name || data.contactId)), node("p", data.instructions));
        preview.append(button("Approve this exact request", async () => { const result = await post("mcp/approvals", { tool: "assistant_prepare_draft", arguments: data }); preview.replaceChildren(node("p", "Share this one-use approval ID with your connected AI client:"), node("pre", result.approval_id), button("Copy approval ID", async () => { await navigator.clipboard.writeText(result.approval_id); announce("Approval ID copied."); })); }, true));
      });
      field(approval.form, "Contact", "contactId", "select", state.contacts.map((contact) => [contact.id, contact.name + " · " + contact.account_name])); field(approval.form, "Exact drafting instructions", "instructions", "textarea").required = true; approval.form.finish(); const preview = panel("Approval preview"); page.append(approval.box, preview);
      const box = panel("Connect your AI client", "Use OAuth to let a compatible AI client access your CRM with your permissions."); box.append(node("p", "Add a remote MCP connection using this address:")); const code = node("pre", location.origin + "/mcp"); box.append(code, button("Copy connection address", async () => { await navigator.clipboard.writeText(location.origin + "/mcp"); announce("Connection address copied."); })); box.append(node("p", "You will sign in and review access before a connection is granted. Assistant tools cannot send outreach.", "muted")); page.append(box);
    },
  };
  for (const [id, [label]] of Object.entries(sections)) { const el = button(label, async () => { state.section = id; location.hash = id; await show(); }); el.dataset.section = id; $("#navigation").append(el); }
  $("#workspace").addEventListener("change", async (event) => { state.workspaceId = event.target.value; localStorage.setItem("crmWorkspaceId", state.workspaceId); await loadContacts(); await show(); });
  async function loadContacts() { const data = await api("assistant/contacts"); state.contacts = data.contacts; }
  async function start() {
    if (!state.token) { $("#content").replaceChildren(node("p", "Sign in to CRM to open your assistant.", "empty")); const link = node("a", "Sign in", "button"); link.href = "/app"; $("#content").append(link); return; }
    try {
      const tenant = await api("me"); const workspaces = tenant.workspaces || [];
      if (!workspaces.some((workspace) => workspace.id === state.workspaceId)) state.workspaceId = tenant.currentWorkspaceId || workspaces[0]?.id || "";
      const select = $("#workspace"); for (const workspace of workspaces) { const option = node("option", workspace.name); option.value = workspace.id; select.append(option); } select.value = state.workspaceId; localStorage.setItem("crmWorkspaceId", state.workspaceId);
      await loadContacts(); await show();
    } catch (error) { announce(error.message, true); $("#content").replaceChildren(node("a", "Return to CRM to sign in again.")); $("#content a").href = "/app"; }
  }
  start();
}
