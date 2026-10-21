export const crmUiClientScript = String.raw`
const editorLabels = {
  accounts: "New company",
  tasks: "Create task",
  communications: "Log activity",
  calendar: "Add meeting",
  forms: "Create form",
  sequences: "Manage sequence",
  warmup: "Set up warmup",
};
const formLabels = {
  accountForm: "Company details",
  importAccountsForm: "Import companies",
  taskForm: "Task details",
  communicationForm: "Log activity",
  providerMessageForm: "Send message",
  providerCallForm: "Start a call",
  dialerSessionForm: "Call queue",
  calendarEventForm: "Meeting details",
  calendarIcsForm: "Import calendar",
  calendarSourceForm: "Calendar feed",
  calendarOAuthForm: "Connect calendar",
  leadFormCreate: "Form details",
  sequenceStepTemplateForm: "Step templates",
  enrollForm: "Enroll a contact",
  warmupForm: "Warmup plan",
  passwordForm: "Password",
  notificationPreferencesForm: "Notifications",
  teamForm: "Create team",
  workspaceForm: "Create workspace",
  tokenForm: "Workspace API token",
  inviteForm: "Invite teammate",
  webhookForm: "New webhook",
  exportScheduleForm: "Scheduled export",
  reportAlertForm: "Report alert",
  dashboardShareForm: "Shared dashboard",
  integrationForm: "Connect integration",
  enrichmentProviderForm: "Enrichment provider",
  nativeImportSourceForm: "CRM import",
  messageChannelForm: "Messaging channel",
  emailSettingsForm: "Sending preferences",
  emailTemplateForm: "Email template",
  emailTemplatePreviewForm: "Preview template",
  emailSenderForm: "Email sender",
  emailInboundSourceForm: "Inbound source",
  emailSyncSourceForm: "Mailbox sync",
  customFieldForm: "Custom field",
  stageForm: "Pipeline stage",
};
let editorReturnFocus = null;
function currentMigrationRole() {
  return state.tenant?.workspaces?.find((item) => item.id === state.workspaceId)
    ?.migration_role;
}
function editorAction() {
  if (
    !editorLabels[state.view] ||
    !canWriteCurrentWorkspace() ||
    (currentMigrationRole() === "ic" &&
      ["sequences", "warmup"].includes(state.view))
  )
    return "";
  return (
    '<button class="button primary" type="button" data-open-editor>' +
    uiIcon("plus") +
    editorLabels[state.view] +
    "</button>"
  );
}
function closeEditor() {
  const overlay = document.querySelector(".crm-editor-overlay:not([hidden])");
  if (!overlay) return;
  window.CrmControls?.close(false);
  overlay.hidden = true;
  document.body.style.overflow = "";
  if (editorReturnFocus?.isConnected) editorReturnFocus.focus();
}
function openEditor(tab) {
  const overlay = document.querySelector(".crm-editor-overlay");
  if (!overlay) return;
  editorReturnFocus = document.activeElement;
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  if (tab)
    overlay
      .querySelector('[data-editor-tab="' + CSS.escape(tab) + '"]')
      ?.click();
  requestAnimationFrame(() => {
    const field =
      overlay.querySelector(
        "section:not([hidden]) input:not(.crm-control-backing),section:not([hidden]) .crm-control-trigger,section:not([hidden]) textarea",
      ) || overlay.querySelector(".crm-editor-header button");
    field?.focus();
  });
}
function mountEditor() {
  if (!editorLabels[state.view]) return;
  if (!canWriteCurrentWorkspace()) {
    for (const panel of document.querySelectorAll(
      "#view > .columns > .panel",
    )) {
      for (const form of panel.querySelectorAll("form")) form.remove();
      const content = [...panel.children].filter(
        (node) =>
          !node.classList.contains("panel-header") && node.textContent.trim(),
      );
      if (!content.length) {
        const parent = panel.parentElement;
        panel.remove();
        if (parent.children.length === 1) parent.classList.add("single-column");
      }
    }
    return;
  }
  const panels = [
    ...document.querySelectorAll("#view > .columns > .panel"),
  ].filter((panel) => panel.querySelector("form"));
  if (!panels.length) return;
  const groups = [];
  let formIndex = 0;
  for (const panel of panels) {
    const forms = [...panel.querySelectorAll("form")];
    for (const form of forms) {
      if (form.closest("#dialerNext")) continue;
      if (!form.id) {
        const base = "editor-" + state.view + "-" + ++formIndex;
        let id = base;
        while (document.getElementById(id)) id = base + "-" + ++formIndex;
        form.id = id;
      }
      const section = document.createElement("section");
      section.className = "crm-editor-group";
      section.dataset.editorGroup = form.id;
      const heading = document.createElement("h3");
      heading.textContent =
        formLabels[form.id] ||
        form.querySelector("button[type=submit],button:not([type])")
          ?.textContent ||
        "Details";
      heading.className = "visually-hidden";
      section.append(heading, form);
      groups.push({
        id: form.id,
        label: formLabels[form.id] || heading.textContent,
        section,
      });
    }
    const context = [...panel.children].filter(
      (node) =>
        !node.classList.contains("panel-header") &&
        (node.textContent.trim() ||
          node.querySelector("table,form,input,button,[id]")),
    );
    if (!context.length) {
      const parent = panel.parentElement;
      panel.remove();
      if (parent && parent.querySelectorAll(":scope > .panel").length === 1)
        parent.classList.add("single-column");
    } else {
      panel.classList.add("editor-context-panel");
      for (const heading of [
        ...panel.querySelectorAll(":scope > .panel-header"),
      ]) {
        let next = heading.nextElementSibling;
        if (!next || next.classList.contains("panel-header")) heading.remove();
      }
    }
  }
  if (!groups.length) return;
  const preferred = {
    communications: "communicationForm",
    sequences: "enrollForm",
  }[state.view];
  if (preferred)
    groups.sort((a, b) =>
      a.id === preferred ? -1 : b.id === preferred ? 1 : 0,
    );
  const overlay = document.createElement("div");
  overlay.className = "crm-editor-overlay";
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="crm-editor" role="dialog" aria-modal="true" aria-labelledby="editor-heading"><div class="crm-editor-header"><h2 id="editor-heading">' +
    editorLabels[state.view] +
    '</h2><button type="button" class="icon-button" data-close-editor aria-label="Close dialog">' +
    uiIcon("close") +
    '</button></div><div class="crm-editor-tabs" role="tablist" aria-label="Available actions"></div><div class="crm-editor-body"></div><div class="editor-footer-note">Changes are saved only when you submit the form.</div></div>';
  const tabs = overlay.querySelector(".crm-editor-tabs"),
    body = overlay.querySelector(".crm-editor-body");
  groups.forEach((group, index) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.role = "tab";
    tab.textContent = group.label;
    tab.dataset.editorTab = group.id;
    tab.id = "editor-tab-" + index;
    tab.setAttribute("aria-selected", String(index === 0));
    tab.setAttribute("aria-controls", "editor-panel-" + index);
    tab.tabIndex = index === 0 ? 0 : -1;
    group.section.id = "editor-panel-" + index;
    group.section.role = "tabpanel";
    group.section.setAttribute("aria-labelledby", tab.id);
    group.section.hidden = index !== 0;
    tab.addEventListener("click", () => {
      groups.forEach((item, i) => {
        item.section.hidden = i !== index;
        const button = tabs.children[i];
        button.setAttribute("aria-selected", String(i === index));
        button.tabIndex = i === index ? 0 : -1;
      });
      window.CrmControls?.sync();
    });
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
        return;
      event.preventDefault();
      const indexNext =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? groups.length - 1
            : (index + (event.key === "ArrowRight" ? 1 : -1) + groups.length) %
              groups.length;
      tabs.children[indexNext].click();
      tabs.children[indexNext].focus();
    });
    tabs.append(tab);
    body.append(group.section);
  });
  tabs.hidden = groups.length === 1;
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target.closest("[data-close-editor]"))
      closeEditor();
  });
  document.querySelector("#view").append(overlay);
}
function mountSettings() {
  const original = document.querySelector("#view > .columns");
  if (!original) return;
  const forms = [...original.querySelectorAll("form")];
  const formCategories = {
    profile: ["passwordForm", "notificationPreferencesForm"],
    team: ["teamForm", "workspaceForm", "inviteForm"],
    access: ["tokenForm"],
    email: [
      "emailSettingsForm",
      "emailTemplateForm",
      "emailTemplatePreviewForm",
      "emailSenderForm",
      "emailInboundSourceForm",
      "emailSyncSourceForm",
    ],
    channels: ["messageChannelForm"],
    integrations: [
      "integrationForm",
      "enrichmentProviderForm",
      "nativeImportSourceForm",
      "webhookForm",
    ],
    reporting: ["exportScheduleForm", "reportAlertForm", "dashboardShareForm"],
    fields: ["customFieldForm", "stageForm"],
  };
  const definitions = [
    ["profile", "Profile & preferences", "users"],
    ["team", "Team & workspaces", "building"],
    ["access", "API access", "shield"],
    ["email", "Email setup", "mail"],
    ["channels", "Calls & messages", "phone"],
    ["integrations", "Integrations", "network"],
    ["reporting", "Reports & delivery", "chart"],
    ["fields", "Fields & pipeline", "list"],
    ["audit", "Activity log", "clock"],
  ];
  const tableCategories = {
    Organization: "team",
    "Workspace tokens": "access",
    "Team invitations": "team",
    "Email templates": "email",
    "Email senders": "email",
    "Email inbound sources": "email",
    "Email sync sources": "email",
    "Message channels": "channels",
    Integrations: "integrations",
    "Enrichment providers": "integrations",
    "Native imports": "integrations",
    "Scheduled exports": "reporting",
    "Report alerts": "reporting",
    "Dashboard shares": "reporting",
    Webhooks: "integrations",
    "Audit log": "audit",
    "Account fields": "fields",
    "Pipeline stages": "fields",
  };
  const groups = [];
  for (const container of original.querySelectorAll(
    ":scope > .panel > .stack",
  )) {
    let label =
        container.parentElement
          .querySelector(":scope > .panel-header")
          ?.textContent.trim() || "Organization",
      collected = [];
    function flush() {
      if (collected.length) groups.push({ label, nodes: collected });
      collected = [];
    }
    for (const node of [...container.children]) {
      if (node.classList.contains("panel-header")) {
        flush();
        label = node.textContent.trim();
      } else if (node.tagName !== "FORM") {
        if (node.classList.contains("api")) {
          flush();
          groups.push({
            label:
              node.textContent === state.generatedInviteToken
                ? "New invitation"
                : "New API token",
            category:
              node.textContent === state.generatedInviteToken
                ? "team"
                : "access",
            nodes: [node],
          });
        } else if (!(label === "Organization" && node.tagName !== "TABLE"))
          collected.push(node);
      }
    }
    flush();
  }
  const layout = document.createElement("div");
  layout.className = "settings-layout";
  const nav = document.createElement("nav");
  nav.className = "settings-nav";
  nav.setAttribute("aria-label", "Settings sections");
  nav.role = "tablist";
  const content = document.createElement("div");
  content.className = "settings-content";
  const panes = new Map();
  definitions.forEach(([id, title, symbol]) => {
    const section = document.createElement("section");
    section.className = "settings-pane";
    section.id = "settings-" + id;
    section.role = "tabpanel";
    const heading = document.createElement("h2");
    heading.textContent = title;
    heading.style.marginBottom = "16px";
    section.append(heading);
    panes.set(id, section);
    content.append(section);
  });
  const profile = document.createElement("div");
  profile.className = "panel settings-profile";
  profile.innerHTML =
    '<span class="avatar">' +
    escapeHtml(initials(state.tenant?.user?.name)) +
    "</span><div><strong>" +
    escapeHtml(state.tenant?.user?.name || "Your profile") +
    '</strong><div class="subtitle">' +
    escapeHtml(state.tenant?.user?.email || "") +
    "</div></div>";
  panes.get("profile").append(profile);
  groups.forEach((group) => {
    const section = document.createElement("div");
    section.className = "panel settings-table-group";
    const header = document.createElement("div");
    header.className = "panel-header";
    const title = document.createElement("div");
    title.className = "panel-title";
    title.textContent = group.label;
    header.append(title);
    section.append(header, ...group.nodes);
    panes
      .get(group.category || tableCategories[group.label] || "profile")
      .append(section);
  });
  forms.forEach((form) => {
    const category =
      Object.entries(formCategories).find(([, ids]) =>
        ids.includes(form.id),
      )?.[0] || "integrations";
    if (
      form.id === "inviteForm" &&
      ["manager", "ic"].includes(currentMigrationRole())
    )
      return;
    if (
      ["teamForm", "workspaceForm"].includes(form.id) &&
      currentMigrationRole() === "ic"
    )
      return;
    const card = document.createElement("div");
    card.className = "panel";
    const header = document.createElement("div");
    header.className = "panel-header";
    const title = document.createElement("div");
    title.className = "panel-title";
    title.textContent = formLabels[form.id] || "Preferences";
    header.append(title);
    form.classList.add("stack");
    card.append(header, form);
    panes.get(category).append(card);
  });
  const available = definitions.filter(
    ([id]) => panes.get(id).children.length > 1,
  );
  if (!available.some(([id]) => id === state.settingsSection))
    state.settingsSection = "profile";
  available.forEach(([id, title, symbol], index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "tab";
    button.id = "settings-tab-" + id;
    button.setAttribute("aria-controls", "settings-" + id);
    panes.get(id).setAttribute("aria-labelledby", button.id);
    button.innerHTML = uiIcon(symbol) + "<span>" + title + "</span>";
    button.addEventListener("click", () => {
      state.settingsSection = id;
      select();
    });
    button.addEventListener("keydown", (event) => {
      if (
        !["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(event.key)
      )
        return;
      event.preventDefault();
      const next =
        (index +
          (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) +
          available.length) %
        available.length;
      nav.children[next].click();
      nav.children[next].focus();
    });
    nav.append(button);
  });
  function select() {
    available.forEach(([id], index) => {
      const active = id === state.settingsSection;
      panes.get(id).hidden = !active;
      nav.children[index].setAttribute("aria-selected", String(active));
      nav.children[index].tabIndex = active ? 0 : -1;
    });
    for (const [id, pane] of panes)
      if (!available.some(([key]) => key === id)) pane.hidden = true;
    window.CrmControls?.sync();
  }
  layout.append(nav, content);
  original.replaceWith(layout);
  select();
}
function initials(name) {
  return String(name || "User")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
function tableWrappers(root) {
  root.querySelectorAll("table").forEach((table) => {
    if (table.parentElement.classList.contains("table-scroll")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "table-scroll";
    table.before(wrapper);
    wrapper.append(table);
  });
}
function enhanceEmptyStates(root) {
  const map = {
    dashboard: "chart",
    accounts: "building",
    tasks: "check",
    reports: "chart",
    calendar: "calendar",
    sequences: "mail",
    communications: "phone",
    forms: "list",
    warmup: "mail",
    pipeline: "chart",
    settings: "settings",
    account: "building",
    contact: "users",
  };
  root.querySelectorAll(".empty").forEach((empty) => {
    if (empty.children.length) return;
    const text = empty.textContent;
    empty.innerHTML = uiIcon(map[state.view] || "list");
    const line = document.createElement("span");
    line.textContent = text;
    empty.append(line);
  });
}
function mountRecordSections() {
  if (!["account", "contact"].includes(state.view)) return;
  const root = document.querySelector("#view"),
    columns = [...root.querySelectorAll(":scope>.columns")];
  const sections = [];
  for (const column of columns)
    for (const panel of [...column.querySelectorAll(":scope>.panel")]) {
      let section = null;
      for (const node of [...panel.children]) {
        if (node.classList.contains("panel-header")) {
          section = document.createElement("section");
          section.className = "record-section";
          sections.push({
            title:
              node.querySelector(".panel-title")?.textContent ||
              node.textContent,
            element: section,
          });
          section.append(node);
        } else {
          if (!section) {
            section = document.createElement("section");
            section.className = "record-section";
            sections.push({ title: "Details", element: section });
          }
          section.append(node);
        }
      }
    }
  if (!sections.length) return;
  const layout = document.createElement("div");
  layout.className = "record-layout";
  const timeline = sections.find((item) => item.title === "Timeline");
  if (timeline) {
    timeline.element.classList.add("panel", "record-timeline");
    layout.append(timeline.element);
  }
  const main = document.createElement("div");
  main.className = "panel record-content";
  const tabs = document.createElement("div");
  tabs.className = "section-tabs";
  tabs.role = "tablist";
  tabs.setAttribute("aria-label", "Record details");
  main.append(tabs);
  const items = sections.filter((item) => item !== timeline);
  let selected = state.recordSection || "Contacts";
  if (!items.some((item) => item.title === selected))
    selected = items[0]?.title;
  state.recordSection = selected;
  items.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "tab";
    button.textContent = item.title;
    button.id = "record-tab-" + index;
    button.setAttribute("aria-controls", "record-pane-" + index);
    item.element.id = "record-pane-" + index;
    item.element.role = "tabpanel";
    item.element.setAttribute("aria-labelledby", button.id);
    tabs.append(button);
    main.append(item.element);
    button.addEventListener("click", () => {
      state.recordSection = item.title;
      select();
    });
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
        return;
      event.preventDefault();
      const target =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) %
              items.length;
      tabs.children[target].click();
      tabs.children[target].focus();
    });
  });
  function select() {
    items.forEach((item, index) => {
      const active = item.title === (state.recordSection || selected);
      item.element.hidden = !active;
      tabs.children[index].setAttribute("aria-selected", String(active));
      tabs.children[index].tabIndex = active ? 0 : -1;
    });
  }
  select();
  layout.append(main);
  columns[0].before(layout);
  columns.forEach((column) => column.remove());
}

function applyPageLayout() {
  document.body.style.overflow = "";
  const root = document.querySelector("#view");
  root.dataset.view = state.view;
  root.setAttribute("aria-busy", "false");
  if (
    currentMigrationRole() === "ic" &&
    ["sequences", "warmup"].includes(state.view)
  ) {
    root.innerHTML =
      header(
        state.view === "sequences" ? "Sequences" : "Email health",
        "Keep your existing outreach workflow in the original CRM.",
      ) +
      '<div class="ds-empty">' +
      uiIcon("shield", 32) +
      '<strong>This workflow is managed by your team lead</strong><p>Your existing outreach tools are still available in the original CRM.</p><a class="button" href="https://gtm.userorb.com" target="_blank" rel="noopener noreferrer">Open original CRM' +
      uiIcon("external") +
      "</a></div>";
    return;
  }
  if (state.view === "dashboard") {
    root.querySelector(".columns")?.classList.add("dashboard-grid");
    const form = root.querySelector("#dashboardPreferencesForm");
    if (form) {
      const panel = form.closest(".panel");
      const disclosure = document.createElement("details");
      disclosure.className = "dashboard-customize";
      const summary = document.createElement("summary");
      summary.className = "button";
      summary.innerHTML = uiIcon("settings") + "Edit layout";
      disclosure.append(summary, panel);
      root.querySelector(".header-actions")?.append(disclosure);
    }
  }
  if (state.view === "reports")
    root
      .querySelectorAll(":scope>.columns")
      .forEach((pair) => pair.classList.add("report-pair"));
  if (state.view === "pipeline")
    root.querySelector(":scope>.grid")?.classList.add("pipeline-board");
  if (["account", "contact"].includes(state.view))
    root.querySelector(".metrics")?.classList.add("record-stats");
  if (state.view === "settings") mountSettings();
  else mountEditor();
  mountRecordSections();
  tableWrappers(root);
  enhanceEmptyStates(root);
  const initialsNode = document.querySelector("#profileAvatar");
  if (initialsNode)
    initialsNode.textContent = initials(state.tenant?.user?.name);
  const title = document.querySelector("#profileButton");
  if (title)
    title.setAttribute(
      "aria-label",
      "Account: " + (state.tenant?.user?.name || "Your profile"),
    );
  window.CrmControls?.enhance(root);
}
function installShellActions() {
  const theme = () => {
    const light = document.documentElement.dataset.theme === "light";
    const button = document.querySelector("#themeButton");
    button.setAttribute(
      "aria-label",
      light ? "Switch to dark appearance" : "Switch to light appearance",
    );
    button.innerHTML = uiIcon(light ? "moon" : "sun");
  };
  theme();
  document.querySelector("#themeButton").addEventListener("click", () => {
    const value =
      document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = value;
    storageSet("crmTheme", value);
    theme();
  });
  document.querySelector("#profileButton").addEventListener("click", () => {
    state.view = "settings";
    state.settingsSection = "profile";
    render();
  });
  document.querySelectorAll(".nav button,.nav a").forEach((node) => {
    const label = node.textContent.trim();
    if (label) {
      node.setAttribute("aria-label", label);
      node.title = label;
    }
  });
  document
    .querySelector("#collapseSidebar")
    .addEventListener("click", (event) => {
      const collapsed =
        document.documentElement.classList.toggle("nav-collapsed");
      event.currentTarget.setAttribute(
        "aria-label",
        collapsed ? "Expand sidebar" : "Collapse sidebar",
      );
      event.currentTarget.setAttribute("aria-expanded", String(!collapsed));
    });
  document.querySelector("#mobileMenu").addEventListener("click", () => {
    document.documentElement.classList.toggle("mobile-nav-open");
  });
  document
    .querySelector("#globalSearchForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      state.view = "accounts";
      state.accountOffset = 0;
      state.selectedSavedViewId = "";
      state.accountFilters.q = document
        .querySelector("#globalSearchInput")
        .value.trim();
      await refresh();
    });
  document.addEventListener("click", (event) => {
    document
      .querySelectorAll(".dashboard-customize[open]")
      .forEach((disclosure) => {
        if (
          !disclosure.contains(event.target) &&
          !window.CrmControls?.contains(event.target)
        )
          disclosure.open = false;
      });
    const taskFilter = event.target.closest("[data-task-filter]");
    if (taskFilter) {
      state.taskFilter = taskFilter.dataset.taskFilter;
      render();
    }
    if (event.target.closest("[data-open-editor]")) openEditor();
    if (event.target.closest(".nav button,.nav>a"))
      document.documentElement.classList.remove("mobile-nav-open");
    if (
      document.documentElement.classList.contains("mobile-nav-open") &&
      !event.target.closest(".sidebar,#mobileMenu")
    )
      document.documentElement.classList.remove("mobile-nav-open");
  });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      document.querySelector("#globalSearchInput").focus();
      return;
    }
    if (
      event.key === "Escape" &&
      !document.querySelector(".crm-editor-overlay:not([hidden])")
    ) {
      const disclosure = document.querySelector(".dashboard-customize[open]");
      if (disclosure) {
        if (window.CrmControls?.close(true)) {
          event.preventDefault();
          return;
        }
        disclosure.open = false;
        disclosure.querySelector("summary").focus();
        event.preventDefault();
      }
    }
    const overlay = document.querySelector(".crm-editor-overlay:not([hidden])");
    if (!overlay) return;
    if (event.key === "Escape") {
      if (window.CrmControls?.close(true)) {
        event.preventDefault();
        return;
      }
      if (document.querySelector(".crm-prompt-backdrop")) return;
      event.preventDefault();
      closeEditor();
    }
    if (
      event.key === "Tab" &&
      !window.CrmControls?.contains(event.target) &&
      !event.target.closest(".crm-prompt-backdrop")
    ) {
      const nodes = [
        ...overlay.querySelectorAll(
          'button:not([disabled]),input:not([tabindex="-1"]):not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]',
        ),
      ].filter((node) => node.getClientRects().length);
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (event.shiftKey && event.target === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && event.target === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  });
  document.addEventListener("focusin", (event) => {
    const overlay = document.querySelector(".crm-editor-overlay:not([hidden])");
    if (
      overlay &&
      !overlay.contains(event.target) &&
      !window.CrmControls?.contains(event.target) &&
      !event.target.closest(".crm-prompt-backdrop")
    )
      overlay.querySelector("button")?.focus();
  });
  window.addEventListener("unhandledrejection", (event) => {
    event.preventDefault();
    notice(event.reason?.message || "Something went wrong. Please try again.");
    document.querySelector("#message").dataset.error = "true";
  });
  window.addEventListener("hashchange", () => {
    const requested = location.hash.slice(1);
    if (
      [
        "dashboard",
        "accounts",
        "pipeline",
        "reports",
        "sequences",
        "warmup",
        "tasks",
        "communications",
        "calendar",
        "forms",
        "api",
        "settings",
      ].includes(requested) &&
      requested !== state.view
    ) {
      state.view = requested;
      render();
    }
  });
  document.addEventListener("change", async (event) => {
    const field = event.target.closest("[data-complete-task]");
    if (!field) return;
    field.disabled = true;
    try {
      await api("tasks/" + encodeURIComponent(field.dataset.completeTask), {
        method: "PATCH",
        body: JSON.stringify({ status: field.checked ? "done" : "open" }),
      });
      notice(field.checked ? "Task completed" : "Task reopened");
      await refresh();
    } catch (error) {
      field.checked = !field.checked;
      field.disabled = false;
      notice(error.message);
    }
  });
  document.addEventListener("click", async (event) => {
    if (event.target.closest("#loadMoreTasks")) {
      const rows = await api("tasks?offset=" + state.tasks.length);
      state.tasks.push(...rows);
      if (!rows.length) state.noMoreTasks = true;
      render();
    }
  });
}
`;
