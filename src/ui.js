export const landingHtml = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>UserOrbit CRM - Open source sales workspace</title>
    <style>
      :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #18181b; background: #f7f8fa; }
      * { box-sizing: border-box; }
      body { margin: 0; }
      .hero { min-height: 92vh; display: grid; align-items: center; padding: 32px; background: linear-gradient(180deg, rgba(255,255,255,.86), rgba(247,248,250,.96)), url("https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1800&q=80") center/cover; }
      .wrap { max-width: 1120px; margin: 0 auto; width: 100%; }
      nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 72px; }
      .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; }
      .mark { width: 30px; height: 30px; border-radius: 7px; background: linear-gradient(135deg, #18181b, #5b5bd6); }
      h1 { max-width: 760px; font-size: clamp(42px, 7vw, 78px); line-height: .96; letter-spacing: 0; margin: 0; }
      p { max-width: 690px; color: #52525b; font-size: 19px; line-height: 1.6; }
      .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 28px; }
      a { color: inherit; }
      .button { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 16px; border-radius: 7px; border: 1px solid #d4d4d8; background: #fff; text-decoration: none; font-weight: 650; }
      .button.primary { background: #18181b; color: #fff; border-color: #18181b; }
      .strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; border: 1px solid #e4e4e7; background: #e4e4e7; margin-top: 64px; }
      .item { background: rgba(255,255,255,.92); padding: 18px; min-height: 112px; }
      .item strong { display: block; margin-bottom: 8px; }
      .item span { color: #71717a; font-size: 14px; line-height: 1.5; }
      @media (max-width: 820px) { .strip { grid-template-columns: 1fr; } nav { margin-bottom: 44px; } .hero { padding: 20px; } }
    </style>
  </head>
  <body>
    <section class="hero">
      <div class="wrap">
        <nav>
          <div class="brand"><span class="mark"></span><span>UserOrbit CRM</span></div>
          <a class="button" href="/app">Open app</a>
        </nav>
        <h1>Open source CRM for founder-led outbound.</h1>
        <p>UserOrbit combines accounts, contacts, opportunities, tasks, sequences, mailbox warmup, teams, workspaces, and an agent API in one Cloudflare-native app you can self-host.</p>
        <div class="actions">
          <a class="button primary" href="/app">Launch workspace</a>
          <a class="button" href="https://deploy.workers.cloudflare.com/?url=https://github.com/userorbit/userorbit-crm">Deploy to Cloudflare</a>
          <a class="button" href="https://github.com/userorbit/userorbit-crm">GitHub</a>
        </div>
        <div class="strip">
          <div class="item"><strong>Sales workspace</strong><span>Manage accounts, contacts, opportunities, tasks, and activity from a focused rep workflow.</span></div>
          <div class="item"><strong>Email execution</strong><span>Run templates, outreach sequences, manual sends, and sender warmup through SMTP.</span></div>
          <div class="item"><strong>Multi-tenant core</strong><span>Create teams and workspaces so one self-hosted install can separate motions or clients.</span></div>
          <div class="item"><strong>Agent-ready API</strong><span>Use Codex or other agents to research accounts, create contacts, enroll prospects, and run follow-ups.</span></div>
        </div>
      </div>
    </section>
  </body>
</html>`;

export const appHtml = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>UserOrbit CRM</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f7f8fa;
        --panel: #ffffff;
        --panel-subtle: #fbfbfc;
        --text: #18181b;
        --muted: #71717a;
        --border: #e4e4e7;
        --border-strong: #d4d4d8;
        --accent: #5b5bd6;
        --accent-dark: #4141b8;
        --green: #0f8a5f;
        --amber: #a16207;
        --red: #b42318;
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
      }

      button,
      input,
      select,
      textarea {
        font: inherit;
      }

      .shell {
        display: grid;
        grid-template-columns: 236px 1fr;
        min-height: 100vh;
      }

      .sidebar {
        border-right: 1px solid var(--border);
        background: #fcfcfd;
        padding: 18px 14px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 8px 18px;
        font-weight: 650;
      }

      .mark {
        width: 28px;
        height: 28px;
        border-radius: 7px;
        background: linear-gradient(135deg, #18181b, #5b5bd6);
      }

      .nav {
        display: grid;
        gap: 4px;
      }

      .nav button {
        border: 0;
        background: transparent;
        color: var(--muted);
        text-align: left;
        padding: 9px 10px;
        border-radius: 7px;
        cursor: pointer;
      }

      .nav button.active,
      .nav button:hover {
        background: #f0f0f2;
        color: var(--text);
      }

      main {
        padding: 26px;
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
      }

      h1 {
        margin: 0;
        font-size: 24px;
        letter-spacing: 0;
      }

      .subtitle {
        margin-top: 4px;
        color: var(--muted);
        font-size: 14px;
      }

      .grid {
        display: grid;
        gap: 14px;
      }

      .metrics {
        grid-template-columns: repeat(5, minmax(130px, 1fr));
      }

      .columns {
        display: grid;
        grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.8fr);
        gap: 14px;
      }

      .panel {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 8px;
        overflow: hidden;
      }

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border);
        background: var(--panel-subtle);
      }

      .panel-title {
        font-size: 14px;
        font-weight: 650;
      }

      .metric {
        padding: 14px 16px;
      }

      .metric-label {
        color: var(--muted);
        font-size: 12px;
      }

      .metric-value {
        margin-top: 6px;
        font-size: 22px;
        font-weight: 700;
      }

      .toolbar {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      input,
      select,
      textarea {
        width: 100%;
        border: 1px solid var(--border-strong);
        border-radius: 7px;
        background: #fff;
        padding: 9px 10px;
        color: var(--text);
        outline: none;
      }

      textarea {
        min-height: 94px;
        resize: vertical;
      }

      input:focus,
      select:focus,
      textarea:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(91, 91, 214, 0.12);
      }

      .button {
        border: 1px solid var(--border-strong);
        background: #fff;
        color: var(--text);
        padding: 9px 12px;
        border-radius: 7px;
        cursor: pointer;
        white-space: nowrap;
      }

      .button.primary {
        background: var(--accent);
        border-color: var(--accent);
        color: #fff;
      }

      .button.primary:hover {
        background: var(--accent-dark);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      th,
      td {
        padding: 11px 14px;
        border-bottom: 1px solid var(--border);
        text-align: left;
        vertical-align: top;
      }

      th {
        color: var(--muted);
        font-weight: 600;
        background: #fafafa;
      }

      tr:hover td {
        background: #fbfbff;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 2px 7px;
        color: var(--muted);
        background: #fff;
        font-size: 12px;
      }

      .pill.green {
        border-color: rgba(15, 138, 95, 0.18);
        color: var(--green);
        background: #ecfdf5;
      }

      .pill.amber {
        border-color: rgba(161, 98, 7, 0.2);
        color: var(--amber);
        background: #fffbeb;
      }

      .pill.red {
        border-color: rgba(180, 35, 24, 0.2);
        color: var(--red);
        background: #fef2f2;
      }

      .progress {
        height: 8px;
        border-radius: 999px;
        background: #ececf0;
        overflow: hidden;
      }

      .progress span {
        display: block;
        height: 100%;
        background: var(--accent);
      }

      .stack {
        display: grid;
        gap: 10px;
        padding: 14px;
      }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .full {
        grid-column: 1 / -1;
      }

      label {
        display: grid;
        gap: 5px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 550;
      }

      .empty {
        padding: 24px;
        color: var(--muted);
        text-align: center;
      }

      .message {
        margin-bottom: 14px;
        padding: 10px 12px;
        border-radius: 7px;
        background: #eef2ff;
        color: #3730a3;
        font-size: 13px;
        display: none;
      }

      .message.show {
        display: block;
      }

      .auth {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .auth-card {
        width: min(420px, 100%);
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 22px;
      }

      .workspace-switcher {
        margin: 0 8px 16px;
      }

      .api {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
        white-space: pre-wrap;
        background: #101014;
        color: #f4f4f5;
        padding: 14px;
        border-radius: 8px;
        overflow: auto;
      }

      @media (max-width: 980px) {
        .shell {
          grid-template-columns: 1fr;
        }

        .sidebar {
          border-right: 0;
          border-bottom: 1px solid var(--border);
        }

        .metrics,
        .columns,
        .form-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div id="auth" class="auth" hidden>
      <form id="loginForm" class="auth-card">
        <div class="brand"><span class="mark"></span><span>UserOrbit CRM</span></div>
        <h1>Sign in</h1>
        <p class="subtitle">Enter your self-hosted CRM API token to unlock the workspace.</p>
        <label>API token<input name="token" type="password" autocomplete="current-password" required /></label>
        <button class="button primary" style="width:100%; margin-top:14px">Continue</button>
      </form>
    </div>
    <div id="appShell" class="shell" hidden>
      <aside class="sidebar">
        <div class="brand"><span class="mark"></span><span>UserOrbit CRM</span></div>
        <div class="workspace-switcher">
          <label>Workspace<select id="workspaceSelect"></select></label>
        </div>
        <nav class="nav">
          <button class="active" data-view="dashboard">Dashboard</button>
          <button data-view="accounts">Accounts</button>
          <button data-view="pipeline">Pipeline</button>
          <button data-view="reports">Reports</button>
          <button data-view="sequences">Sequences</button>
          <button data-view="warmup">Warmup</button>
          <button data-view="tasks">Tasks</button>
          <button data-view="api">Agent API</button>
          <button data-view="settings">Settings</button>
        </nav>
      </aside>
      <main>
        <div id="message" class="message"></div>
        <section id="view"></section>
      </main>
    </div>

    <script>
      const state = {
        view: "dashboard",
        token: localStorage.getItem("crmApiToken") || "",
        tenant: null,
        workspaceId: localStorage.getItem("crmWorkspaceId") || "",
        summary: null,
        accounts: [],
        accountFilters: { q: "", segment: "", status: "", customFields: {} },
        savedViews: [],
        customFields: [],
        selectedSavedViewId: localStorage.getItem("crmSavedViewId") || "",
        selectedAccountId: localStorage.getItem("crmSelectedAccountId") || "",
        selectedAccount: null,
        selectedContactId: localStorage.getItem("crmSelectedContactId") || "",
        selectedContact: null,
        reports: null,
        opportunities: [],
        opportunityStages: [],
        accountDuplicates: { domains: [], names: [] },
        sequences: [],
        warmup: null,
        tasks: [],
        workspaceTokens: [],
        teamInvitations: [],
        webhooks: { endpoints: [], deliveries: [] },
        auditLogs: [],
        generatedToken: "",
        generatedInviteToken: "",
      };

      const $ = (selector) => document.querySelector(selector);
      const money = (cents) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((cents || 0) / 100);

      async function api(path, options = {}) {
        const headers = { "content-type": "application/json", ...(options.headers || {}) };
        if (state.token) headers.authorization = "Bearer " + state.token;
        if (state.workspaceId) headers["x-workspace-id"] = state.workspaceId;
        const response = await fetch("/api/" + path, { ...options, headers });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Request failed");
        return data;
      }

      function notice(text) {
        const node = $("#message");
        node.textContent = text;
        node.classList.add("show");
        setTimeout(() => node.classList.remove("show"), 4200);
      }

      async function refresh() {
        const tenant = await api("me");
        if (!state.workspaceId || !tenant.workspaces.some((workspace) => workspace.id === state.workspaceId)) {
          state.workspaceId = tenant.currentWorkspaceId || tenant.workspaces[0]?.id || "";
          localStorage.setItem("crmWorkspaceId", state.workspaceId);
        }
        const accountQuery = accountListQuery();
        const [summary, accounts, savedViews, customFields, reports, opportunities, opportunityStages, accountDuplicates, sequences, warmup, tasks, workspaceTokens, teamInvitations, webhooks, auditLogs] = await Promise.all([
          api("summary"),
          api("accounts" + accountQuery),
          api("saved-views?resource=accounts"),
          api("custom-fields?entity=account"),
          api("reports"),
          api("opportunities"),
          api("opportunity-stages"),
          api("duplicates/accounts"),
          api("sequences"),
          api("warmup"),
          api("tasks"),
          api("workspace-tokens"),
          api("team-invitations"),
          api("webhooks"),
          api("audit-logs"),
        ]);
        Object.assign(state, { tenant, summary, accounts, savedViews, customFields, reports, opportunities, opportunityStages, accountDuplicates, sequences, warmup, tasks, workspaceTokens, teamInvitations, webhooks, auditLogs });
        if (state.view === "account" && state.selectedAccountId) {
          state.selectedAccount = await api("accounts/" + encodeURIComponent(state.selectedAccountId));
        }
        if (state.view === "contact" && state.selectedContactId) {
          state.selectedContact = await api("contacts/" + encodeURIComponent(state.selectedContactId));
        }
        render();
      }

      function render() {
        $("#auth").hidden = true;
        $("#appShell").hidden = false;
        renderWorkspaceSelect();
        document.querySelectorAll(".nav button").forEach((button) => {
          button.classList.toggle("active", button.dataset.view === state.view);
        });
        const views = {
          dashboard: renderDashboard,
          accounts: renderAccounts,
          account: renderAccountDetail,
          contact: renderContactDetail,
          pipeline: renderPipeline,
          reports: renderReports,
          sequences: renderSequences,
          warmup: renderWarmup,
          tasks: renderTasks,
          api: renderApi,
          settings: renderSettings,
        };
        $("#view").innerHTML = views[state.view]();
        bind();
      }

      function renderWorkspaceSelect() {
        const select = $("#workspaceSelect");
        if (!select) return;
        const workspaces = state.tenant?.workspaces || [];
        select.innerHTML = workspaces.map((workspace) => '<option value="' + workspace.id + '">' + escapeHtml(workspace.team_name + " / " + workspace.name) + "</option>").join("");
        select.value = state.workspaceId;
      }

      function header(title, subtitle, action = "") {
        return '<div class="topbar"><div><h1>' + title + '</h1><div class="subtitle">' + subtitle + '</div></div>' + action + '</div>';
      }

      function accountListQuery() {
        const params = new URLSearchParams();
        if (state.selectedSavedViewId) {
          params.set("viewId", state.selectedSavedViewId);
        } else {
          if (state.accountFilters.q) params.set("q", state.accountFilters.q);
          if (state.accountFilters.segment) params.set("segment", state.accountFilters.segment);
          if (state.accountFilters.status) params.set("status", state.accountFilters.status);
          for (const [key, value] of Object.entries(state.accountFilters.customFields || {})) {
            if (value) params.set("cf_" + key, value);
          }
        }
        const query = params.toString();
        return query ? "?" + query : "";
      }

      function renderDashboard() {
        const s = state.summary || {};
        return header("Founder-led outreach", "Manage targeted accounts, personalized sequences, and follow-up tasks.") + \`
          <div class="grid metrics">
            \${metric("Accounts", s.accounts || 0)}
            \${metric("Contacts", s.contacts || 0)}
            \${metric("Active sequences", s.activeEnrollments || 0)}
            \${metric("Open tasks", s.dueTasks || 0)}
            \${metric("Open pipeline", money(s.openPipelineCents || 0))}
          </div>
          <div class="columns" style="margin-top:14px">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Priority accounts</div><button class="button" data-view-target="accounts">Add account</button></div>
              \${accountsTable(state.accounts.slice(0, 8))}
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Due tasks</div><button class="button" data-view-target="tasks">View tasks</button></div>
              \${taskList(state.tasks.slice(0, 6))}
            </div>
          </div>\`;
      }

      function metric(label, value) {
        return '<div class="panel metric"><div class="metric-label">' + label + '</div><div class="metric-value">' + value + '</div></div>';
      }

      function renderAccounts() {
        return header("Accounts", "Target 20-30 high-fit SaaS accounts each week.", '<button id="exportAccounts" class="button">Export CSV</button>') + \`
          <div class="columns">
            <div class="panel">
              <div class="panel-header">
                <div class="panel-title">Account list</div>
                <div class="toolbar">
                  <select id="savedViewSelect">
                    <option value="">Current filters</option>
                    \${state.savedViews.map((view) => '<option value="' + view.id + '">' + escapeHtml(view.name) + '</option>').join("")}
                  </select>
                </div>
              </div>
              <div class="stack" style="border-bottom:1px solid var(--border)">
                <div class="form-grid">
                  <label>Search<input id="accountSearch" placeholder="Search accounts" value="\${escapeHtml(state.accountFilters.q)}" /></label>
                  <label>Segment<select id="accountSegment"><option value="">All segments</option><option value="product">Product</option><option value="growth">Growth</option><option value="success">Success</option></select></label>
                  <label>Status<select id="accountStatus"><option value="">All statuses</option><option value="target">Target</option><option value="researching">Researching</option><option value="contacted">Contacted</option><option value="replied">Replied</option><option value="qualified">Qualified</option><option value="disqualified">Disqualified</option></select></label>
                  \${customFieldFilterInputs()}
                  <label>View name<input id="savedViewName" placeholder="Product targets" /></label>
                </div>
                <div class="toolbar">
                  <button id="applyAccountFilters" class="button primary">Apply filters</button>
                  <button id="clearAccountFilters" class="button">Clear</button>
                  <button id="saveAccountView" class="button">Save view</button>
                  \${state.selectedSavedViewId ? '<button id="deleteAccountView" class="button">Delete view</button>' : ""}
                </div>
              </div>
              \${accountsTable(state.accounts)}
              \${duplicateAccountsPanel()}
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">New account</div></div>
              <form id="accountForm" class="stack">
                <div class="form-grid">
                  <label>Name<input name="name" required placeholder="Acme SaaS" /></label>
                  <label>Domain<input name="domain" placeholder="acme.com" /></label>
                  <label>Segment<select name="segment"><option value="product">Product Managers</option><option value="growth">Growth / Marketing</option><option value="success">Customer Success</option></select></label>
                  <label>Source<input name="source" placeholder="Product Hunt" /></label>
                  <label class="full">Observation<textarea name="observation" placeholder="they launched a new AI onboarding feature last week"></textarea></label>
                  <label>Contact name<input name="contactName" placeholder="Jane Doe" /></label>
                  <label>Email<input name="contactEmail" type="email" placeholder="jane@acme.com" /></label>
                  <label class="full">Title<input name="contactTitle" placeholder="Head of Product" /></label>
                  \${customFieldInputs({ prefix: "cf_", values: {} })}
                </div>
                <button class="button primary">Create account</button>
              </form>
              <form id="importAccountsForm" class="stack" style="border-top:1px solid var(--border)">
                <label>Import CSV<textarea name="csv" placeholder="name,domain,segment,status,contact_name,contact_email&#10;Acme,acme.com,product,target,Jane Doe,jane@acme.com"></textarea></label>
                <button class="button">Import accounts</button>
              </form>
            </div>
          </div>\`;
      }

      function accountsTable(accounts) {
        if (!accounts.length) return '<div class="empty">No accounts yet.</div>';
        return \`<table>
          <thead><tr><th>Account</th><th>Segment</th><th>Status</th><th>Contacts</th><th>Pipeline</th><th></th></tr></thead>
          <tbody>\${accounts.map((a) => \`
            <tr>
              <td><strong>\${escapeHtml(a.name)}</strong><div class="subtitle">\${escapeHtml(a.domain || a.observation || "")}</div></td>
              <td><span class="pill">\${escapeHtml(a.segment)}</span></td>
              <td>\${escapeHtml(a.status)}</td>
              <td>\${a.contacts_count || (a.contacts ? a.contacts.length : 0)}</td>
              <td>\${money(a.pipeline_cents || 0)}</td>
              <td><button class="button" data-account-id="\${escapeHtml(a.id)}">Open</button></td>
            </tr>\`).join("")}</tbody>
        </table>\`;
      }

      function renderAccountDetail() {
        const account = state.selectedAccount;
        if (!account) return header("Account", "Open an account to see its timeline.") + '<div class="panel"><div class="empty">No account selected.</div></div>';
        return header(escapeHtml(account.name), escapeHtml(account.domain || account.observation || ""), '<button class="button" data-view-target="accounts">Back to accounts</button>') + \`
          <div class="grid metrics">
            \${metric("Contacts", account.contacts.length)}
            \${metric("Opportunities", account.opportunities.length)}
            \${metric("Tasks", account.tasks.length)}
            \${metric("Emails", account.emails.length)}
            \${metric("Status", escapeHtml(account.status))}
          </div>
          <div class="columns" style="margin-top:14px">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Timeline</div></div>
              \${timelineList(account.timeline)}
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Contacts</div></div>
              \${customFieldsTable(account.customFields)}
              \${contactsTable(account.contacts)}
              <div class="panel-header"><div class="panel-title">Opportunities</div></div>
              \${reportTable(["Name", "Stage", "Value", "Confidence"], account.opportunities.map((opportunity) => [opportunity.name, opportunity.stage, money(opportunity.value_cents), opportunity.confidence + "%"]))}
            </div>
          </div>
          <div class="columns" style="margin-top:14px">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Tasks</div></div>
              \${reportTable(["Title", "Kind", "Status", "Due"], account.tasks.map((task) => [task.title, task.kind, task.status, task.due_at || ""]))}
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Email activity</div></div>
              \${reportTable(["Subject", "Contact", "Direction", "Status", "When"], account.emails.map((email) => [email.subject, email.contact_name || email.contact_email || "", email.direction || "", email.status, formatDateTime(email.sent_at || email.created_at)]))}
            </div>
          </div>\`;
      }

      function contactsTable(contacts) {
        if (!contacts.length) return '<div class="empty">No contacts yet.</div>';
        return \`<table>
          <thead><tr><th>Name</th><th>Title</th><th>Email</th><th>Status</th><th></th></tr></thead>
          <tbody>\${contacts.map((contact) => \`
            <tr>
              <td>\${escapeHtml(contact.name)}</td>
              <td>\${escapeHtml(contact.title || "")}</td>
              <td>\${escapeHtml(contact.email)}</td>
              <td>\${escapeHtml(contact.status)}</td>
              <td><button class="button" data-contact-id="\${escapeHtml(contact.id)}">Open</button></td>
            </tr>\`).join("")}</tbody>
        </table>\`;
      }

      function renderContactDetail() {
        const contact = state.selectedContact;
        if (!contact) return header("Contact", "Open a contact from an account.") + '<div class="panel"><div class="empty">No contact selected.</div></div>';
        const action = '<div class="toolbar"><button class="button" data-account-id="' + escapeHtml(contact.account_id) + '">Back to account</button>' + (contact.status === "unsubscribed" ? "" : '<button id="markContactReplied" class="button">Mark replied</button><button id="unsubscribeContact" class="button">Unsubscribe</button>') + '</div>';
        return header(escapeHtml(contact.name), escapeHtml([contact.title, contact.email, contact.account_name].filter(Boolean).join(" · ")), action) + \`
          <div class="grid metrics">
            \${metric("Tasks", contact.tasks.length)}
            \${metric("Opportunities", contact.opportunities.length)}
            \${metric("Sequences", contact.enrollments.length)}
            \${metric("Emails", contact.emails.length)}
            \${metric("Status", escapeHtml(contact.status))}
          </div>
          <div class="columns" style="margin-top:14px">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Timeline</div></div>
              \${timelineList(contact.timeline)}
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Sequences</div></div>
              \${reportTable(["Sequence", "Status", "Step", "Next send"], contact.enrollments.map((item) => [item.sequence_name, item.status, item.current_step_order, item.next_send_at || ""]))}
              <div class="panel-header"><div class="panel-title">Opportunities</div></div>
              \${reportTable(["Name", "Stage", "Value", "Confidence"], contact.opportunities.map((opportunity) => [opportunity.name, opportunity.stage, money(opportunity.value_cents), opportunity.confidence + "%"]))}
            </div>
          </div>
          <div class="columns" style="margin-top:14px">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Tasks</div></div>
              \${reportTable(["Title", "Kind", "Status", "Due"], contact.tasks.map((task) => [task.title, task.kind, task.status, task.due_at || ""]))}
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Email activity</div></div>
              \${reportTable(["Subject", "Direction", "Status", "Sequence", "When"], contact.emails.map((email) => [email.subject, email.direction || "", email.status, email.sequence_name || "", formatDateTime(email.sent_at || email.created_at)]))}
            </div>
          </div>\`;
      }

      function customFieldInputs({ prefix, values }) {
        if (!state.customFields.length) return "";
        return state.customFields.map((field) => {
          const value = values[field.key] || "";
          if (field.type === "select") {
            const options = (field.options || []).map((option) => '<option value="' + escapeHtml(option) + '">' + escapeHtml(option) + '</option>').join("");
            return '<label>' + escapeHtml(field.name) + '<select name="' + prefix + escapeHtml(field.key) + '"><option value="">Not set</option>' + options + '</select></label>';
          }
          return '<label>' + escapeHtml(field.name) + '<input name="' + prefix + escapeHtml(field.key) + '" value="' + escapeHtml(value) + '" /></label>';
        }).join("");
      }

      function customFieldsTable(fields) {
        if (!fields?.length) return "";
        return '<div class="stack" style="border-bottom:1px solid var(--border)">' + fields.map((field) => '<div><strong>' + escapeHtml(field.name) + '</strong><div class="subtitle">' + escapeHtml(field.value || "Not set") + '</div></div>').join("") + '</div>';
      }

      function timelineList(items) {
        if (!items.length) return '<div class="empty">No timeline activity yet.</div>';
        return '<div class="stack">' + items.map((item) => \`
          <div style="border-bottom:1px solid var(--border); padding-bottom:10px">
            <span class="pill">\${escapeHtml(item.type)}</span>
            <strong style="display:block; margin-top:6px">\${escapeHtml(item.title)}</strong>
            <div class="subtitle">\${escapeHtml(item.detail || "")}</div>
            <div class="subtitle">\${escapeHtml(formatDateTime(item.happenedAt))}</div>
          </div>\`).join("") + '</div>';
      }

      function renderPipeline() {
        const stages = pipelineStages();
        return header("Pipeline", "Move opportunities through the sales process.") + \`
          <div class="grid" style="grid-template-columns:repeat(\${Math.max(1, stages.length)},minmax(180px,1fr)); align-items:start; overflow:auto">
            \${stages.map((stage) => pipelineColumn(stage, state.opportunities.filter((opportunity) => opportunity.stage === stage))).join("")}
          </div>\`;
      }

      function pipelineColumn(stage, opportunities) {
        const total = opportunities.reduce((sum, opportunity) => sum + Number(opportunity.value_cents || 0), 0);
        const stageConfig = stageByKey(stage);
        return \`<div class="panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">\${escapeHtml(stageConfig?.label || stage)}</div>
              <div class="subtitle">\${opportunities.length} deal(s) · \${money(total)}</div>
            </div>
          </div>
          <div class="stack">
            \${opportunities.map((opportunity) => pipelineCard(opportunity)).join("") || '<div class="empty">No deals.</div>'}
          </div>
        </div>\`;
      }

      function pipelineCard(opportunity) {
        return \`<div style="border:1px solid var(--border); border-radius:8px; padding:10px; background:#fff">
          <strong>\${escapeHtml(opportunity.name)}</strong>
          <div class="subtitle">\${escapeHtml(opportunity.account_name || "")}</div>
          <div class="subtitle">\${money(opportunity.value_cents)} · \${Number(opportunity.confidence || 0)}% confidence</div>
          <label style="margin-top:8px">Stage<select data-opportunity-stage="\${escapeHtml(opportunity.id)}">
            \${pipelineStages().map((stage) => '<option value="' + escapeHtml(stage) + '"' + (stage === opportunity.stage ? " selected" : "") + ">" + escapeHtml(stageByKey(stage)?.label || stage) + "</option>").join("")}
          </select></label>
        </div>\`;
      }

      function renderReports() {
        const reports = state.reports || { pipeline: [], forecast: [], accountStatus: [], taskStatus: [], sequencePerformance: [], activity: {}, stalledOpportunities: [] };
        const pipelineValue = reports.pipeline.reduce((total, row) => total + Number(row.value_cents || 0), 0);
        const forecastValue = reports.forecast.reduce((total, row) => total + Number(row.weighted_value_cents || 0), 0);
        const overdueTasks = reports.taskStatus.reduce((total, row) => total + Number(row.overdue || 0), 0);
        const emails = reports.activity || {};
        return header("Reports", "Track pipeline health, forecast, outbound activity, and stalled deals.") + \`
          <div class="grid metrics">
            \${metric("Pipeline value", money(pipelineValue))}
            \${metric("Weighted forecast", money(forecastValue))}
            \${metric("Emails", emails.emails || 0)}
            \${metric("Sent", emails.sent || 0)}
            \${metric("Drafted", emails.drafted || 0)}
            \${metric("Overdue tasks", overdueTasks)}
          </div>
          <div class="columns" style="margin-top:14px">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Pipeline by stage</div></div>
              \${reportTable(["Stage", "Deals", "Value", "Confidence"], reports.pipeline.map((row) => [row.stage_label || row.stage, row.opportunities, money(row.value_cents), Math.round(row.avg_confidence || 0) + "%"]))}
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Forecast by close month</div></div>
              \${reportTable(["Close month", "Deals", "Value", "Weighted", "Confidence"], reports.forecast.map((row) => [row.period, row.opportunities, money(row.value_cents), money(row.weighted_value_cents), Math.round(row.avg_confidence || 0) + "%"]))}
            </div>
          </div>
          <div class="columns" style="margin-top:14px">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Account status</div></div>
              \${reportTable(["Status", "Accounts"], reports.accountStatus.map((row) => [row.status, row.accounts]))}
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Sequence performance</div></div>
              \${reportTable(["Sequence", "Enrollments", "Sent", "Drafted", "Failed"], reports.sequencePerformance.map((row) => [row.name, row.enrollments || 0, row.sent || 0, row.drafted || 0, row.failed || 0]))}
            </div>
          </div>
          <div class="columns" style="margin-top:14px">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Stalled opportunities</div></div>
              \${reportTable(["Opportunity", "Account", "Stage", "Value", "Last activity"], reports.stalledOpportunities.map((row) => [row.name, row.account_name, row.stage, money(row.value_cents), row.last_activity_at || "No activity"]))}
            </div>
          </div>
          \${customFieldReportPanels(reports.customFieldBreakdowns || [])}\`;
      }

      function reportTable(headers, rows) {
        if (!rows.length) return '<div class="empty">No data yet.</div>';
        return \`<table>
          <thead><tr>\${headers.map((header) => '<th>' + escapeHtml(header) + '</th>').join("")}</tr></thead>
          <tbody>\${rows.map((row) => '<tr>' + row.map((cell) => '<td>' + escapeHtml(cell) + '</td>').join("") + '</tr>').join("")}</tbody>
        </table>\`;
      }

      function renderSequences() {
        return header("Sequences", "Enroll researched contacts into the 4-email UserOrbit sequence.", '<button id="runSequences" class="button primary">Run due sends</button>') + \`
          <div class="columns">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Sequences</div></div>
              \${state.sequences.map((s) => \`
                <div class="stack" style="border-bottom:1px solid var(--border)">
                  <strong>\${escapeHtml(s.name)}</strong>
                  <span class="subtitle">\${escapeHtml(s.description || "")}</span>
                  \${s.steps.map((step) => '<span class="pill">Day +' + step.delay_days + " · " + escapeHtml(step.template_name) + "</span>").join(" ")}
                </div>\`).join("")}
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Enroll contact</div></div>
              <form id="enrollForm" class="stack">
                <label>Sequence<select name="sequenceId">\${state.sequences.map((s) => '<option value="' + s.id + '">' + escapeHtml(s.name) + "</option>").join("")}</select></label>
                <label>Contact ID<input name="contactId" required placeholder="Paste contact id from API response" /></label>
                <button class="button primary">Enroll</button>
              </form>
            </div>
          </div>\`;
      }

      function renderTasks() {
        return header("Tasks", "Track research, Loom teardown, and follow-up work.") + \`
          <div class="columns">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Open work</div></div>
              \${taskList(state.tasks)}
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">New task</div></div>
              <form id="taskForm" class="stack">
                <label>Title<input name="title" required placeholder="Record Loom audit for Acme" /></label>
                <label>Kind<select name="kind"><option>research</option><option>loom</option><option>follow-up</option><option>demo</option></select></label>
                <label>Due at<input name="dueAt" type="datetime-local" /></label>
                <label>Account ID<input name="accountId" /></label>
                <label>Notes<textarea name="notes"></textarea></label>
                <button class="button primary">Create task</button>
              </form>
            </div>
          </div>\`;
      }

      function renderWarmup() {
        const warmup = state.warmup || { mailboxes: [], plans: [], recentMessages: [], summary: {} };
        const summary = warmup.summary || {};
        const activePlan = warmup.plans.find((plan) => plan.status === "active") || warmup.plans[0];
        const progress = activePlan?.progress || 0;
        const failures = warmup.plans.reduce((total, plan) => total + Number(plan.failed_messages || 0), 0);
        return header("Mailbox warmup", "Ramp sender reputation before launching outreach.", '<button id="runWarmup" class="button">Run due</button>') + \`
          <div class="grid metrics">
            \${metric("Mailboxes", summary.mailboxes || 0)}
            \${metric("Sent today", summary.sentToday || 0)}
            \${metric("Scheduled today", summary.scheduledToday || 0)}
            \${metric("Due now", summary.dueNow || 0)}
            \${metric("Progress", progress + "%")}
          </div>
          <div class="columns" style="margin-top:14px">
            <div class="panel">
              <div class="panel-header">
                <div>
                  <div class="panel-title">Warmup plan</div>
                  <div class="subtitle">\${activePlan ? escapeHtml(activePlan.starts_on + " to " + activePlan.ends_on) : "No active plan yet."}</div>
                </div>
                \${activePlan ? statusPill(activePlan.status) : ""}
              </div>
              <div class="stack">
                <div class="progress"><span style="width:\${Math.min(100, progress)}%"></span></div>
                <div class="subtitle">\${failures ? failures + " failed warmup email(s)." : "No warmup failures recorded."}</div>
                \${warmup.mailboxes.map((mailbox) => \`
                  <div>
                    <strong>\${escapeHtml(mailbox.email)}</strong>
                    <div class="subtitle">\${escapeHtml(mailbox.display_name || "Sender mailbox")} · \${escapeHtml(mailbox.smtp_host || "SMTP from env")}</div>
                  </div>\`).join("") || '<div class="empty">Add a sender mailbox to start warmup.</div>'}
              </div>
                \${warmupMessagesTable(warmup.recentMessages)}
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Start warmup</div></div>
              <form id="warmupForm" class="stack">
                <label>Sender email<input name="email" required placeholder="mukesh@userorb.com" value="\${escapeHtml(warmup.mailboxes[0]?.email || "")}" /></label>
                <label>Display name<input name="displayName" placeholder="Mukesh Swamy" value="\${escapeHtml(warmup.mailboxes[0]?.display_name || "")}" /></label>
                <label>Recipients<textarea name="recipients" required placeholder="codejets@gmail.com&#10;uma@userorbit.com">\${escapeHtml((warmup.mailboxes[0]?.recipients || []).map((r) => r.email).join("\\n"))}</textarea></label>
                <div class="form-grid">
                  <label>Start date<input name="startsOn" type="date" required value="\${escapeHtml(defaultWarmupStartDate())}" /></label>
                  <label>Days<input name="days" type="number" min="14" max="45" value="14" /></label>
                  <label>Daily min<input name="dailyMin" type="number" min="1" max="20" value="5" /></label>
                  <label>Daily max<input name="dailyMax" type="number" min="1" max="20" value="10" /></label>
                </div>
                <button class="button primary">Generate plan</button>
              </form>
            </div>
          </div>\`;
      }

      function warmupMessagesTable(messages) {
        if (!messages.length) return '<div class="empty">No warmup messages scheduled.</div>';
        return \`<table>
          <thead><tr><th>Scheduled</th><th>Recipient</th><th>Subject</th><th>Status</th></tr></thead>
          <tbody>\${messages.slice(0, 12).map((message) => \`
            <tr>
              <td>\${escapeHtml(formatDateTime(message.scheduled_for))}</td>
              <td>\${escapeHtml(message.recipient_email || message.to || "")}</td>
              <td>\${escapeHtml(message.subject)}</td>
              <td>\${statusPill(message.status)}</td>
            </tr>\`).join("")}</tbody>
        </table>\`;
      }

      function statusPill(status) {
        const tone = status === "sent" || status === "active" ? "green" : status === "failed" ? "red" : "amber";
        return '<span class="pill ' + tone + '">' + escapeHtml(status || "pending") + '</span>';
      }

      function formatDateTime(value) {
        if (!value) return "";
        return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
      }

      function defaultWarmupStartDate() {
        return new Date().toISOString().slice(0, 10);
      }

      function taskList(tasks) {
        if (!tasks.length) return '<div class="empty">No tasks yet.</div>';
        return \`<table><tbody>\${tasks.map((t) => \`
          <tr>
            <td><strong>\${escapeHtml(t.title)}</strong><div class="subtitle">\${escapeHtml(t.account_name || t.kind || "")}</div></td>
            <td><span class="pill">\${escapeHtml(t.status)}</span></td>
            <td>\${escapeHtml(t.due_at || "")}</td>
          </tr>\`).join("")}</tbody></table>\`;
      }

      function renderApi() {
        return header("Agent API", "Use this token-protected API from a Codex skill, script, or automation.") + \`
          <div class="columns">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Current browser token</div></div>
              <div class="stack">
                <label>Bearer token<input id="tokenInput" value="\${escapeHtml(state.token)}" placeholder="Paste bootstrap or workspace API token" /></label>
                <button id="saveToken" class="button primary">Save token</button>
              </div>
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Command example</div></div>
              <div class="stack">
                <div class="api">POST /api/agent/command
Authorization: Bearer $CRM_API_TOKEN
Content-Type: application/json

{
  "command": "create_account",
  "account": {
    "name": "Acme SaaS",
    "segment": "product",
    "observation": "they launched a billing analytics feature",
    "contacts": [
      { "name": "Jane Doe", "email": "jane@acme.com", "title": "PM" }
    ]
  }
}</div>
              </div>
            </div>
          </div>\`;
      }

      function renderSettings() {
        const tenant = state.tenant || { user: {}, teams: [], workspaces: [] };
        return header("Settings", "Manage teams, workspaces, and agent access tokens.") + \`
          <div class="columns">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Organization</div></div>
              <div class="stack">
                <div><strong>\${escapeHtml(tenant.user?.name || "User")}</strong><div class="subtitle">\${escapeHtml(tenant.user?.email || "")}</div></div>
                <table>
                  <thead><tr><th>Team</th><th>Role</th></tr></thead>
                  <tbody>\${tenant.teams.map((team) => '<tr><td>' + escapeHtml(team.name) + '</td><td><span class="pill">' + escapeHtml(team.role) + '</span></td></tr>').join("")}</tbody>
                </table>
                <table>
                  <thead><tr><th>Workspace</th><th>Team</th></tr></thead>
                  <tbody>\${tenant.workspaces.map((workspace) => '<tr><td>' + escapeHtml(workspace.name) + '</td><td>' + escapeHtml(workspace.team_name) + '</td></tr>').join("")}</tbody>
                </table>
                <div class="panel-header"><div class="panel-title">Workspace tokens</div></div>
                \${workspaceTokensTable(state.workspaceTokens)}
                <div class="panel-header"><div class="panel-title">Team invitations</div></div>
                \${teamInvitationsTable(state.teamInvitations)}
                <div class="panel-header"><div class="panel-title">Webhooks</div></div>
                \${webhooksTable(state.webhooks)}
                <div class="panel-header"><div class="panel-title">Audit log</div></div>
                \${auditLogsTable(state.auditLogs)}
              </div>
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Create</div></div>
              <div class="stack">
                <form id="teamForm" class="stack" style="padding:0">
                  <label>Team name<input name="name" required placeholder="Acme GTM" /></label>
                  <label>Default workspace<input name="defaultWorkspaceName" placeholder="Outbound" /></label>
                  <button class="button primary">Create team</button>
                </form>
                <form id="workspaceForm" class="stack" style="padding:0; border-top:1px solid var(--border); padding-top:10px">
                  <label>Team<select name="teamId">\${tenant.teams.map((team) => '<option value="' + team.id + '">' + escapeHtml(team.name) + "</option>").join("")}</select></label>
                  <label>Workspace name<input name="name" required placeholder="Expansion" /></label>
                  <button class="button primary">Create workspace</button>
                </form>
                <form id="tokenForm" class="stack" style="padding:0; border-top:1px solid var(--border); padding-top:10px">
                  <label>Token name<input name="name" required placeholder="Codex agent" /></label>
                  <button class="button primary">Create workspace token</button>
                </form>
                <form id="inviteForm" class="stack" style="padding:0; border-top:1px solid var(--border); padding-top:10px">
                  <label>Email<input name="email" type="email" required placeholder="teammate@company.com" /></label>
                  <label>Name<input name="name" placeholder="Teammate" /></label>
                  <label>Role<select name="role"><option value="member">Member</option><option value="admin">Admin</option></select></label>
                  <button class="button primary">Create invite</button>
                </form>
                <form id="webhookForm" class="stack" style="padding:0; border-top:1px solid var(--border); padding-top:10px">
                  <label>Name<input name="name" required placeholder="Zapier catch hook" /></label>
                  <label>URL<input name="url" type="url" required placeholder="https://hooks.example.com/userorbit" /></label>
                  <label>Events<textarea name="events" placeholder="account.created&#10;contact.created&#10;task.created&#10;email.created"></textarea></label>
                  <button class="button primary">Create webhook</button>
                </form>
                <form id="customFieldForm" class="stack" style="padding:0; border-top:1px solid var(--border); padding-top:10px">
                  <label>Field name<input name="name" required placeholder="Company size" /></label>
                  <label>Type<select name="type"><option value="text">Text</option><option value="number">Number</option><option value="date">Date</option><option value="select">Select</option><option value="url">URL</option></select></label>
                  <label>Options<textarea name="options" placeholder="One option per line for select fields"></textarea></label>
                  <button class="button primary">Create account field</button>
                </form>
                <form id="stageForm" class="stack" style="padding:0; border-top:1px solid var(--border); padding-top:10px">
                  <label>Stage label<input name="label" required placeholder="Security review" /></label>
                  <label>Position<input name="position" type="number" min="1" step="1" placeholder="70" /></label>
                  <label><input name="isWon" type="checkbox" /> Closed won</label>
                  <label><input name="isLost" type="checkbox" /> Closed lost</label>
                  <button class="button primary">Create pipeline stage</button>
                </form>
                \${state.customFields.length ? '<div class="panel-header"><div class="panel-title">Account fields</div></div>' + reportTable(["Name", "Key", "Type"], state.customFields.map((field) => [field.name, field.key, field.type])) : ""}
                \${state.opportunityStages.length ? '<div class="panel-header"><div class="panel-title">Pipeline stages</div></div>' + reportTable(["Label", "Key", "Position"], state.opportunityStages.map((stage) => [stage.label, stage.key, stage.position])) : ""}
                \${state.generatedToken ? '<div class="api">' + escapeHtml(state.generatedToken) + '</div>' : ""}
                \${state.generatedInviteToken ? '<div class="api">' + escapeHtml(state.generatedInviteToken) + '</div>' : ""}
              </div>
            </div>
          </div>\`;
      }

      function workspaceTokensTable(tokens) {
        if (!tokens.length) return '<div class="empty">No workspace tokens yet.</div>';
        return \`<table>
          <thead><tr><th>Name</th><th>Created by</th><th>Last used</th><th>Status</th><th></th></tr></thead>
          <tbody>\${tokens.map((token) => \`
            <tr>
              <td>\${escapeHtml(token.name)}</td>
              <td>\${escapeHtml(token.created_by_name || "")}</td>
              <td>\${escapeHtml(token.last_used_at || "Never")}</td>
              <td>\${token.revoked_at ? '<span class="pill red">revoked</span>' : '<span class="pill green">active</span>'}</td>
              <td>\${token.revoked_at ? "" : '<button class="button" data-revoke-token-id="' + escapeHtml(token.id) + '">Revoke</button>'}</td>
            </tr>\`).join("")}</tbody>
        </table>\`;
      }

      function teamInvitationsTable(invitations) {
        if (!invitations.length) return '<div class="empty">No team invitations yet.</div>';
        return \`<table>
          <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Last used</th></tr></thead>
          <tbody>\${invitations.map((invite) => \`
            <tr>
              <td>\${escapeHtml(invite.email)}</td>
              <td><span class="pill">\${escapeHtml(invite.role)}</span></td>
              <td>\${invite.accepted_at ? '<span class="pill green">accepted</span>' : '<span class="pill amber">pending</span>'}</td>
              <td>\${escapeHtml(invite.last_used_at || "Never")}</td>
            </tr>\`).join("")}</tbody>
        </table>\`;
      }

      function webhooksTable(webhooks) {
        const endpoints = webhooks?.endpoints || [];
        const deliveries = webhooks?.deliveries || [];
        const endpointTable = endpoints.length ? \`<table>
          <thead><tr><th>Name</th><th>Events</th><th>Status</th><th></th></tr></thead>
          <tbody>\${endpoints.map((endpoint) => \`
            <tr>
              <td>\${escapeHtml(endpoint.name)}<div class="subtitle">\${escapeHtml(endpoint.url)}</div></td>
              <td>\${escapeHtml((endpoint.events || []).join(", ") || "all")}</td>
              <td><span class="pill">\${escapeHtml(endpoint.status)}</span></td>
              <td>\${endpoint.status === "active" ? '<button class="button" data-disable-webhook-id="' + escapeHtml(endpoint.id) + '">Disable</button>' : ""}</td>
            </tr>\`).join("")}</tbody>
        </table>\` : '<div class="empty">No webhooks yet.</div>';
        const deliveryTable = deliveries.length ? '<div class="panel-header"><div class="panel-title">Webhook deliveries</div></div>' + reportTable(["Event", "Endpoint", "Status", "Code"], deliveries.slice(0, 8).map((delivery) => [delivery.event, delivery.endpoint_name, delivery.status, delivery.status_code || delivery.error || ""])) : "";
        return endpointTable + deliveryTable;
      }

      function auditLogsTable(logs) {
        if (!logs.length) return '<div class="empty">No audit events yet.</div>';
        return \`<table>
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Resource</th></tr></thead>
          <tbody>\${logs.slice(0, 12).map((log) => \`
            <tr>
              <td>\${escapeHtml(formatDateTime(log.created_at))}</td>
              <td>\${escapeHtml(log.user_name || log.user_email || "")}</td>
              <td>\${escapeHtml(log.action)}</td>
              <td>\${escapeHtml(log.resource)}</td>
            </tr>\`).join("")}</tbody>
        </table>\`;
      }

      function bind() {
        if ($("#savedViewSelect")) $("#savedViewSelect").value = state.selectedSavedViewId;
        if ($("#accountSegment")) $("#accountSegment").value = state.accountFilters.segment;
        if ($("#accountStatus")) $("#accountStatus").value = state.accountFilters.status;
        for (const [key, value] of Object.entries(state.accountFilters.customFields || {})) {
          const input = document.querySelector('[data-account-custom-filter="' + CSS.escape(key) + '"]');
          if (input) input.value = value;
        }

        document.querySelectorAll("[data-view-target]").forEach((node) => node.addEventListener("click", () => {
          state.view = node.dataset.viewTarget;
          render();
        }));

        document.querySelectorAll("[data-account-id]").forEach((node) => node.addEventListener("click", async () => {
          state.selectedAccountId = node.dataset.accountId;
          localStorage.setItem("crmSelectedAccountId", state.selectedAccountId);
          state.selectedAccount = await api("accounts/" + encodeURIComponent(state.selectedAccountId));
          state.view = "account";
          render();
        }));

        document.querySelectorAll("[data-contact-id]").forEach((node) => node.addEventListener("click", async () => {
          state.selectedContactId = node.dataset.contactId;
          localStorage.setItem("crmSelectedContactId", state.selectedContactId);
          state.selectedContact = await api("contacts/" + encodeURIComponent(state.selectedContactId));
          state.view = "contact";
          render();
        }));

        $("#unsubscribeContact")?.addEventListener("click", async () => {
          await api("contacts/" + encodeURIComponent(state.selectedContactId) + "/unsubscribe", { method: "POST", body: "{}" });
          notice("Contact unsubscribed.");
          await refresh();
        });

        $("#markContactReplied")?.addEventListener("click", async () => {
          await api("contacts/" + encodeURIComponent(state.selectedContactId) + "/reply", { method: "POST", body: "{}" });
          notice("Contact marked replied.");
          await refresh();
        });

        document.querySelectorAll("[data-opportunity-stage]").forEach((node) => node.addEventListener("change", async () => {
          await api("opportunities/" + encodeURIComponent(node.dataset.opportunityStage), {
            method: "PATCH",
            body: JSON.stringify({ stage: node.value }),
          });
          notice("Opportunity moved.");
          await refresh();
        }));

        $("#accountForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const contactName = form.get("contactName");
          const contactEmail = form.get("contactEmail");
          const payload = {
            name: form.get("name"),
            domain: form.get("domain"),
            segment: form.get("segment"),
            source: form.get("source"),
            observation: form.get("observation"),
            customFields: customFieldsFromForm(form, "cf_"),
            contacts: contactName && contactEmail ? [{ name: contactName, email: contactEmail, title: form.get("contactTitle") }] : [],
          };
          await api("accounts", { method: "POST", body: JSON.stringify(payload) });
          notice("Account created.");
          await refresh();
        });

        $("#importAccountsForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const csv = new FormData(event.currentTarget).get("csv");
          const result = await api("import/accounts.csv", { method: "POST", headers: { "content-type": "text/csv" }, body: csv });
          notice("Imported " + result.imported + " account(s), matched " + (result.matched || 0) + ", " + result.failed + " failed.");
          await refresh();
        });

        $("#savedViewSelect")?.addEventListener("change", async (event) => {
          state.selectedSavedViewId = event.currentTarget.value;
          localStorage.setItem("crmSavedViewId", state.selectedSavedViewId);
          const view = state.savedViews.find((item) => item.id === state.selectedSavedViewId);
          if (view?.filters) state.accountFilters = { q: view.filters.q || "", segment: view.filters.segment || "", status: view.filters.status || "", customFields: view.filters.customFields || {} };
          await refresh();
        });

        $("#applyAccountFilters")?.addEventListener("click", async () => {
          state.selectedSavedViewId = "";
          localStorage.removeItem("crmSavedViewId");
          state.accountFilters = {
            q: $("#accountSearch").value.trim(),
            segment: $("#accountSegment").value,
            status: $("#accountStatus").value,
            customFields: accountCustomFiltersFromInputs(),
          };
          await refresh();
        });

        $("#clearAccountFilters")?.addEventListener("click", async () => {
          state.selectedSavedViewId = "";
          localStorage.removeItem("crmSavedViewId");
          state.accountFilters = { q: "", segment: "", status: "", customFields: {} };
          await refresh();
        });

        $("#saveAccountView")?.addEventListener("click", async () => {
          const name = $("#savedViewName").value.trim();
          if (!name) return notice("Name the view first.");
          const filters = {
            q: $("#accountSearch").value.trim(),
            segment: $("#accountSegment").value,
            status: $("#accountStatus").value,
            customFields: accountCustomFiltersFromInputs(),
          };
          const view = await api("saved-views", { method: "POST", body: JSON.stringify({ name, resource: "accounts", filters }) });
          state.selectedSavedViewId = view.id;
          localStorage.setItem("crmSavedViewId", view.id);
          state.accountFilters = filters;
          notice("Saved view created.");
          await refresh();
        });

        $("#deleteAccountView")?.addEventListener("click", async () => {
          if (!state.selectedSavedViewId) return;
          await api("saved-views/" + encodeURIComponent(state.selectedSavedViewId), { method: "DELETE" });
          state.selectedSavedViewId = "";
          localStorage.removeItem("crmSavedViewId");
          notice("Saved view deleted.");
          await refresh();
        });

        $("#taskForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await api("tasks", { method: "POST", body: JSON.stringify(Object.fromEntries(form.entries())) });
          notice("Task created.");
          await refresh();
        });

        $("#enrollForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await api("enrollments", { method: "POST", body: JSON.stringify(Object.fromEntries(form.entries())) });
          notice("Contact enrolled.");
          await refresh();
        });

        $("#warmupForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const mailbox = await api("warmup/mailboxes", {
            method: "POST",
            body: JSON.stringify({
              email: form.get("email"),
              displayName: form.get("displayName"),
              recipients: String(form.get("recipients") || "").split(/\\n|,/).map((email) => email.trim()).filter(Boolean),
            }),
          });
          await api("warmup/plans", {
            method: "POST",
            body: JSON.stringify({
              mailboxId: mailbox.id,
              startsOn: form.get("startsOn"),
              durationDays: Number(form.get("days") || 14),
              dailyMin: Number(form.get("dailyMin") || 5),
              dailyMax: Number(form.get("dailyMax") || 10),
            }),
          });
          notice("Warmup plan created.");
          await refresh();
        });

        $("#runWarmup")?.addEventListener("click", async () => {
          const result = await api("warmup/run", { method: "POST", body: JSON.stringify({ limit: 1 }) });
          notice("Sent " + result.processed + " warmup email(s).");
          await refresh();
        });

        $("#runSequences")?.addEventListener("click", async () => {
          const result = await api("sequence/run", { method: "POST", body: "{}" });
          notice("Processed " + result.processed + " due sequence email(s).");
          await refresh();
        });

        $("#saveToken")?.addEventListener("click", () => {
          state.token = $("#tokenInput").value.trim();
          localStorage.setItem("crmApiToken", state.token);
          notice("Token saved locally.");
        });

        $("#workspaceSelect")?.addEventListener("change", async (event) => {
          state.workspaceId = event.currentTarget.value;
          localStorage.setItem("crmWorkspaceId", state.workspaceId);
          await refresh();
        });

        $("#exportAccounts")?.addEventListener("click", async () => {
          const headers = {};
          if (state.token) headers.authorization = "Bearer " + state.token;
          if (state.workspaceId) headers["x-workspace-id"] = state.workspaceId;
          const response = await fetch("/api/export/accounts.csv", { headers });
          if (!response.ok) throw new Error("Export failed");
          const blob = await response.blob();
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "userorbit-accounts.csv";
          link.click();
          URL.revokeObjectURL(link.href);
        });

        $("#teamForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const created = await api("teams", { method: "POST", body: JSON.stringify(Object.fromEntries(form.entries())) });
          state.workspaceId = created.defaultWorkspace.id;
          localStorage.setItem("crmWorkspaceId", state.workspaceId);
          notice("Team created.");
          await refresh();
        });

        $("#workspaceForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const workspace = await api("workspaces", { method: "POST", body: JSON.stringify(Object.fromEntries(form.entries())) });
          state.workspaceId = workspace.id;
          localStorage.setItem("crmWorkspaceId", state.workspaceId);
          notice("Workspace created.");
          await refresh();
        });

        $("#tokenForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const created = await api("workspace-tokens", { method: "POST", body: JSON.stringify(Object.fromEntries(form.entries())) });
          state.generatedToken = created.token;
          notice("Workspace token created.");
          await refresh();
        });

        $("#inviteForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const invite = await api("team-invitations", { method: "POST", body: JSON.stringify(Object.fromEntries(form.entries())) });
          state.generatedInviteToken = invite.token;
          notice("Team invite created.");
          await refresh();
        });

        $("#webhookForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await api("webhooks", {
            method: "POST",
            body: JSON.stringify({
              name: form.get("name"),
              url: form.get("url"),
              events: String(form.get("events") || "").split(/\\n|,/).map((event) => event.trim()).filter(Boolean),
            }),
          });
          notice("Webhook created.");
          await refresh();
        });

        document.querySelectorAll("[data-disable-webhook-id]").forEach((node) => node.addEventListener("click", async () => {
          await api("webhooks/" + encodeURIComponent(node.dataset.disableWebhookId), { method: "DELETE" });
          notice("Webhook disabled.");
          await refresh();
        }));

        document.querySelectorAll("[data-merge-source-account]").forEach((node) => node.addEventListener("click", async () => {
          await api("accounts/" + encodeURIComponent(node.dataset.mergeTargetAccount) + "/merge", {
            method: "POST",
            body: JSON.stringify({ sourceAccountId: node.dataset.mergeSourceAccount }),
          });
          notice("Accounts merged.");
          await refresh();
        }));

        document.querySelectorAll("[data-revoke-token-id]").forEach((node) => node.addEventListener("click", async () => {
          await api("workspace-tokens/" + encodeURIComponent(node.dataset.revokeTokenId), { method: "DELETE" });
          notice("Workspace token revoked.");
          await refresh();
        }));

        $("#customFieldForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await api("custom-fields", {
            method: "POST",
            body: JSON.stringify({
              entity: "account",
              name: form.get("name"),
              type: form.get("type"),
              options: String(form.get("options") || "").split(/\\n|,/).map((option) => option.trim()).filter(Boolean),
            }),
          });
          notice("Custom field created.");
          await refresh();
        });

        $("#stageForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await api("opportunity-stages", {
            method: "POST",
            body: JSON.stringify({
              label: form.get("label"),
              position: form.get("position") || undefined,
              isWon: form.get("isWon") === "on",
              isLost: form.get("isLost") === "on",
            }),
          });
          notice("Pipeline stage created.");
          await refresh();
        });
      }

      function customFieldsFromForm(form, prefix) {
        const values = {};
        for (const field of state.customFields) {
          const value = form.get(prefix + field.key);
          if (value !== null && String(value).trim()) values[field.key] = value;
        }
        return values;
      }

      function accountCustomFiltersFromInputs() {
        const values = {};
        document.querySelectorAll("[data-account-custom-filter]").forEach((input) => {
          const value = input.value.trim();
          if (value) values[input.dataset.accountCustomFilter] = value;
        });
        return values;
      }

      function customFieldFilterInputs() {
        if (!state.customFields.length) return "";
        return state.customFields.map((field) => {
          const value = state.accountFilters.customFields?.[field.key] || "";
          const name = 'data-account-custom-filter="' + escapeHtml(field.key) + '"';
          if (field.type === "select" && field.options?.length) {
            return '<label>' + escapeHtml(field.name) + '<select ' + name + '><option value="">Any</option>' + field.options.map((option) => '<option value="' + escapeHtml(option) + '"' + (option === value ? " selected" : "") + '>' + escapeHtml(option) + '</option>').join("") + '</select></label>';
          }
          return '<label>' + escapeHtml(field.name) + '<input ' + name + ' value="' + escapeHtml(value) + '" placeholder="Any" /></label>';
        }).join("");
      }

      function customFieldReportPanels(breakdowns) {
        if (!breakdowns.length) return "";
        return '<div class="columns" style="margin-top:14px">' + breakdowns.slice(0, 2).map((field) => '<div class="panel"><div class="panel-header"><div class="panel-title">' + escapeHtml(field.name) + '</div></div>' + reportTable(["Value", "Accounts"], field.values.map((row) => [row.value, row.accounts])) + '</div>').join("") + '</div>';
      }

      function duplicateAccountsPanel() {
        const duplicates = state.accountDuplicates || { domains: [], names: [] };
        const rows = [
          ...duplicates.domains.map((item) => ["Domain", item.key, item.accounts, duplicateMergeActions(item)]),
          ...duplicates.names.map((item) => ["Name", item.key, item.accounts, duplicateMergeActions(item)]),
        ];
        if (!rows.length) return "";
        return '<div class="stack" style="border-top:1px solid var(--border)"><div class="panel-header"><div class="panel-title">Duplicate watchlist</div></div><table><thead><tr><th>Match</th><th>Key</th><th>Accounts</th><th>Merge</th></tr></thead><tbody>' +
          rows.slice(0, 8).map((row) => '<tr><td>' + escapeHtml(row[0]) + '</td><td>' + escapeHtml(row[1]) + '</td><td>' + escapeHtml(row[2]) + '</td><td>' + row[3] + '</td></tr>').join("") +
          '</tbody></table></div>';
      }

      function duplicateMergeActions(group) {
        const target = group.items?.[0];
        if (!target) return escapeHtml(group.names || "");
        const actions = (group.items || []).slice(1).map((item) => '<button class="button" data-merge-source-account="' + escapeHtml(item.id) + '" data-merge-target-account="' + escapeHtml(target.id) + '">Merge ' + escapeHtml(item.name) + ' into ' + escapeHtml(target.name) + '</button>');
        return '<div class="stack" style="padding:0">' + actions.join("") + '</div>';
      }

      function pipelineStages() {
        return (state.opportunityStages.length ? state.opportunityStages : [
          { key: "research", label: "Research" },
          { key: "conversation", label: "Conversation" },
          { key: "demo", label: "Demo" },
          { key: "proposal", label: "Proposal" },
          { key: "won", label: "Won" },
          { key: "lost", label: "Lost" },
        ]).map((stage) => stage.key);
      }

      function stageByKey(key) {
        return state.opportunityStages.find((stage) => stage.key === key);
      }

      function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
      }

      $("#loginForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        state.token = new FormData(event.currentTarget).get("token").trim();
        localStorage.setItem("crmApiToken", state.token);
        await refresh().catch(showAuth);
      });

      document.querySelectorAll(".nav button").forEach((button) => {
        button.addEventListener("click", () => {
          state.view = button.dataset.view;
          render();
        });
      });

      function showAuth(error) {
        $("#appShell").hidden = true;
        $("#auth").hidden = false;
        if (error?.message && error.message !== "Unauthorized") {
          $("#loginForm .subtitle").textContent = error.message;
        }
      }

      if (state.token) {
        refresh().catch(showAuth);
      } else {
        showAuth();
      }
    </script>
  </body>
</html>`.replaceAll("\\`", "`").replaceAll("\\${", "${");
