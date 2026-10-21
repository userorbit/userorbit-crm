# Optional explicit profile capture

Load this directory with Chrome → Extensions → Developer mode → Load unpacked. Open a LinkedIn `/in/...` profile and click the extension. Enter your deployed HTTPS CRM origin, workspace ID and workspace API token; review the name/company/title and choose **Confirm and save profile**. The server integration must mount `network.handleRequest` at `/api/assistant/network/*` and apply migration 0051.

Only the active tab URL is read under `activeTab`; no page script, background worker, automatic scraping, messages or contact creation is involved. The user enters all profile details. The token is never written to storage, sent to LinkedIn, embedded in a URL or exposed to page content. It is cleared after each save and when the popup closes. Requests omit cookies and reject redirects.

`optional_host_permissions` declares HTTPS origins so self-hosted CRM installations are supported; Chrome grants only the exact CRM origin the user chooses and approves at save time. Existing host grants can be removed through Chrome's extension settings. Use a scoped workspace API token and the matching workspace ID. The extension rejects non-profile LinkedIn tabs and invalid/insecure CRM origins.

Validation functions have Bun tests; the popup requires a manual Chrome installation smoke test with the deployed authenticated CRM. No live credentials or production requests were used during implementation.
