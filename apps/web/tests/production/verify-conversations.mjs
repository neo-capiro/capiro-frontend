import assert from "node:assert/strict";

/** Actual default-closed standalone routes, without credentials or service calls. */
export async function verifyConversationHttp(origin) {
  const local = new URL(origin);
  local.hostname = "localhost";
  const results = [];
  for (const [path, method] of [
    ["/api/conversations/submit", "POST"],
    ["/api/conversations/history", "POST"],
    ["/api/conversations/cancel", "POST"],
    ["/api/conversations/events", "POST"],
    [
      "/api/conversations/events/30000000-0000-4000-8000-000000000003/stream",
      "GET",
    ],
  ]) {
    const response = await fetch(local.origin + path, {
      method,
      headers: {
        Origin: local.origin,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body: "{}" } : {}),
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    assert.equal(response.status, 502, path);
    assert.deepEqual(await response.json(), {
      error: { code: "CONVERSATION_UNAVAILABLE" },
    });
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("set-cookie"), null);
    results.push({ path, status: response.status, configured: false });
  }
  return results;
}
