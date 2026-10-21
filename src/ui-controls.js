// Shared controls preserve the original form elements as their source of truth.
export const uiControlsCss = String.raw`
.crm-control-backing{position:absolute!important;top:0!important;left:0!important;width:1px!important;height:1px!important;min-width:0!important;max-width:1px!important;min-height:0!important;max-height:1px!important;opacity:0!important;padding:0!important;margin:0!important;overflow:hidden!important;clip-path:inset(50%)!important;pointer-events:none!important;white-space:nowrap!important}
.crm-control{display:inline-flex;position:relative;min-width:0;max-width:100%;vertical-align:middle;width:100%;font:inherit}
.crm-control-trigger{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;min-height:32px!important;height:32px!important;width:100%!important;min-width:0!important;padding:0 10px!important;border:1px solid var(--border-primary)!important;border-radius:8px!important;background:var(--bg-primary)!important;color:var(--text-primary)!important;font:inherit!important;font-size:13px!important;line-height:18px!important;text-align:left!important;box-shadow:none!important;cursor:pointer}
.crm-control-trigger:hover{background:var(--bg-tertiary)!important}.crm-control-trigger:focus-visible,.crm-menu button:focus-visible,.crm-menu input:focus-visible,.crm-prompt button:focus-visible{outline:2px solid var(--blue,#8ba8f8)!important;outline-offset:2px}.crm-control-trigger[aria-invalid=true]{border-color:var(--red,#ef7373)!important}.crm-control-trigger:disabled{opacity:.45;cursor:not-allowed}.crm-control-value{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}.crm-control-chevron{width:14px;height:14px;flex:none;color:var(--text-tertiary);transition:transform .12s}.crm-control-trigger[aria-expanded=true] .crm-control-chevron{transform:rotate(180deg)}
.crm-menu{position:fixed!important;z-index:10020;box-sizing:border-box;padding:6px;border:1px solid var(--border-primary);border-radius:10px;background:var(--bg-secondary,var(--bg-primary));color:var(--text-primary);box-shadow:0 12px 32px #0004,0 2px 6px #0002;font:13px/18px Inter,ui-sans-serif,system-ui,sans-serif;max-width:calc(100vw - 16px);overflow:hidden}.crm-menu-search{position:relative;margin-bottom:5px}.crm-menu .crm-menu-search input,.crm-prompt input{box-sizing:border-box;display:block;width:100%;height:32px;min-height:32px;padding:0 10px;border:1px solid var(--border-primary);border-radius:6px;background:var(--bg-primary);color:var(--text-primary);font:inherit;outline:none}.crm-menu-options{max-height:280px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}.crm-menu-option{display:flex;align-items:center;gap:8px;box-sizing:border-box;min-height:32px;padding:6px 8px;border-radius:5px;cursor:pointer;outline:none;white-space:normal;overflow-wrap:anywhere}.crm-menu-option[aria-selected=true]{background:var(--bg-tertiary);color:var(--text-primary)}.crm-menu-option.crm-option-active{background:var(--bg-tertiary);box-shadow:inset 0 0 0 1px var(--border-primary)}.crm-menu-option[aria-disabled=true]{opacity:.4;cursor:not-allowed}.crm-menu-option-text{flex:1;min-width:0}.crm-option-check{width:14px;height:14px;flex:none;opacity:0}.crm-menu-option[aria-selected=true] .crm-option-check{opacity:1}.crm-menu-group{padding:9px 8px 4px;color:var(--text-tertiary);font-size:11px;font-weight:600}.crm-menu-empty{padding:12px 8px;color:var(--text-tertiary)}
input[type=checkbox]:not(.crm-control-backing),input[type=radio]:not(.crm-control-backing){appearance:none!important;-webkit-appearance:none!important;box-sizing:border-box;display:inline-grid!important;place-content:center!important;width:16px!important;height:16px!important;min-width:16px!important;min-height:16px!important;max-width:16px!important;flex:0 0 16px!important;padding:0!important;margin:0 6px 0 0;vertical-align:-3px;border:1px solid var(--border-primary)!important;border-radius:4px!important;background:var(--bg-primary)!important;cursor:pointer;box-shadow:none!important}input[type=radio]:not(.crm-control-backing){border-radius:50%!important}input[type=checkbox]:checked,input[type=radio]:checked{background:var(--accent,#f4fa72)!important;border-color:var(--accent,#f4fa72)!important}input[type=checkbox]:checked:after{content:"";width:7px;height:4px;border-left:2px solid #171714;border-bottom:2px solid #171714;transform:translateY(-1px) rotate(-45deg)}input[type=radio]:checked:after{content:"";width:6px;height:6px;border-radius:50%;background:#171714}input[type=checkbox]:indeterminate:after{content:"";width:8px;height:2px;background:var(--text-primary)}input[type=checkbox]:focus-visible,input[type=radio]:focus-visible{outline:2px solid var(--blue)!important;outline-offset:2px}input[type=checkbox]:disabled,input[type=radio]:disabled{opacity:.4;cursor:not-allowed}
.crm-calendar{width:294px;padding:12px}.crm-calendar-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;font-size:13px;font-weight:600}.crm-calendar button{font:inherit;color:inherit;cursor:pointer;box-shadow:none!important}.crm-calendar-nav{display:grid;place-items:center;width:28px!important;min-height:28px!important;height:28px;padding:0!important;background:transparent;border:0;border-radius:5px}.crm-calendar-nav:hover,.crm-calendar-day:hover{background:var(--bg-tertiary)}.crm-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px}.crm-calendar-row{display:contents}.crm-calendar-weekday{height:28px;display:grid;place-items:center;color:var(--text-tertiary);font-size:11px}.crm-calendar-day{display:grid;place-items:center;border:0;background:transparent;min-height:32px!important;height:32px;width:100%;padding:0!important;border-radius:6px;font-size:12px!important}.crm-calendar-day[data-other=true]{color:var(--text-tertiary)}.crm-calendar-day[data-today=true]{box-shadow:inset 0 0 0 1px var(--border-primary)!important}.crm-calendar-day[aria-selected=true]{background:var(--accent,#f4fa72);color:#171714;font-weight:600}.crm-calendar-day:disabled{opacity:.25;cursor:not-allowed}.crm-calendar-footer{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border-primary);padding-top:9px;margin-top:9px;gap:8px}.crm-calendar-action{background:transparent;border:0;border-radius:5px;min-height:28px!important;padding:0 6px!important;font-size:12px!important}.crm-calendar-action:hover{background:var(--bg-tertiary)}.crm-calendar-time{display:flex;align-items:center;gap:8px;margin-top:10px;color:var(--text-secondary);font-size:12px}.crm-calendar-time input{width:76px!important;height:30px!important;min-height:30px!important;padding:0 8px!important;background:var(--bg-primary)!important;border:1px solid var(--border-primary)!important;border-radius:6px!important;color:var(--text-primary)!important;font:inherit!important}.crm-calendar-error{color:var(--red,#ef7373);font-size:11px;margin-top:6px}
.crm-prompt-backdrop{position:fixed;inset:0;z-index:11000;background:#0008;display:grid;place-items:center;padding:20px}.crm-prompt{box-sizing:border-box;width:420px;max-width:100%;padding:24px;border:1px solid var(--border-primary);border-radius:12px;background:var(--bg-primary);color:var(--text-primary);box-shadow:0 24px 80px #0006;font:13px/20px Inter,ui-sans-serif,system-ui,sans-serif}.crm-prompt h2{margin:0 0 18px;font:600 16px/24px Inter,ui-sans-serif,system-ui,sans-serif;overflow-wrap:anywhere}.crm-prompt-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}.crm-prompt button{height:32px;min-height:32px;padding:0 12px;border:1px solid var(--border-primary);border-radius:7px;background:var(--bg-secondary);color:var(--text-primary);font:500 13px Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer}.crm-prompt button[type=submit]{background:var(--accent,#f4fa72);color:#171714;border-color:transparent}
`;

export const uiControlsScript = String.raw`(() => {
  if (window.CrmControls) return;
  const controls = new Map();
  let active = null, sequence = 0, scheduled = false, invalidFocus = null;
  const arrow = '<svg class="crm-control-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const check = '<svg class="crm-option-check" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function element(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; }
  function labelFor(source) {
    const labelledBy = (source.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
    return source.getAttribute('aria-label') || labelledBy || Array.from(source.labels || []).map(label => { const copy = label.cloneNode(true); copy.querySelectorAll('input,select,textarea,button,.crm-control').forEach(node => node.remove()); return copy.textContent.trim(); }).filter(Boolean).join(' ') || source.name || 'Choose an option';
  }
  function changed(source) { source.dispatchEvent(new Event('input', { bubbles: true })); source.dispatchEvent(new Event('change', { bubbles: true })); }
  function close(returnFocus = false) { if (!active) return false; const previous = active; active = null; previous.menu.remove(); previous.control.button.setAttribute('aria-expanded', 'false'); previous.control.button.removeAttribute('aria-activedescendant'); if (returnFocus && previous.control.button.isConnected) previous.control.button.focus(); return true; }
  function position() {
    if (!active) return;
    const { menu, control } = active, rect = control.button.getBoundingClientRect();
    if (!control.source.isConnected || !rect.width) { close(); return; }
    const viewportWidth = document.documentElement.clientWidth, viewportHeight = window.innerHeight;
    menu.style.width = Math.min(active.calendar ? 294 : Math.max(rect.width, 200), viewportWidth - 16) + 'px';
    const height = menu.getBoundingClientRect().height, below = viewportHeight - rect.bottom - 8, above = rect.top - 8;
    const useAbove = below < height && above > below;
    const available = Math.max(100, (useAbove ? above : below) - 4);
    menu.style.maxHeight = available + 'px'; menu.style.overflowY = 'auto';
    menu.style.left = Math.max(8, Math.min(rect.left, viewportWidth - menu.getBoundingClientRect().width - 8)) + 'px';
    menu.style.top = Math.max(8, useAbove ? rect.top - Math.min(height, available) - 4 : rect.bottom + 4) + 'px';
  }
  function mount(control, calendar = false) {
    close(); const menu = element('div', calendar ? 'crm-menu crm-calendar' : 'crm-menu'); menu.id = control.menuId;
    if (calendar) { menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', labelFor(control.source)); }
    document.body.append(menu); active = { control, menu, calendar, highlighted: -1, options: [], query: '' };
    control.button.setAttribute('aria-expanded', 'true'); return menu;
  }
  function syncControl(control) {
    const { source, button, value } = control;
    button.disabled = source.disabled;
    button.setAttribute('aria-label', labelFor(source));
    if (source.hasAttribute('aria-describedby')) button.setAttribute('aria-describedby', source.getAttribute('aria-describedby')); else button.removeAttribute('aria-describedby');
    button.setAttribute('aria-required', String(source.required));
    if (source.validity.valid) button.removeAttribute('aria-invalid');
    if (source.tagName === 'SELECT') {
      const selected = Array.from(source.selectedOptions).map(option => option.textContent.trim());
      value.textContent = selected.length ? selected.join(', ') : (source.dataset.placeholder || (source.multiple ? 'Select options' : 'Select an option'));
      button.title = selected.join(', ');
    } else {
      const date = source.value ? new Date(source.value.length === 10 ? source.value + 'T12:00:00' : source.value) : null;
      value.textContent = date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', ...(source.type === 'datetime-local' ? { hour: 'numeric', minute: '2-digit' } : {}) }).format(date) : (source.dataset.placeholder || (source.type === 'datetime-local' ? 'Select date and time' : 'Select date'));
    }
  }
  function highlight(index) {
    if (!active || !active.options.length) return;
    const enabled = active.options.filter(item => !item.disabled); if (!enabled.length) return;
    const next = active.options[index]; if (!next || next.disabled) return;
    active.highlighted = index;
    active.options.forEach((item, i) => item.node.classList.toggle('crm-option-active', i === index));
    active.control.button.setAttribute('aria-activedescendant', next.node.id);
    const target = active.search || active.control.button; target.setAttribute('aria-activedescendant', next.node.id);
    next.node.scrollIntoView({ block: 'nearest' });
  }
  function move(direction, edge) {
    if (!active) return; const candidates = active.options.map((item, index) => ({ item, index })).filter(entry => !entry.item.disabled); if (!candidates.length) return;
    const current = candidates.findIndex(entry => entry.index === active.highlighted);
    const next = edge === 'first' ? 0 : edge === 'last' ? candidates.length - 1 : (current + direction + candidates.length) % candidates.length;
    highlight(candidates[next].index);
  }
  function selectOption(option) {
    const current = active; if (!current || option.disabled) return;
    const source = current.control.source;
    if (source.multiple) option.selected = !option.selected; else source.selectedIndex = option.index;
    syncControl(current.control); changed(source);
    if (!source.multiple) close(true); else if (active === current) { renderOptions(current); }
  }
  function renderOptions(current) {
    const { source } = current.control, query = current.query.toLocaleLowerCase();
    current.list.replaceChildren(); current.options = []; current.highlighted = -1;
    let lastGroup = null;
    Array.from(source.options).forEach(option => {
      if (option.hidden || !option.textContent.toLocaleLowerCase().includes(query)) return;
      const group = option.parentElement.tagName === 'OPTGROUP' ? option.parentElement : null;
      if (group && group !== lastGroup) { current.list.append(element('div', 'crm-menu-group', group.label)); lastGroup = group; }
      const node = element('div', 'crm-menu-option'); node.id = current.menu.id + '-option-' + option.index; node.setAttribute('role', 'option'); node.setAttribute('aria-selected', String(option.selected));
      const disabled = option.disabled || !!group?.disabled; node.setAttribute('aria-disabled', String(disabled));
      node.append(element('span', 'crm-menu-option-text', option.textContent)); node.insertAdjacentHTML('beforeend', check);
      const index = current.options.length; current.options.push({ node, option, disabled });
      node.addEventListener('pointermove', () => highlight(index)); node.addEventListener('mousedown', event => event.preventDefault()); node.addEventListener('click', () => { if (!disabled) selectOption(option); }); current.list.append(node);
    });
    if (!current.options.length) current.list.append(element('div', 'crm-menu-empty', 'No options found'));
    const selected = current.options.findIndex(item => item.option.selected && !item.disabled);
    if (selected >= 0) highlight(selected); else move(1, 'first');
    position();
  }
  function openSelect(control) {
    syncControl(control); const menu = mount(control), current = active;
    if (control.source.options.length > 8) {
      const holder = element('div', 'crm-menu-search'), search = element('input'); search.type = 'text'; search.placeholder = 'Search…'; search.autocomplete = 'off'; search.setAttribute('aria-label', 'Search ' + labelFor(control.source)); search.setAttribute('role', 'combobox'); search.setAttribute('aria-expanded', 'true'); search.setAttribute('aria-controls', control.menuId + '-list'); search.addEventListener('input', () => { current.query = search.value; renderOptions(current); }); search.addEventListener('keydown', menuKey); holder.append(search); menu.append(holder); current.search = search;
    }
    const list = element('div', 'crm-menu-options'); list.id = control.menuId + '-list'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', labelFor(control.source)); if (control.source.multiple) list.setAttribute('aria-multiselectable', 'true'); menu.append(list); current.list = list;
    renderOptions(current); position(); if (current.search) current.search.focus();
  }
  function menuKey(event) {
    if (!active || active.calendar) return;
    if (event.key === 'Escape') { event.preventDefault(); close(true); }
    else if (event.key === 'Tab') close();
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); move(event.key === 'ArrowDown' ? 1 : -1); }
    else if (event.key === 'Home' || event.key === 'End') { if (event.target === active.search && !event.ctrlKey) return; event.preventDefault(); move(1, event.key === 'Home' ? 'first' : 'last'); }
    else if (event.key === 'Enter' || (event.key === ' ' && event.target !== active.search)) { event.preventDefault(); const item = active.options[active.highlighted]; if (item) selectOption(item.option); }
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.target !== active.search) {
      event.preventDefault(); const current = active; clearTimeout(current.typingTimer); current.typed = (current.typed || '') + event.key.toLocaleLowerCase(); const index = current.options.findIndex(item => !item.disabled && item.option.textContent.trim().toLocaleLowerCase().startsWith(current.typed)); if (index >= 0) highlight(index); current.typingTimer = setTimeout(() => { current.typed = ''; }, 650);
    }
  }
  const pad = value => String(value).padStart(2, '0');
  const dateValue = date => date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  function openCalendar(control) {
    const menu = mount(control, true), current = active, source = control.source;
    const initial = source.value ? new Date(source.value.slice(0,10) + 'T12:00:00') : new Date();
    current.month = new Date(initial.getFullYear(), initial.getMonth(), 1); current.date = source.value.slice(0,10); current.time = source.value.slice(11,16) || '09:00';
    const datetime = source.type === 'datetime-local';
    function commit(value) {
      if (value && ((source.min && new Date(value).getTime() < new Date(source.min).getTime()) || (source.max && new Date(value).getTime() > new Date(source.max).getTime()))) { if (!menu.querySelector('.crm-calendar-error')) menu.append(element('div', 'crm-calendar-error', 'Choose a date within the allowed range.')); return; }
      source.value = value; syncControl(control); changed(source); close(true);
    }
    function render(focusDate) {
      menu.replaceChildren(); const header = element('div', 'crm-calendar-header');
      function navigation(text, label, delta) { const button = element('button', 'crm-calendar-nav', text); button.type = 'button'; button.setAttribute('aria-label', label); button.addEventListener('click', () => { current.month.setMonth(current.month.getMonth() + delta); render(); }); return button; }
      header.append(navigation('‹', 'Previous month', -1), element('span', '', new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(current.month)), navigation('›', 'Next month', 1)); menu.append(header);
      const grid = element('div', 'crm-calendar-grid'); grid.setAttribute('role', 'grid'); grid.setAttribute('aria-label', 'Choose date');
      const weekdays = element('div', 'crm-calendar-row'); weekdays.setAttribute('role', 'row'); ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(day => { const heading = element('span', 'crm-calendar-weekday', day); heading.setAttribute('role', 'columnheader'); weekdays.append(heading); }); grid.append(weekdays);
      let week;
      const start = new Date(current.month); start.setDate(1 - start.getDay());
      for (let index = 0; index < 42; index++) {
        if (index % 7 === 0) { week = element('div', 'crm-calendar-row'); week.setAttribute('role', 'row'); grid.append(week); }
        const date = new Date(start); date.setDate(start.getDate() + index); const value = dateValue(date), day = element('button', 'crm-calendar-day', String(date.getDate())); day.type = 'button'; day.tabIndex = value === (focusDate || current.date || dateValue(initial)) ? 0 : -1; day.dataset.date = value; day.dataset.other = String(date.getMonth() !== current.month.getMonth()); day.dataset.today = String(value === dateValue(new Date())); day.setAttribute('role', 'gridcell'); day.setAttribute('aria-selected', String(value === current.date)); day.setAttribute('aria-label', new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date)); day.disabled = !!((source.min && value < source.min.slice(0,10)) || (source.max && value > source.max.slice(0,10)));
        day.addEventListener('click', () => { current.date = value; if (!datetime) commit(value); else render(value); });
        day.addEventListener('keydown', event => {
          const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
          if (delta !== undefined) { event.preventDefault(); const next = new Date(date); next.setDate(next.getDate() + delta); current.month = new Date(next.getFullYear(), next.getMonth(), 1); render(dateValue(next)); }
        }); week.append(day);
      }
      menu.append(grid);
      if (datetime) { const timeLabel = element('label', 'crm-calendar-time', 'Time'); const time = element('input'); time.type = 'text'; time.inputMode = 'numeric'; time.placeholder = 'HH:mm'; time.maxLength = 5; time.value = current.time; time.setAttribute('aria-label', 'Time in 24-hour format'); time.addEventListener('input', () => { current.time = time.value; time.removeAttribute('aria-invalid'); }); timeLabel.append(time); menu.append(timeLabel); }
      const footer = element('div', 'crm-calendar-footer');
      function action(text, callback) { const button = element('button', 'crm-calendar-action', text); button.type = 'button'; button.addEventListener('click', callback); return button; }
      footer.append(action('Today', () => { current.date = dateValue(new Date()); current.month = new Date(new Date().getFullYear(), new Date().getMonth(), 1); if (datetime) render(current.date); else commit(current.date); }));
      if (!source.required) footer.append(action('Clear', () => commit('')));
      if (datetime) footer.append(action('Apply', () => {
        const time = menu.querySelector('.crm-calendar-time input');
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(current.time)) { time.setAttribute('aria-invalid', 'true'); time.focus(); if (!menu.querySelector('.crm-calendar-error')) menu.append(element('div', 'crm-calendar-error', 'Enter a time in HH:mm format.')); return; }
        const value = (current.date || dateValue(initial)) + 'T' + current.time;
        commit(value);
      }));
      menu.append(footer); position();
      if (focusDate) menu.querySelector('[data-date="' + focusDate + '"]:not(:disabled)')?.focus();
    }
    menu.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); close(true); } if (event.key === 'Tab') { const buttons = Array.from(menu.querySelectorAll('button:not(:disabled):not([tabindex="-1"]),input')); const first = buttons[0], last = buttons[buttons.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } });
    render(current.date || dateValue(initial));
  }
  function enhance() {
    controls.forEach((control, source) => { if (!source.isConnected) { if (active?.control === control) close(); controls.delete(source); } });
    document.querySelectorAll('select,input[type="date"],input[type="datetime-local"]').forEach(source => {
      if (controls.has(source) || source.dataset.crmNative === 'true') return;
      const wrapper = element('span', 'crm-control'), button = element('button', 'crm-control-trigger'), value = element('span', 'crm-control-value');
      button.type = 'button'; button.setAttribute('role', 'combobox'); button.setAttribute('aria-haspopup', source.tagName === 'SELECT' ? 'listbox' : 'dialog'); button.setAttribute('aria-expanded', 'false');
      const menuId = 'crm-control-menu-' + (++sequence); button.setAttribute('aria-controls', source.tagName === 'SELECT' ? menuId + '-list' : menuId);
      button.append(value); button.insertAdjacentHTML('beforeend', arrow); source.before(wrapper); wrapper.append(source, button); source.classList.add('crm-control-backing'); source.tabIndex = -1; source.setAttribute('aria-hidden', 'true');
      const control = { source, wrapper, button, value, menuId }; controls.set(source, control); syncControl(control);
      source.addEventListener('focus', () => button.focus());
      source.addEventListener('change', () => syncControl(control)); source.addEventListener('input', () => syncControl(control)); source.addEventListener('invalid', event => { event.preventDefault(); syncControl(control); button.setAttribute('aria-invalid', 'true'); if (!invalidFocus) { invalidFocus = button; queueMicrotask(() => { const target = invalidFocus; invalidFocus = null; target?.focus(); }); } }); source.addEventListener('change', () => button.removeAttribute('aria-invalid'));
      button.addEventListener('click', () => { if (active?.control === control) close(true); else if (source.tagName === 'SELECT') openSelect(control); else openCalendar(control); });
      button.addEventListener('keydown', event => {
        if (active?.control === control) { if (active.calendar) { if (event.key === 'Escape') { event.preventDefault(); close(true); } return; } menuKey(event); return; }
        if (['ArrowDown','ArrowUp','Enter',' '].includes(event.key)) { event.preventDefault(); if (source.tagName === 'SELECT') { openSelect(control); if (event.key === 'ArrowUp') move(1, 'last'); } else openCalendar(control); }
      });
      const labels = Array.from(source.labels || []); labels.forEach(label => label.addEventListener('click', event => { if (event.target === label || event.target.nodeType === 3) { event.preventDefault(); button.focus(); } }));
    });
  }
  function sync() { enhance(); controls.forEach(syncControl); if (active && !active.calendar) renderOptions(active); }
  function schedule() { if (scheduled) return; scheduled = true; queueMicrotask(() => { scheduled = false; sync(); }); }
  function prompt(message, defaultValue = '') {
    close(); return new Promise(resolve => {
      const previous = document.activeElement, backdrop = element('div', 'crm-prompt-backdrop'), form = element('form', 'crm-prompt'), title = element('h2', '', message), input = element('input'), actions = element('div', 'crm-prompt-actions'), cancel = element('button', '', 'Cancel'), confirm = element('button', '', 'Save');
      title.id = 'crm-prompt-title-' + (++sequence); form.setAttribute('role', 'dialog'); form.setAttribute('aria-modal', 'true'); form.setAttribute('aria-labelledby', title.id); input.type = 'text'; input.value = defaultValue ?? ''; input.setAttribute('aria-labelledby', title.id); cancel.type = 'button'; confirm.type = 'submit'; actions.append(cancel, confirm); form.append(title, input, actions); backdrop.append(form); document.body.append(backdrop);
      const siblings = Array.from(document.body.children).filter(node => node !== backdrop && !node.inert); siblings.forEach(node => { node.inert = true; });
      let finished = false; function finish(value) { if (finished) return; finished = true; backdrop.remove(); siblings.forEach(node => { node.inert = false; }); previous?.focus(); resolve(value); }
      form.addEventListener('submit', event => { event.preventDefault(); finish(input.value); }); cancel.addEventListener('click', () => finish(null)); backdrop.addEventListener('click', event => { if (event.target === backdrop) finish(null); });
      form.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish(null); } if (event.key === 'Tab') { const elements = [input, cancel, confirm], index = elements.indexOf(document.activeElement); if (event.shiftKey && index === 0) { event.preventDefault(); confirm.focus(); } else if (!event.shiftKey && index === 2) { event.preventDefault(); input.focus(); } } }); input.focus(); input.select();
    });
  }
  window.CrmControls = { enhance, sync, prompt, close, isOpen: () => !!active, contains: target => !!active && (active.menu.contains(target) || active.control.wrapper.contains(target)) };
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && active) { event.preventDefault(); event.stopImmediatePropagation(); close(true); } }, true);
  document.addEventListener('pointerdown', event => { if (active && !active.menu.contains(event.target) && !active.control.wrapper.contains(event.target)) close(); });
  document.addEventListener('focusin', event => { if (active && !active.menu.contains(event.target) && !active.control.wrapper.contains(event.target)) close(); });
  document.addEventListener('reset', () => setTimeout(sync, 0));
  window.addEventListener('resize', position); window.addEventListener('scroll', event => { if (active && !active.menu.contains(event.target)) position(); }, true);
  const observer = new MutationObserver(records => { if (records.some(record => { const target = record.target; if (target.closest?.('.crm-menu,.crm-prompt-backdrop')) return false; if (record.type === 'characterData') return target.parentElement?.closest('select'); if (record.type === 'attributes') return controls.has(target) || target.tagName === 'OPTION' || target.tagName === 'OPTGROUP'; return !target.closest?.('.crm-control-trigger') && (record.addedNodes.length || record.removedNodes.length); })) schedule(); });
  function start() { enhance(); observer.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['disabled','required','multiple','selected','label','value','min','max','hidden','aria-label','aria-labelledby','aria-describedby'] }); }
  [['HTMLSelectElement',['value','selectedIndex']],['HTMLOptionElement',['selected']],['HTMLInputElement',['value']]].forEach(([name, properties]) => properties.forEach(property => { const prototype = window[name]?.prototype, descriptor = prototype && Object.getOwnPropertyDescriptor(prototype, property); if (!descriptor?.set || !descriptor.configurable) return; Object.defineProperty(prototype, property, { ...descriptor, set(value) { descriptor.set.call(this, value); if (controls.has(this) || (this.tagName === 'OPTION' && controls.has(this.closest('select')))) schedule(); } }); }));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();`;
