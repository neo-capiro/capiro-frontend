import { describe, expect, it } from "vitest";
import { conversationHistoryMetadata as protocol } from "@capiro/meri-contracts/conversation-history";
import { createHistoryTransportDiagnostics } from "../src/shared/meri-conversations/history-diagnostics";
import { proxyConversationHistory } from "../src/shared/meri-conversations/history-proxy";
import { proxyActionRequest } from "../src/shared/meri-actions/proxy";
import {
  conversation,
  turn,
  initialEvents,
} from "../test/browser/meri-history-fixtures";

/**
 * The three failures a disconnect report cannot separate today: the server could not acquire its
 * credential, the request to control never completed, or control answered something this receiver
 * cannot admit. Synthetic only; every fetch and credential is injected.
 */
const origin = "https://frontend.example";
const tokenValue = "synthetic-native-membership";
const token = async () => tokenValue;
const conversationId = "30000000-0000-4000-8000-000000000003";
const promptText = "synthetic unsent draft text";
const historyConfig = {
  enabled: true,
  baseUrl: "https://meri.example",
  frontendOrigin: origin,
};
const actionConfig = {
  enabled: true,
  baseUrl: "https://meri.example",
  requestOrigin: origin,
};
const historyRequest = (path = "transcript", body: unknown = {}) =>
  new Request(`${origin}/api/conversations/${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { Origin: origin, "Content-Type": "application/json" },
  });
const actionRequest = (
  path = "session",
  body: unknown = { conversationId, clientId: null },
) =>
  new Request(`${origin}/api/action-followthrough/${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { Origin: origin, "Content-Type": "application/json" },
  });
const json = (body: unknown, status = 200) => Response.json(body, { status });
const gatewayPage = async () =>
  new Response("<html><body>502 Bad Gateway</body></html>", {
    status: 502,
    headers: { "Content-Type": "text/html" },
  });
const fetchFails = async () => {
  throw new TypeError("fetch failed");
};
const saved = turn();
const selector = {
  conversationId: conversation.conversationId,
  after: 0,
  limit: protocol.limits.pageItems,
};
const transcript = {
  schema: "meri.conversation-transcript/1",
  conversation,
  latestRun: saved.run,
  latestSequenceBase: 0,
  turns: [saved],
  events: initialEvents,
  nextSequence: 2,
  lastSequence: 2,
  hasMore: false,
  pendingTurn: null,
};

function recorder() {
  const lines: string[] = [];
  const begin = createHistoryTransportDiagnostics({
    event: "MERI_CONVERSATION_FE",
    write: (line: string) => lines.push(line),
    now: () => 0,
  });
  return { lines, begin };
}
const parsed = (lines: string[]) =>
  lines.map((line) => JSON.parse(line) as Record<string, unknown>);

describe("conversation proxy transport diagnostics", () => {
  it("separates a credential-stage failure from a transport failure and an unreadable answer", async () => {
    const credential = recorder();
    expect(
      (
        await proxyConversationHistory(
          historyRequest("transcript", selector),
          "transcript",
          historyConfig,
          async () => {
            throw new Error(promptText);
          },
          fetchFails,
          credential.begin,
        )
      ).status,
    ).toBe(502);

    const transport = recorder();
    expect(
      (
        await proxyConversationHistory(
          historyRequest("transcript", selector),
          "transcript",
          historyConfig,
          token,
          fetchFails,
          transport.begin,
        )
      ).status,
    ).toBe(502);

    const unreadable = recorder();
    expect(
      (
        await proxyConversationHistory(
          historyRequest("transcript", selector),
          "transcript",
          historyConfig,
          token,
          gatewayPage,
          unreadable.begin,
        )
      ).status,
    ).toBe(502);

    const held = parsed(credential.lines)[0]!;
    const lost = parsed(transport.lines)[0]!;
    const unread = parsed(unreadable.lines)[0]!;

    expect(held).toMatchObject({
      event: "MERI_CONVERSATION_FE",
      operation: "/api/conversations/transcript",
      stage: "session",
      outcome: "failure",
      status: 502,
      upstreamStatus: 0,
    });
    expect(lost).toMatchObject({ stage: "fetch", outcome: "failure" });
    expect(unread).toMatchObject({
      stage: "receive",
      outcome: "failure",
      upstreamStatus: 502,
    });
    // The three categories are three stages, not one indistinguishable code.
    expect(new Set([held.stage, lost.stage, unread.stage]).size).toBe(3);
  });

  it("records a served read as an upstream response", async () => {
    const served = recorder();
    const response = await proxyConversationHistory(
      historyRequest("transcript", selector),
      "transcript",
      historyConfig,
      token,
      async () => json(transcript),
      served.begin,
    );
    expect(response.status).toBe(200);
    expect(parsed(served.lines)[0]).toMatchObject({
      stage: "receive",
      outcome: "upstream_response",
      status: 200,
      upstreamStatus: 200,
    });
  });

  it("names the action route, including session issuance", async () => {
    const held = recorder();
    expect(
      (
        await proxyActionRequest(
          actionRequest(),
          "session",
          actionConfig,
          async () => {
            throw new Error(promptText);
          },
          fetchFails,
          held.begin,
        )
      ).status,
    ).toBe(502);
    const lost = recorder();
    expect(
      (
        await proxyActionRequest(
          actionRequest(),
          "session",
          actionConfig,
          token,
          fetchFails,
          lost.begin,
        )
      ).status,
    ).toBe(502);

    expect(parsed(held.lines)[0]).toMatchObject({
      operation: "/api/action-followthrough/session",
      stage: "session",
      outcome: "failure",
    });
    expect(parsed(lost.lines)[0]).toMatchObject({
      operation: "/api/action-followthrough/session",
      stage: "fetch",
      outcome: "failure",
    });
  });

  it("emits no credential, selector, message or header text", async () => {
    const { lines, begin } = recorder();
    await proxyConversationHistory(
      historyRequest("transcript", selector),
      "transcript",
      historyConfig,
      async () => {
        throw new Error(promptText);
      },
      fetchFails,
      begin,
    );
    await proxyActionRequest(
      actionRequest(),
      "session",
      actionConfig,
      token,
      fetchFails,
      begin,
    );
    const raw = lines.join("\n");
    for (const secret of [
      tokenValue,
      conversationId,
      promptText,
      "Bearer",
      "authorization",
      "fetch failed",
      origin,
      "meri.example",
    ])
      expect(raw).not.toContain(secret);
    for (const line of parsed(lines))
      expect(Object.keys(line).sort()).toEqual(
        [
          "event",
          "operation",
          "outcome",
          "stage",
          "status",
          "trace",
          "upstreamStatus",
        ].sort(),
      );
    expect(parsed(lines)[0]!.trace).toMatch(/^h1_[0-9a-f]{32}$/);
  });

  it("accepts only a public route as the operation label", () => {
    const lines: string[] = [];
    const begin = createHistoryTransportDiagnostics({
      write: (line: string) => lines.push(line),
      now: () => 0,
    });
    for (const operation of [
      "https://foreign.example/api/conversations/transcript",
      `/api/conversations/transcript?conversationId=${conversationId}`,
      "/api/conversations/../../etc/passwd",
      "user@example.test",
    ])
      begin(operation)?.finish(502, "failure");
    expect(lines).toHaveLength(4);
    for (const line of parsed(lines))
      expect(line).not.toHaveProperty("operation");
    begin("/api/conversations/summaries")?.finish(502, "failure");
    expect(parsed(lines)[4]).toMatchObject({
      operation: "/api/conversations/summaries",
    });
  });

  it("keeps the read contract and its response bytes unchanged", async () => {
    const { begin, lines } = recorder();
    const answered = await proxyConversationHistory(
      historyRequest("list", {}),
      "list",
      historyConfig,
      token,
      async () => json(transcript),
      begin,
    );
    // A list route cannot admit a transcript body: the same 502 the proxy answered before.
    expect(answered.status).toBe(502);
    expect(await answered.json()).toEqual({
      error: { code: "PRODUCT_UNAVAILABLE" },
    });
    expect(lines).toHaveLength(1);
  });

  it("records a post-credential request failure as the request stage", async () => {
    // The reviewer's reproduced case: a valid native credential and a malformed body.
    const malformed = new Request(
      `${origin}/api/action-followthrough/session`,
      {
        method: "POST",
        body: "{",
        headers: { Origin: origin, "Content-Type": "application/json" },
      },
    );
    const { begin, lines } = recorder();
    const response = await proxyActionRequest(
      malformed,
      "session",
      actionConfig,
      token,
      fetchFails,
      begin,
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: { code: "FRONTEND_ACTION_UNAVAILABLE" },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(parsed(lines)[0]).toMatchObject({
      operation: "/api/action-followthrough/session",
      stage: "request",
      outcome: "failure",
      status: 502,
      upstreamStatus: 0,
    });
  });

  it("records the disabled action configuration as the configuration stage", async () => {
    const { begin, lines } = recorder();
    const response = await proxyActionRequest(
      actionRequest(),
      "session",
      { ...actionConfig, enabled: false },
      token,
      fetchFails,
      begin,
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { code: "FRONTEND_ACTION_UNAVAILABLE" },
    });
    expect(parsed(lines)[0]).toMatchObject({
      stage: "configuration",
      outcome: "local_response",
      status: 503,
    });
  });

  it("records the disabled read configuration as the configuration stage", async () => {
    const { begin, lines } = recorder();
    const response = await proxyConversationHistory(
      historyRequest("transcript", selector),
      "transcript",
      { ...historyConfig, enabled: false },
      token,
      fetchFails,
      begin,
    );
    expect(response.status).toBe(503);
    expect(parsed(lines)[0]).toMatchObject({
      operation: "/api/conversations/transcript",
      stage: "configuration",
      outcome: "local_response",
      status: 503,
    });
  });
});
