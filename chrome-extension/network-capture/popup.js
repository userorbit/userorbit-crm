import { crmOrigin, profileUrl } from './validation.js';

const field = name => document.getElementById(name);
const status = message => { field('status').textContent = message; };

try {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  field('url').value = profileUrl(tab?.url);
} catch {
  status('Open a LinkedIn profile tab, then reopen this popup.');
  field('save').disabled = true;
}

field('capture').addEventListener('submit', async event => {
  event.preventDefault();
  let token = field('token').value.trim();
  field('save').disabled = true;
  try {
    const origin = crmOrigin(field('origin').value.trim());
    const url = profileUrl(field('url').value);
    const workspace = field('workspace').value.trim();
    if (!token || !workspace || !field('name').value.trim()) throw new Error('Name, workspace and API token are required.');
    const permission = `${origin}/*`;
    const allowed = await chrome.permissions.request({ origins: [permission] });
    if (!allowed) throw new Error('Access to the configured CRM origin is required to save.');
    status('Saving to the review queue…');
    const response = await fetch(`${origin}/api/assistant/network/capture`, {
      method: 'POST', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-workspace-id': workspace },
      body: JSON.stringify({ confirm: true, url, name: field('name').value.trim(), company: field('company').value.trim(), title: field('title').value.trim() }),
    });
    if (!response.ok) throw new Error(`Save failed (${response.status}). Check the origin, token and workspace permissions.`);
    const data = await response.json();
    status(data.imported ? 'Saved. Review and match this identity in your CRM Network panel.' : 'This profile is already in your review queue.');
  } catch (error) {
    status(error instanceof TypeError ? 'Could not save. Check the HTTPS CRM origin and connectivity.' : error.message);
  } finally {
    token = '';
    field('token').value = '';
    field('save').disabled = !field('url').value;
  }
});
