export function json(data, status = 200) {
  return Response.json(data, { status });
}

export function fail(status, message) {
  return Object.assign(new Error(message), { status });
}

export async function readBody(request, maxBytes = 1048576) {
  if (Number(request.headers.get("content-length") || 0) > maxBytes) throw fail(413, "Request is too large");
  const reader = request.body?.getReader();
  if (!reader) throw fail(400, "JSON body is required");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw fail(413, "Request is too large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let data;
  try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw fail(400, "Invalid JSON"); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw fail(400, "JSON object is required");
  return data;
}

export function text(value, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function rows(env, sql, ...values) {
  return (await env.DB.prepare(sql).bind(...values).all()).results;
}
