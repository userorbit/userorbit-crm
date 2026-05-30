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
        --sidebar-width: 240px;
        --navbar-height: 56px;
        --bg-main: #fcfcfc;
        --bg-primary: #ffffff;
        --bg-secondary: #fcfcfc;
        --bg-tertiary: #f5f5f5;
        --bg-quaternary: #f0f0f0;
        --bg-button: #ffffff;
        --bg-primary-action: #171717;
        --bg-primary-action-hover: #313131;
        --text-primary: #171717;
        --text-secondary: #525252;
        --text-tertiary: #737373;
        --text-quaternary: #a3a3a3;
        --text-primary-action: #ffffff;
        --border-primary: rgba(0, 0, 0, 0.1);
        --border-primary-opaque: #e5e5e5;
        --border-secondary: rgba(0, 0, 0, 0.07);
        --border-tertiary: rgba(0, 0, 0, 0.04);
        --brand-primary: #ff591e;
        --brand-secondary: #fb432c;
        --blue: #2563eb;
        --green: #16a34a;
        --amber: #d97706;
        --red: #dc2626;
        --bg: var(--bg-main);
        --panel: var(--bg-primary);
        --panel-subtle: var(--bg-secondary);
        --text: var(--text-primary);
        --muted: var(--text-tertiary);
        --border: var(--border-primary);
        --border-strong: var(--border-primary-opaque);
        --accent: var(--brand-primary);
        --accent-dark: var(--brand-secondary);
        --base-shadow-color: rgb(0 0 0 / 0.05);
        --button-shadow: 0px 1px 1px -1px rgb(0 0 0 / 0.08), 0px 2px 2px -1px rgb(0 0 0 / 0.08), 0px 0px 0px 1px rgb(0 0 0 / 0.06), inset 0px 1px 0px #fff, inset 0px 1px 2px 1px #fff, inset 0px 1px 2px rgb(0 0 0 / 0.06);
        --panel-shadow: 0px 3px 6px -3px var(--base-shadow-color), 0px 2px 4px -2px var(--base-shadow-color), 0px 1px 2px -1px var(--base-shadow-color), 0px 1px 1px -1px var(--base-shadow-color);
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      [hidden] {
        display: none !important;
      }

      body {
        margin: 0;
        background: var(--bg-main);
        color: var(--text-primary);
        font-size: 14px;
        line-height: 1.45;
        -webkit-font-smoothing: antialiased;
      }

      button,
      input,
      select,
      textarea {
        font: inherit;
      }

      .shell {
        display: grid;
        grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
        min-height: 100vh;
        background: var(--bg-main);
      }

      .sidebar {
        position: sticky;
        top: 0;
        height: 100vh;
        border-right: 1px solid var(--border-primary);
        background: var(--bg-secondary);
        padding: 10px 8px;
        overflow-y: auto;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 40px;
        padding: 3px 6px 12px;
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 650;
      }

      .mark {
        width: 28px;
        height: 28px;
        flex: 0 0 auto;
        border-radius: 8px;
        background: linear-gradient(135deg, var(--brand-secondary), var(--brand-primary));
        box-shadow: inset 0 0.5px 0 rgba(255, 255, 255, 0.32);
      }

      .nav {
        display: grid;
        gap: 4px;
      }

      .nav button {
        border: 0;
        background: transparent;
        color: var(--text-tertiary);
        text-align: left;
        min-height: 30px;
        padding: 6px 8px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 550;
        line-height: 18px;
      }

      .nav button.active,
      .nav button:hover {
        background: var(--bg-quaternary);
        color: var(--text-primary);
      }

      main {
        min-width: 0;
        padding: 0;
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        min-height: var(--navbar-height);
        margin: 0;
        padding: 0 20px;
        border-bottom: 1px solid var(--border-primary);
        background: var(--bg-primary);
      }

      h1 {
        margin: 0;
        font-size: 15px;
        line-height: 20px;
        font-weight: 700;
        letter-spacing: 0;
      }

      .subtitle {
        margin-top: 4px;
        color: var(--text-tertiary);
        font-size: 13px;
        line-height: 18px;
      }

      #view > .grid,
      #view > .columns {
        margin: 16px;
      }

      #view > .grid[style*="overflow:auto"] {
        padding-bottom: 4px;
      }

      .grid {
        display: grid;
        gap: 12px;
      }

      .metrics {
        grid-template-columns: repeat(5, minmax(130px, 1fr));
      }

      .columns {
        display: grid;
        grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.8fr);
        gap: 12px;
      }

      .panel {
        background: var(--bg-primary);
        border: 1px solid var(--border-primary);
        border-radius: 10px;
        box-shadow: var(--panel-shadow);
        overflow: hidden;
      }

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 42px;
        padding: 9px 12px;
        border-bottom: 1px solid var(--border-secondary);
        background: var(--bg-primary);
      }

      .panel-title {
        font-size: 14px;
        line-height: 18px;
        font-weight: 700;
      }

      .metric {
        padding: 12px;
      }

      .metric-label {
        color: var(--text-tertiary);
        font-size: 12px;
        font-weight: 550;
      }

      .metric-value {
        margin-top: 6px;
        font-size: 22px;
        line-height: 28px;
        font-weight: 750;
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
        border: 1px solid var(--border-primary);
        border-radius: 6px;
        background: var(--bg-primary);
        padding: 7px 9px;
        color: var(--text-primary);
        outline: none;
        font-size: 14px;
        line-height: 20px;
        box-shadow: inset 0 1px 1px rgb(0 0 0 / 0.03);
      }

      textarea {
        min-height: 94px;
        resize: vertical;
      }

      input:focus,
      select:focus,
      textarea:focus {
        border-color: var(--blue);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
      }

      .button {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 30px;
        border: 0;
        background: var(--bg-button);
        color: var(--text-primary);
        padding: 6px 10px;
        border-radius: 6px;
        cursor: pointer;
        white-space: nowrap;
        font-size: 14px;
        font-weight: 600;
        line-height: 18px;
        box-shadow: var(--button-shadow);
      }

      .button.primary {
        background: var(--bg-primary-action);
        color: var(--text-primary-action);
        box-shadow: 0px 0px 0px 1px rgb(0 0 0 / 0.06), 0px 1px 1px -1px rgb(0 0 0 / 0.08), inset 0px 1px 0px rgb(255 255 255 / 0.12);
      }

      .button.primary:hover {
        background: var(--bg-primary-action-hover);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      th,
      td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--border-secondary);
        text-align: left;
        vertical-align: top;
      }

      th {
        color: var(--text-tertiary);
        font-size: 12px;
        font-weight: 650;
        background: var(--bg-secondary);
      }

      tr:hover td {
        background: var(--bg-secondary);
      }

      .pill {
        display: inline-flex;
        align-items: center;
        border: 1px solid var(--border-secondary);
        border-radius: 999px;
        padding: 1px 7px;
        color: var(--text-tertiary);
        background: var(--bg-tertiary);
        font-size: 12px;
        font-weight: 550;
        line-height: 18px;
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
        height: 7px;
        border-radius: 999px;
        background: var(--bg-quaternary);
        overflow: hidden;
      }

      .progress span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, var(--brand-secondary), var(--brand-primary));
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
        color: var(--text-tertiary);
        font-size: 12px;
        font-weight: 600;
      }

      .empty {
        padding: 24px;
        color: var(--text-tertiary);
        text-align: center;
      }

      .message {
        position: fixed;
        left: calc(var(--sidebar-width) + 16px);
        bottom: 16px;
        z-index: 20;
        padding: 8px 10px;
        border: 1px solid var(--border-primary);
        border-radius: 8px;
        background: var(--bg-primary);
        color: var(--text-primary);
        box-shadow: var(--panel-shadow);
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
        background: var(--bg-main);
      }

      .auth-card {
        width: min(420px, 100%);
        background: var(--bg-primary);
        border: 1px solid var(--border-primary);
        border-radius: 12px;
        padding: 20px;
        box-shadow: var(--panel-shadow);
      }

      .workspace-switcher {
        margin: 0 8px 16px;
      }

      .pipeline-card {
        border: 1px solid var(--border-secondary);
        border-radius: 8px;
        padding: 10px;
        background: var(--bg-primary);
        box-shadow: var(--panel-shadow);
      }

      .api {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
        white-space: pre-wrap;
        background: #171717;
        color: #f5f5f5;
        padding: 14px;
        border-radius: 8px;
        overflow: auto;
      }

      @media (max-width: 980px) {
        .shell {
          grid-template-columns: 1fr;
        }

        .sidebar {
          position: static;
          height: auto;
          border-right: 0;
          border-bottom: 1px solid var(--border-primary);
        }

        .metrics,
        .columns,
        .form-grid {
          grid-template-columns: 1fr;
        }

        .message {
          left: 16px;
        }

        table {
          display: block;
          max-width: 100%;
          overflow-x: auto;
          white-space: nowrap;
        }
      }
    </style>
  </head>
  <body>
    <div id="auth" class="auth" hidden>
      <form id="loginForm" class="auth-card">
        <div class="brand"><span class="mark"></span><span>UserOrbit CRM</span></div>
        <h1>Sign in</h1>
        <p class="subtitle">Sign in with your user password, or paste a bootstrap/invitation token for setup.</p>
        <label>Email<input name="email" type="email" autocomplete="username" placeholder="admin@localhost" /></label>
        <label>Password<input name="password" type="password" autocomplete="current-password" /></label>
        <label>API token<input name="token" type="password" autocomplete="off" placeholder="Optional setup token" /></label>
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
          <button data-view="communications">Comms</button>
          <button data-view="calendar">Calendar</button>
          <button data-view="forms">Forms</button>
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
        token: storageGet("crmApiToken") || "",
        tenant: null,
        workspaceId: storageGet("crmWorkspaceId") || "",
        summary: null,
        accounts: [],
        accountFilters: { q: "", segment: "", status: "", customFields: {} },
        savedViews: [],
        customFields: [],
        selectedSavedViewId: storageGet("crmSavedViewId") || "",
        selectedAccountId: storageGet("crmSelectedAccountId") || "",
        selectedAccount: null,
        selectedContactId: storageGet("crmSelectedContactId") || "",
        selectedContact: null,
        reports: null,
        opportunities: [],
        opportunityStages: [],
        accountDuplicates: { domains: [], names: [] },
        sequences: [],
        warmup: null,
        tasks: [],
        communications: [],
        calendarEvents: [],
        leadForms: [],
        emailSettings: { open_tracking_enabled: 0, click_tracking_enabled: 0 },
        workspaceTokens: [],
        teamInvitations: [],
        webhooks: { endpoints: [], deliveries: [] },
        auditLogs: [],
        generatedToken: "",
        generatedInviteToken: "",
      };

      const $ = (selector) => document.querySelector(selector);
      const money = (cents) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((cents || 0) / 100);

      function storageGet(key) {
        try {
          return window.localStorage?.getItem(key) || "";
        } catch {
          return "";
        }
      }

      function storageSet(key, value) {
        try {
          window.localStorage?.setItem(key, value);
        } catch {}
      }

      function storageRemove(key) {
        try {
          window.localStorage?.removeItem(key);
        } catch {}
      }

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
          storageSet("crmWorkspaceId", state.workspaceId);
        }
        const canManage = canManageCurrentWorkspace(tenant, state.workspaceId);
        const accountQuery = accountListQuery();
        const [summary, accounts, savedViews, customFields, reports, opportunities, opportunityStages, accountDuplicates, sequences, warmup, tasks, communications, calendarEvents, emailSettings, leadForms, workspaceTokens, teamInvitations, webhooks, auditLogs] = await Promise.all([
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
          api("communications"),
          api("calendar/events"),
          api("email/settings"),
          canManage ? api("lead-forms") : Promise.resolve([]),
          canManage ? api("workspace-tokens") : Promise.resolve([]),
          canManage ? api("team-invitations") : Promise.resolve([]),
          canManage ? api("webhooks") : Promise.resolve({ endpoints: [], deliveries: [] }),
          canManage ? api("audit-logs") : Promise.resolve([]),
        ]);
        Object.assign(state, { tenant, summary, accounts, savedViews, customFields, reports, opportunities, opportunityStages, accountDuplicates, sequences, warmup, tasks, communications, calendarEvents, emailSettings, leadForms, workspaceTokens, teamInvitations, webhooks, auditLogs });
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
          communications: renderCommunications,
          calendar: renderCalendar,
          forms: renderForms,
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

      function canManageCurrentWorkspace(tenant = state.tenant, workspaceId = state.workspaceId) {
        const workspace = tenant?.workspaces?.find((item) => item.id === workspaceId);
        return ["owner", "admin"].includes(workspace?.workspace_role);
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

      function percent(value, total) {
        const denominator = Number(total || 0);
        if (!denominator) return "0%";
        return Math.round((Number(value || 0) / denominator) * 100) + "%";
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
                <details>
                  <summary>Map columns</summary>
                  <div class="form-grid" style="margin-top:10px">
                    <label>Account name<input name="map_name" placeholder="Company Name" /></label>
                    <label>Domain<input name="map_domain" placeholder="Website" /></label>
                    <label>Segment<input name="map_segment" placeholder="Segment" /></label>
                    <label>Status<input name="map_status" placeholder="Status" /></label>
                    <label>Source<input name="map_source" placeholder="Source" /></label>
                    <label>Owner<input name="map_owner" placeholder="Owner" /></label>
                    <label>Observation<input name="map_observation" placeholder="Notes" /></label>
                    <label>Contact name<input name="map_contactName" placeholder="Full Name" /></label>
                    <label>Contact email<input name="map_contactEmail" placeholder="Email Address" /></label>
                    <label>Contact title<input name="map_contactTitle" placeholder="Job Title" /></label>
                    \${importCustomFieldMappingInputs()}
                  </div>
                </details>
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
            \${metric("Opens", account.emails.reduce((total, email) => total + Number(email.open_count || 0), 0))}
            \${metric("Clicks", account.emails.reduce((total, email) => total + Number(email.click_count || 0), 0))}
            \${metric("Comms", account.communications.length)}
            \${metric("Meetings", account.calendarEvents.length)}
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
              \${emailActivityTable(account.emails, true)}
              <div class="panel-header"><div class="panel-title">Communication activity</div></div>
              \${communicationTable(account.communications)}
              <div class="panel-header"><div class="panel-title">Calendar activity</div></div>
              \${calendarTable(account.calendarEvents)}
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
            \${metric("Opens", contact.emails.reduce((total, email) => total + Number(email.open_count || 0), 0))}
            \${metric("Clicks", contact.emails.reduce((total, email) => total + Number(email.click_count || 0), 0))}
            \${metric("Comms", contact.communications.length)}
            \${metric("Meetings", contact.calendarEvents.length)}
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
              \${emailActivityTable(contact.emails)}
              <div class="panel-header"><div class="panel-title">Communication activity</div></div>
              \${communicationTable(contact.communications)}
              <div class="panel-header"><div class="panel-title">Calendar activity</div></div>
              \${calendarTable(contact.calendarEvents)}
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
        return \`<div class="pipeline-card">
          <strong>\${escapeHtml(opportunity.name)}</strong>
          <div class="subtitle">\${escapeHtml(opportunity.account_name || "")}</div>
          <div class="subtitle">\${money(opportunity.value_cents)} · \${Number(opportunity.confidence || 0)}% confidence</div>
          <label style="margin-top:8px">Stage<select data-opportunity-stage="\${escapeHtml(opportunity.id)}">
            \${pipelineStages().map((stage) => '<option value="' + escapeHtml(stage) + '"' + (stage === opportunity.stage ? " selected" : "") + ">" + escapeHtml(stageByKey(stage)?.label || stage) + "</option>").join("")}
          </select></label>
        </div>\`;
      }

      function renderReports() {
        const reports = state.reports || { pipeline: [], forecast: [], accountStatus: [], taskStatus: [], sequencePerformance: [], activity: {}, stalledOpportunities: [], ownerPerformance: [], sourceConversion: [] };
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
            \${metric("Opens", emails.opens || 0)}
            \${metric("Clicks", emails.clicks || 0)}
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
              \${reportTable(["Sequence", "Enrollments", "Sent", "Opened", "Clicked", "Failed"], reports.sequencePerformance.map((row) => [row.name, row.enrollments || 0, row.sent || 0, row.opened || 0, row.clicked || 0, row.failed || 0]))}
            </div>
          </div>
          <div class="columns" style="margin-top:14px">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Owner performance</div></div>
              \${reportTable(["Owner", "Accounts", "Contacts", "Emails", "Open pipeline", "Won", "Open tasks"], reports.ownerPerformance.map((row) => [row.owner, row.accounts || 0, row.contacts || 0, row.emails || 0, money(row.open_pipeline_cents || 0), money(row.won_value_cents || 0), row.open_tasks || 0]))}
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Source conversion</div></div>
              \${reportTable(["Source", "Accounts", "Contacted", "Replied", "Qualified", "Won", "Won value"], reports.sourceConversion.map((row) => [row.source, row.accounts || 0, percent(row.contacted_accounts, row.accounts), percent(row.replied_accounts, row.accounts), percent(row.qualified_accounts, row.accounts), row.won_opportunities || 0, money(row.won_value_cents || 0)]))}
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

      function emailActivityTable(emails, includeContact = false) {
        const headers = includeContact ? ["Subject", "Contact", "Status", "Opens", "Clicks", "Last engagement"] : ["Subject", "Status", "Sequence", "Opens", "Clicks", "Last engagement"];
        return reportTable(headers, emails.map((email) => {
          const engagementAt = email.last_clicked_at || email.last_opened_at || "";
          const base = [
            email.subject,
            includeContact ? (email.contact_name || email.contact_email || "") : email.status,
            includeContact ? email.status : (email.sequence_name || ""),
            email.open_count || 0,
            email.click_count || 0,
            engagementAt ? formatDateTime(engagementAt) : formatDateTime(email.sent_at || email.created_at),
          ];
          return base;
        }));
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

      function renderCommunications() {
        return header("Communications", "Log calls, meetings, messages, and notes against accounts and contacts.") + \`
          <div class="columns">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Recent activity</div></div>
              \${communicationTable(state.communications)}
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Log activity</div></div>
              <form id="communicationForm" class="stack">
                <div class="form-grid">
                  <label>Type<select name="type"><option value="call">Call</option><option value="meeting">Meeting</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="note">Note</option></select></label>
                  <label>Direction<select name="direction"><option value="">Not set</option><option value="outbound">Outbound</option><option value="inbound">Inbound</option><option value="internal">Internal</option></select></label>
                  <label>Outcome<select name="outcome"><option value="">Not set</option><option value="connected">Connected</option><option value="left_message">Left message</option><option value="no_answer">No answer</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="positive">Positive</option><option value="negative">Negative</option><option value="neutral">Neutral</option></select></label>
                  <label>Occurred at<input name="occurredAt" type="datetime-local" /></label>
                  <label>Account<select name="accountId" required>\${state.accounts.map((account) => '<option value="' + escapeHtml(account.id) + '">' + escapeHtml(account.name) + '</option>').join("")}</select></label>
                  <label>Contact ID<input name="contactId" placeholder="Optional contact id" /></label>
                  <label class="full">Subject<input name="subject" required placeholder="Discovery call with Jane" /></label>
                  <label class="full">Notes<textarea name="body" placeholder="What happened, objections, follow-up, next step"></textarea></label>
                </div>
                <button class="button primary">Log activity</button>
              </form>
            </div>
          </div>\`;
      }

      function renderCalendar() {
        return header("Calendar", "Capture meetings from manual entry or ICS calendar exports.") + \`
          <div class="columns">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Recent meetings</div></div>
              \${calendarTable(state.calendarEvents)}
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Add meeting</div></div>
              <form id="calendarEventForm" class="stack">
                <div class="form-grid">
                  <label>Account<select name="accountId" required>\${state.accounts.map((account) => '<option value="' + escapeHtml(account.id) + '">' + escapeHtml(account.name) + '</option>').join("")}</select></label>
                  <label>Contact ID<input name="contactId" placeholder="Optional contact id" /></label>
                  <label class="full">Title<input name="title" required placeholder="Discovery meeting" /></label>
                  <label>Starts at<input name="startsAt" type="datetime-local" required /></label>
                  <label>Ends at<input name="endsAt" type="datetime-local" /></label>
                  <label>Location<input name="location" placeholder="Zoom / Office" /></label>
                  <label>Meeting URL<input name="meetingUrl" placeholder="https://meet.example.com/..." /></label>
                  <label class="full">Attendees<textarea name="attendeeEmails" placeholder="jane@example.com&#10;alex@example.com"></textarea></label>
                  <label class="full">Description<textarea name="description" placeholder="Agenda, notes, next steps"></textarea></label>
                </div>
                <button class="button primary">Add meeting</button>
              </form>
              <form id="calendarIcsForm" class="stack" style="border-top:1px solid var(--border)">
                <label>Account<select name="accountId" required>\${state.accounts.map((account) => '<option value="' + escapeHtml(account.id) + '">' + escapeHtml(account.name) + '</option>').join("")}</select></label>
                <label>Contact ID<input name="contactId" placeholder="Optional contact id" /></label>
                <label>ICS data<textarea name="ics" required placeholder="BEGIN:VCALENDAR&#10;BEGIN:VEVENT&#10;SUMMARY:Discovery meeting&#10;..."></textarea></label>
                <button class="button primary">Import ICS</button>
              </form>
            </div>
          </div>\`;
      }

      function renderForms() {
        const canManage = canManageCurrentWorkspace();
        if (!canManage) return header("Forms", "Capture inbound leads from public forms.") + '<div class="panel"><div class="empty">Only workspace owners and admins can manage lead forms.</div></div>';
        return header("Forms", "Create public lead capture forms that route submissions into this workspace.") + \`
          <div class="columns">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Lead forms</div></div>
              \${leadFormsTable(state.leadForms)}
            </div>
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Create form</div></div>
              <form id="leadFormCreate" class="stack">
                <div class="form-grid">
                  <label>Name<input name="name" required placeholder="Website demo request" /></label>
                  <label>Source<input name="source" placeholder="Website form" /></label>
                  <label>Default owner<input name="defaultOwner" placeholder="Sales" /></label>
                  <label>Segment<select name="defaultSegment"><option value="growth">Growth</option><option value="product">Product</option><option value="success">Success</option></select></label>
                  <label>Status<select name="defaultStatus"><option value="target">Target</option><option value="researching">Researching</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option></select></label>
                </div>
                <button class="button primary">Create form</button>
              </form>
            </div>
          </div>\`;
      }

      function leadFormsTable(forms) {
        if (!forms.length) return '<div class="empty">No lead forms yet.</div>';
        return \`<table>
          <thead><tr><th>Name</th><th>URL</th><th>Defaults</th><th>Submissions</th><th></th></tr></thead>
          <tbody>\${forms.map((form) => {
            const url = location.origin + "/forms/" + encodeURIComponent(form.public_key);
            return \`<tr>
              <td>\${escapeHtml(form.name)}<div class="subtitle">\${escapeHtml(form.status)}</div></td>
              <td><a href="\${escapeHtml(url)}" target="_blank" rel="noreferrer">\${escapeHtml(url)}</a></td>
              <td>\${escapeHtml([form.source, form.default_segment, form.default_status].filter(Boolean).join(" / "))}</td>
              <td>\${escapeHtml(form.submissions || 0)}</td>
              <td>\${form.status === "active" ? '<button class="button" data-disable-lead-form-id="' + escapeHtml(form.id) + '">Disable</button>' : ""}</td>
            </tr>\`;
          }).join("")}</tbody>
        </table>\`;
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

      function communicationTable(items) {
        if (!items?.length) return '<div class="empty">No communication activity yet.</div>';
        return reportTable(["When", "Type", "Subject", "Account", "Contact", "Outcome"], items.map((item) => [
          formatDateTime(item.occurred_at || item.created_at),
          item.type,
          item.subject,
          item.account_name || "",
          item.contact_name || item.contact_email || "",
          [item.direction, item.outcome].filter(Boolean).join(" / "),
        ]));
      }

      function calendarTable(items) {
        if (!items?.length) return '<div class="empty">No calendar activity yet.</div>';
        return reportTable(["Starts", "Title", "Account", "Contact", "Location"], items.map((item) => [
          formatDateTime(item.starts_at),
          item.title,
          item.account_name || "",
          item.contact_name || item.contact_email || "",
          item.meeting_url || item.location || "",
        ]));
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
        const canManage = canManageCurrentWorkspace(tenant, state.workspaceId);
        return header("Settings", "Manage teams, workspaces, and agent access tokens.") + \`
          <div class="columns">
            <div class="panel">
              <div class="panel-header"><div class="panel-title">Organization</div></div>
              <div class="stack">
                <div><strong>\${escapeHtml(tenant.user?.name || "User")}</strong><div class="subtitle">\${escapeHtml(tenant.user?.email || "")}</div></div>
                <form id="passwordForm" class="stack" style="padding:0">
                  <label>Set password<input name="password" type="password" autocomplete="new-password" minlength="12" required placeholder="At least 12 characters" /></label>
                  <button class="button">Update password</button>
                </form>
                <table>
                  <thead><tr><th>Team</th><th>Role</th></tr></thead>
                  <tbody>\${tenant.teams.map((team) => '<tr><td>' + escapeHtml(team.name) + '</td><td><span class="pill">' + escapeHtml(team.role) + '</span></td></tr>').join("")}</tbody>
                </table>
                <table>
                  <thead><tr><th>Workspace</th><th>Team</th><th>Role</th></tr></thead>
                  <tbody>\${tenant.workspaces.map((workspace) => '<tr><td>' + escapeHtml(workspace.name) + '</td><td>' + escapeHtml(workspace.team_name) + '</td><td><span class="pill">' + escapeHtml(workspace.workspace_role || "") + '</span></td></tr>').join("")}</tbody>
                </table>
                \${canManage ? '<div class="panel-header"><div class="panel-title">Workspace tokens</div></div>' + workspaceTokensTable(state.workspaceTokens) : ""}
                \${canManage ? '<div class="panel-header"><div class="panel-title">Team invitations</div></div>' + teamInvitationsTable(state.teamInvitations) : ""}
                \${canManage ? '<div class="panel-header"><div class="panel-title">Webhooks</div></div>' + webhooksTable(state.webhooks) : ""}
                \${canManage ? '<div class="panel-header"><div class="panel-title">Audit log</div></div>' + auditLogsTable(state.auditLogs) : ""}
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
                \${canManage ? \`<form id="tokenForm" class="stack" style="padding:0; border-top:1px solid var(--border); padding-top:10px">
                  <label>Token name<input name="name" required placeholder="Codex agent" /></label>
                  <button class="button primary">Create workspace token</button>
                </form>
                <form id="inviteForm" class="stack" style="padding:0; border-top:1px solid var(--border); padding-top:10px">
                  <label>Email<input name="email" type="email" required placeholder="teammate@company.com" /></label>
                  <label>Name<input name="name" placeholder="Teammate" /></label>
                  <label>Role<select name="role"><option value="member">Member</option><option value="viewer">Viewer</option><option value="admin">Admin</option></select></label>
                  <button class="button primary">Create invite</button>
                </form>
                <form id="webhookForm" class="stack" style="padding:0; border-top:1px solid var(--border); padding-top:10px">
                  <label>Name<input name="name" required placeholder="Zapier catch hook" /></label>
                  <label>URL<input name="url" type="url" required placeholder="https://hooks.example.com/userorbit" /></label>
                  <label>Events<textarea name="events" placeholder="account.created&#10;contact.created&#10;task.created&#10;communication.created&#10;email.created"></textarea></label>
                  <button class="button primary">Create webhook</button>
                </form>
                <form id="emailSettingsForm" class="stack" style="padding:0; border-top:1px solid var(--border); padding-top:10px">
                  <label><input name="openTrackingEnabled" type="checkbox" \${state.emailSettings.open_tracking_enabled ? "checked" : ""} /> Track email opens</label>
                  <label><input name="clickTrackingEnabled" type="checkbox" \${state.emailSettings.click_tracking_enabled ? "checked" : ""} /> Track link clicks</label>
                  <button class="button primary">Save email settings</button>
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
                </form>\` : ""}
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
          storageSet("crmSelectedAccountId", state.selectedAccountId);
          state.selectedAccount = await api("accounts/" + encodeURIComponent(state.selectedAccountId));
          state.view = "account";
          render();
        }));

        document.querySelectorAll("[data-contact-id]").forEach((node) => node.addEventListener("click", async () => {
          state.selectedContactId = node.dataset.contactId;
          storageSet("crmSelectedContactId", state.selectedContactId);
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
          const form = new FormData(event.currentTarget);
          const csv = form.get("csv");
          const mapping = importMappingFromForm(form);
          const hasMapping = Object.keys(mapping).some((key) => key !== "customFields") || Object.keys(mapping.customFields || {}).length;
          const result = hasMapping
            ? await api("import/accounts.csv", { method: "POST", body: JSON.stringify({ csv, mapping }) })
            : await api("import/accounts.csv", { method: "POST", headers: { "content-type": "text/csv" }, body: csv });
          notice("Imported " + result.imported + " account(s), matched " + (result.matched || 0) + ", " + result.failed + " failed.");
          await refresh();
        });

        $("#savedViewSelect")?.addEventListener("change", async (event) => {
          state.selectedSavedViewId = event.currentTarget.value;
          storageSet("crmSavedViewId", state.selectedSavedViewId);
          const view = state.savedViews.find((item) => item.id === state.selectedSavedViewId);
          if (view?.filters) state.accountFilters = { q: view.filters.q || "", segment: view.filters.segment || "", status: view.filters.status || "", customFields: view.filters.customFields || {} };
          await refresh();
        });

        $("#applyAccountFilters")?.addEventListener("click", async () => {
          state.selectedSavedViewId = "";
          storageRemove("crmSavedViewId");
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
          storageRemove("crmSavedViewId");
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
          storageSet("crmSavedViewId", view.id);
          state.accountFilters = filters;
          notice("Saved view created.");
          await refresh();
        });

        $("#deleteAccountView")?.addEventListener("click", async () => {
          if (!state.selectedSavedViewId) return;
          await api("saved-views/" + encodeURIComponent(state.selectedSavedViewId), { method: "DELETE" });
          state.selectedSavedViewId = "";
          storageRemove("crmSavedViewId");
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

        $("#communicationForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await api("communications", {
            method: "POST",
            body: JSON.stringify({
              type: form.get("type"),
              direction: form.get("direction") || undefined,
              outcome: form.get("outcome") || undefined,
              occurredAt: form.get("occurredAt") || undefined,
              accountId: form.get("accountId"),
              contactId: form.get("contactId") || undefined,
              subject: form.get("subject"),
              body: form.get("body"),
            }),
          });
          notice("Communication logged.");
          await refresh();
        });

        $("#calendarEventForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await api("calendar/events", {
            method: "POST",
            body: JSON.stringify({
              accountId: form.get("accountId"),
              contactId: form.get("contactId") || undefined,
              title: form.get("title"),
              startsAt: form.get("startsAt"),
              endsAt: form.get("endsAt") || undefined,
              location: form.get("location") || undefined,
              meetingUrl: form.get("meetingUrl") || undefined,
              attendeeEmails: String(form.get("attendeeEmails") || "").split(/\\n|,/).map((email) => email.trim()).filter(Boolean),
              description: form.get("description") || undefined,
            }),
          });
          notice("Calendar event added.");
          await refresh();
        });

        $("#calendarIcsForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const result = await api("calendar/import.ics", {
            method: "POST",
            body: JSON.stringify({
              accountId: form.get("accountId"),
              contactId: form.get("contactId") || undefined,
              ics: form.get("ics"),
            }),
          });
          notice("Imported " + result.imported + " calendar event(s).");
          await refresh();
        });

        $("#leadFormCreate")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await api("lead-forms", {
            method: "POST",
            body: JSON.stringify({
              name: form.get("name"),
              source: form.get("source") || undefined,
              defaultOwner: form.get("defaultOwner") || undefined,
              defaultSegment: form.get("defaultSegment"),
              defaultStatus: form.get("defaultStatus"),
            }),
          });
          notice("Lead form created.");
          await refresh();
        });

        document.querySelectorAll("[data-disable-lead-form-id]").forEach((node) => node.addEventListener("click", async () => {
          await api("lead-forms/" + encodeURIComponent(node.dataset.disableLeadFormId), { method: "DELETE" });
          notice("Lead form disabled.");
          await refresh();
        }));

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
          storageSet("crmApiToken", state.token);
          notice("Token saved locally.");
        });

        $("#workspaceSelect")?.addEventListener("change", async (event) => {
          state.workspaceId = event.currentTarget.value;
          storageSet("crmWorkspaceId", state.workspaceId);
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
          storageSet("crmWorkspaceId", state.workspaceId);
          notice("Team created.");
          await refresh();
        });

        $("#workspaceForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const workspace = await api("workspaces", { method: "POST", body: JSON.stringify(Object.fromEntries(form.entries())) });
          state.workspaceId = workspace.id;
          storageSet("crmWorkspaceId", state.workspaceId);
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

        $("#emailSettingsForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await api("email/settings", {
            method: "PATCH",
            body: JSON.stringify({
              openTrackingEnabled: form.get("openTrackingEnabled") === "on",
              clickTrackingEnabled: form.get("clickTrackingEnabled") === "on",
            }),
          });
          notice("Email settings saved.");
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

        $("#passwordForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await api("auth/password", { method: "POST", body: JSON.stringify({ password: form.get("password") }) });
          event.currentTarget.reset();
          notice("Password updated.");
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

      function importCustomFieldMappingInputs() {
        if (!state.customFields.length) return "";
        return state.customFields.map((field) => '<label>' + escapeHtml(field.name) + ' column<input name="map_cf_' + escapeHtml(field.key) + '" placeholder="' + escapeHtml(field.name) + '" /></label>').join("");
      }

      function importMappingFromForm(form) {
        const mapping = { customFields: {} };
        ["name", "domain", "segment", "status", "source", "owner", "observation", "contactName", "contactEmail", "contactTitle"].forEach((field) => {
          const value = String(form.get("map_" + field) || "").trim();
          if (value) mapping[field] = value;
        });
        for (const field of state.customFields) {
          const value = String(form.get("map_cf_" + field.key) || "").trim();
          if (value) mapping.customFields[field.key] = value;
        }
        return mapping;
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
        try {
          const form = new FormData(event.currentTarget);
          const token = form.get("token").trim();
          if (token) {
            state.token = token;
          } else {
            const session = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
            }).then(async (response) => {
              const data = await response.json();
              if (!response.ok) throw new Error(data.error || "Sign in failed");
              return data;
            });
            state.token = session.token;
          }
          storageSet("crmApiToken", state.token);
          await refresh().catch(showAuth);
        } catch (error) {
          showAuth(error);
        }
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
