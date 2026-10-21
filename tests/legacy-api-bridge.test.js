import { expect, mock, test } from "bun:test";
import { forwardLegacyApi } from "../src/legacy-api-bridge.js";

mock.module("cloudflare:sockets", () => ({ connect() { throw new Error("External sends forbidden in integration tests"); } }));
const { default: worker } = await import("../src/worker.js");

test("only legacy API roots and their child paths reach the fixed service binding", async () => {
  const forwarded = [];
  const env = { LEGACY_CRM: { fetch(request) { forwarded.push(request.url); return new Response("legacy"); } } };
  for (const path of ["/api/v1/agent", "/api/v1/agent/accounts", "/api/v1/linkedin", "/api/v1/linkedin/auth/exchange", "/api/mail/ingress", "/api/mail/ingress/inbound"]) {
    expect(await (await forwardLegacyApi(new Request("https://crm.test" + path), env)).text()).toBe("legacy");
  }
  expect(forwarded).toHaveLength(6);
  for (const path of ["/api/accounts", "/api/auth/login", "/api/v1/agent-evil", "/api/v1/linkedin-evil", "/api/mail/ingress-evil", "/api/assistant/mail"]) {
    expect(forwardLegacyApi(new Request("https://crm.test" + path), env)).toBeNull();
  }
  expect(forwarded).toHaveLength(6);
});

test("bridge preserves the original request, body, authentication, origin and upstream response", async () => {
  const request = new Request("https://crm.test/api/v1/agent/accounts?limit=2", {
    method: "POST",
    headers: { authorization: "Bearer original-agent-key", origin: "https://client.test", "content-type": "application/json" },
    body: JSON.stringify({ name: "Company" }),
  });
  const upstream = new Response("source validation error", { status: 422, headers: { "access-control-allow-origin": "https://client.test" } });
  const response = await worker.fetch(request, { LEGACY_CRM: { async fetch(received) {
    expect(received).toBe(request);
    expect(received.method).toBe("POST");
    expect(received.headers.get("authorization")).toBe("Bearer original-agent-key");
    expect(received.headers.get("origin")).toBe("https://client.test");
    expect(new URL(received.url).search).toBe("?limit=2");
    expect(await received.json()).toEqual({ name: "Company" });
    return upstream;
  } } });
  expect(response).toBe(upstream);
  expect(response.status).toBe(422);
  expect(response.headers.get("access-control-allow-origin")).toBe("https://client.test");
});

test("OPTIONS requests retain the legacy application's CORS response", async () => {
  const upstream = new Response(null, { status: 204, headers: { "access-control-allow-origin": "https://extension.test" } });
  const response = await worker.fetch(new Request("https://crm.test/api/v1/linkedin/auth/exchange", { method: "OPTIONS" }), {
    LEGACY_CRM: { fetch(request) { expect(request.method).toBe("OPTIONS"); return upstream; } },
  });
  expect(response).toBe(upstream);
});

test("missing binding leaves existing routing unchanged", () => {
  expect(forwardLegacyApi(new Request("https://crm.test/api/v1/agent/accounts"), {})).toBeNull();
});

test("app-home redirects are opt-in and lead to the existing app", async () => {
  for (const path of ["/", "/index.html", "/login"]) {
    const response = await worker.fetch(new Request("https://crm.test" + path), { CRM_APP_HOME: "true" });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://crm.test/app");
  }
  for (const env of [{}, { CRM_APP_HOME: "false" }]) {
    const response = await worker.fetch(new Request("https://crm.test/"), env);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<html");
  }
  expect((await worker.fetch(new Request("https://crm.test/app"), { CRM_APP_HOME: "true" })).status).toBe(200);
});
