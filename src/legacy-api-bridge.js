const LEGACY_API_ROOTS = ["/api/v1/agent", "/api/v1/linkedin", "/api/mail/ingress"];

export function forwardLegacyApi(request, env) {
  if (!env.LEGACY_CRM) return null;
  const path = new URL(request.url).pathname;
  if (!LEGACY_API_ROOTS.some((root) => path === root || path.startsWith(root + "/"))) return null;
  return env.LEGACY_CRM.fetch(request);
}
