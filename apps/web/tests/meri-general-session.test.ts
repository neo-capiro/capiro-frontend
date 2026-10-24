import { expect, it, vi } from "vitest";
import { readConversationTranscript } from "../src/shared/meri-conversations/history-client";
import { proxyActionRequest } from "../src/shared/meri-actions/proxy";
import { bootstrapConversationSession } from "../src/shared/meri-conversations/session";
import { resolveFirstChatConversation } from "../src/shared/meri-conversations/first-chat-bootstrap";
import { readFirstChatIntent } from "../src/shared/meri-conversations/first-chat-intent";

const id = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const account = { tenantId: id(1), actorId: id(2) };
const hints = { conversationId: id(3), clientId: null };
const origin = "https://frontend.synthetic.invalid";
const receipt = () => ({
  credential: `action_session_${"a".repeat(43)}`,
  expiresAtMs: Date.now() + 60_000,
  context: {
    ...account,
    conversationId: id(3),
    runId: id(4),
    selectedClientId: null,
  },
});
const config = {
  enabled: true,
  baseUrl: "https://meri.synthetic.invalid",
  requestOrigin: origin,
};
const request = (body: unknown) =>
  new Request(`${origin}/api/action-followthrough/session`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

it("the actual proxy and canonical public receiver preserve explicit General without adding scopeKind to the receipt", async () => {
  const upstream = vi.fn<typeof fetch>(async () => Response.json(receipt()));
  const frontend: typeof fetch = async (_url, init) =>
    proxyActionRequest(
      request(JSON.parse(String(init?.body))),
      "session",
      config,
      async () => "native-clerk-token",
      upstream,
    );
  const result = await bootstrapConversationSession(
    hints,
    account,
    new AbortController().signal,
    frontend,
  );
  expect(result.context.selectedClientId).toBeNull();
  expect(result.context).not.toHaveProperty("scopeKind");
  expect(upstream).toHaveBeenCalledOnce();
  expect(JSON.parse(String(upstream.mock.lastCall?.[1]?.body))).toEqual(hints);
  expect(
    new Headers(upstream.mock.lastCall?.[1]?.headers).get("authorization"),
  ).toBe("Bearer native-clerk-token");
});

it.each([
  { clientId: null },
  { ...hints, scopeKind: "general" },
  { ...hints, tenantId: id(1) },
])("never forwards ambiguous or extra General hints %#", async (body) => {
  const upstream = vi.fn();
  expect(
    (
      await proxyActionRequest(
        request(body),
        "session",
        config,
        async () => "native",
        upstream,
      )
    ).status,
  ).toBe(502);
  expect(upstream).not.toHaveBeenCalled();
});

it.each([
  { actorId: id(8) },
  { tenantId: id(8) },
  { conversationId: id(8) },
  { selectedClientId: id(8) },
  { scopeKind: "general" },
])(
  "the public receiver rejects substituted or noncanonical General context %#",
  async (change) => {
    const value = receipt();
    const fetcher: typeof fetch = async () =>
      Response.json({ ...value, context: { ...value.context, ...change } });
    await expect(
      bootstrapConversationSession(
        hints,
        account,
        new AbortController().signal,
        fetcher,
      ),
    ).rejects.toThrow();
  },
);

it.each([401, 403])("preserves General session refusal %s", async (status) => {
  const fetcher: typeof fetch = async () =>
    Response.json({ error: { code: "SESSION_REFUSED" } }, { status });
  await expect(
    bootstrapConversationSession(
      hints,
      account,
      new AbortController().signal,
      fetcher,
    ),
  ).rejects.toMatchObject({ status });
});

it("General Core recovery keeps one unknown request and verifies current actor before confirming", async () => {
  const scope = { ...account, clientId: null, scopeKind: "general" as const };
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const issueId = vi.fn(() => id(6)),
    calls: unknown[] = [];
  let state: "lost" | "foreign" | "ok" = "lost";
  const createOrReuse = async (body: unknown) => {
    calls.push(body);
    if (state === "lost") throw Error("lost acknowledgement");
    return {
      ...(body as object),
      ...account,
      conversationId: id(3),
      ...(state === "foreign" ? { actorId: id(8) } : {}),
    };
  };
  const options = {
    scope,
    storage,
    signal: new AbortController().signal,
    issueId,
    createOrReuse,
  };
  await expect(resolveFirstChatConversation(options)).rejects.toThrow(
    "lost acknowledgement",
  );
  expect(readFirstChatIntent(scope, storage)?.state).toBe("pending");
  state = "foreign";
  await expect(resolveFirstChatConversation(options)).rejects.toThrow(
    "binding changed",
  );
  expect(readFirstChatIntent(scope, storage)?.state).toBe("pending");
  state = "ok";
  await expect(resolveFirstChatConversation(options)).resolves.toEqual({
    conversationId: id(3),
    clientId: null,
  });
  expect(new Set(calls.map((value) => JSON.stringify(value))).size).toBe(1);
  expect(issueId).toHaveBeenCalledOnce();
  expect(readFirstChatIntent(scope, storage)?.state).toBe("confirmed");
});

for (const status of [401, 403])
  for (const body of ["malformed", "oversized", "held"] as const)
    it(`history ${status} ${body} body revokes before reading or parsing`, async () => {
      const cancel = vi.fn();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          if (body !== "held")
            controller.enqueue(
              new TextEncoder().encode(
                body === "malformed" ? "not JSON" : "x".repeat(100_000),
              ),
            );
        },
        cancel,
      });
      const fetcher: typeof fetch = async () =>
        new Response(stream, { status });
      await expect(
        readConversationTranscript(
          { conversationId: id(3), after: 0, limit: 100 },
          new AbortController().signal,
          fetcher,
        ),
      ).rejects.toMatchObject({ status, code: "CONVERSATION_ACCESS_DENIED" });
      expect(cancel).toHaveBeenCalledOnce();
    });
it("other malformed history statuses still fail canonical receiver validation", async () => {
  const fetcher: typeof fetch = async () =>
    Response.json({ error: { code: "invented" } }, { status: 503 });
  await expect(
    readConversationTranscript(
      { conversationId: id(3), after: 0, limit: 100 },
      new AbortController().signal,
      fetcher,
    ),
  ).rejects.not.toMatchObject({ code: "CONVERSATION_ACCESS_DENIED" });
});
