import { afterEach, expect, it, vi } from "vitest";
import { conversationInitialInputMetadata as initial } from "@capiro/meri-contracts/conversation-initial-input";
import { proxyConversationRequest } from "../src/shared/meri-conversations/proxy";

const origin = "https://frontend.example.test";
const config = {
  enabled: true,
  baseUrl: "https://meri.example.test",
  frontendOrigin: origin,
};
const path = "input/allocate";
const input = {
  requestId: "20000000-0000-4000-8000-000000000002",
  prompt: "Initial proposal",
};
const request = (body: BodyInit = JSON.stringify(input)) =>
  new Request(origin + initial.routes.allocate.path, {
    method: "POST",
    body,
    headers: {
      origin,
      "content-type": "application/json",
      "x-meri-action-session": `action_session_${"s".repeat(43)}`,
    },
  });
afterEach(() => vi.useRealTimers());

it("synthetic allocation response cap uses public128KiB limit and cancels oversize bytes", async () => {
  const cancel = vi.fn();
  const response = await proxyConversationRequest(
    request(),
    path,
    config,
    async () => "native",
    async () =>
      new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(new Uint8Array(initial.limits.responseBytes + 1));
          },
          cancel,
        }),
        { headers: { "content-type": "application/json" } },
      ),
  );
  expect(response.status).toBe(502);
  expect(cancel).toHaveBeenCalledOnce();
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("synthetic allocation deadline bounds a held body and does not invent a negative dispatch outcome", async () => {
  vi.useFakeTimers();
  const cancel = vi.fn();
  let signal: AbortSignal | null | undefined;
  const pending = proxyConversationRequest(
    request(),
    path,
    config,
    async () => "native",
    async (_url, init) => {
      signal = init?.signal;
      return new Response(new ReadableStream({ pull() {}, cancel }), {
        headers: { "content-type": "application/json" },
      });
    },
  );
  await vi.advanceTimersByTimeAsync(initial.limits.maxRequestMs + 1);
  const response = await pending;
  expect(signal?.aborted).toBe(true);
  expect(cancel).toHaveBeenCalled();
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({
    error: { code: "CONVERSATION_UNAVAILABLE" },
  });
});

it("synthetic allocation rejects unreviewed authority fields and malformed UTF8 before fetch", async () => {
  const fetcher = vi.fn();
  for (const body of [
    JSON.stringify({ ...input, binding: { runId: "guessed" } }),
    new Uint8Array([255]),
  ]) {
    const response = await proxyConversationRequest(
      request(body),
      path,
      config,
      async () => "native",
      fetcher,
    );
    expect(response.status).toBe(400);
  }
  expect(fetcher).not.toHaveBeenCalled();
});
