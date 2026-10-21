export function crmOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || !url.hostname.includes('.') || url.hostname.includes(':') || /^(?:\d+\.){3}\d+$/.test(url.hostname) || /(^|\.)linkedin\.com$/.test(url.hostname)) {
    throw new Error('Enter only your public HTTPS CRM origin, such as https://crm.example.com.');
  }
  return url.origin;
}

export function profileUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !['www.linkedin.com', 'linkedin.com'].includes(url.hostname) || !/^\/in\/[^/]+\/?$/.test(url.pathname)) {
    throw new Error('Open a LinkedIn profile tab before capturing.');
  }
  url.hostname = 'www.linkedin.com';
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url.toString();
}
