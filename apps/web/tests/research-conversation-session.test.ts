import { createHash } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import {
  bootstrapConversationSession,
  conversationSessionHints,
  type ConversationSessionHints,
} from "../src/shared/meri-conversations/session";
import { ConversationHostController } from "../src/shared/meri-conversations/host-controller";
import { proxyActionRequest } from "../src/shared/meri-actions/proxy";
import type { ConversationSessionReceipt } from "@capiro/meri-contracts/conversation-session";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const account = { tenantId: id(1), actorId: id(2) };
const capture = () => {
  const fields = {
    kind: "research_portfolio" as const,
    researchPortfolioId: id(5),
    researchPortfolioName: "Captured portfolio",
    researchPortfolioRevision: 1,
  };
  return {
    ...fields,
    scopeVersion: createHash("sha256")
      .update(JSON.stringify(fields))
      .digest("hex"),
  };
};
const hints = () => ({
  conversationId: id(3),
  clientId: null,
  scopeKind: "research_portfolio" as const,
  scope: capture(),
});
const receipt = (): ConversationSessionReceipt => ({
  credential: `action_session_${"a".repeat(43)}`,
  expiresAtMs: 61_000,
  context: {
    ...account,
    conversationId: id(3),
    runId: id(4),
    selectedClientId: null,
    scopeKind: "research_portfolio",
    scope: capture(),
  },
});
const origin = "https://frontend.synthetic.invalid";
const config = {
  enabled: true,
  baseUrl: "https://meri.synthetic.invalid",
  requestOrigin: origin,
};
const request = (body: unknown, route = "session") =>
  new Request(`${origin}/api/action-followthrough/${route}`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.useRealTimers();
});

it("actual proxy forwards only the explicit Research selector and receives the exact local capture", async () => {
  const upstream = vi.fn<typeof fetch>(async () => Response.json(receipt()));
  const frontend: typeof fetch = async (_url, init) =>
    proxyActionRequest(
      request(JSON.parse(String(init?.body))),
      "session",
      config,
      async () => "synthetic-native-token",
      upstream,
    );
  const value = await bootstrapConversationSession(
    hints(),
    account,
    new AbortController().signal,
    frontend,
    () => 1000,
  );
  expect(value).toEqual(receipt());
  expect(JSON.parse(String(upstream.mock.lastCall?.[1]?.body))).toEqual({
    clientId: null,
    conversationId: id(3),
    scopeKind: "research_portfolio",
  });
  expect(
    new Headers(upstream.mock.lastCall?.[1]?.headers).get("authorization"),
  ).toBe("Bearer synthetic-native-token");
  expect(upstream).toHaveBeenCalledOnce();
});

it("browser renewal keeps the Research selector and the exact bound run", async () => {
  const upstream = vi.fn<typeof fetch>(async () => Response.json(receipt()));
  const frontend: typeof fetch = async (url, init) => {
    expect(String(url)).toBe("/api/action-followthrough/browser-session");
    return proxyActionRequest(
      request(JSON.parse(String(init?.body)), "browser-session"),
      "browser-session",
      config,
      async () => "synthetic-native-token",
      upstream,
    );
  };
  await expect(
    bootstrapConversationSession(
      { ...hints(), runId: id(4) },
      account,
      new AbortController().signal,
      frontend,
      () => 1000,
      "browser",
    ),
  ).resolves.toEqual(receipt());
  expect(JSON.parse(String(upstream.mock.lastCall?.[1]?.body))).toEqual({
    clientId: null,
    conversationId: id(3),
    runId: id(4),
    scopeKind: "research_portfolio",
  });
  expect(upstream).toHaveBeenCalledOnce();
});

it.each(["session", "browser-session"])(
  "%s wire refuses capture, portfolio identity and grant-shaped fields",
  async (route) => {
    const selector = {
      clientId: null,
      conversationId: id(3),
      runId: id(4),
      scopeKind: "research_portfolio",
    };
    for (const extra of [
      { scope: capture() },
      { researchPortfolioId: id(5) },
      { grant: true },
      { currentResearchPortfolioRevision: 2 },
    ]) {
      const upstream = vi.fn();
      expect(
        (
          await proxyActionRequest(
            request({ ...selector, ...extra }, route),
            route,
            config,
            async () => "synthetic-native-token",
            upstream,
          )
        ).status,
      ).toBe(502);
      expect(upstream).not.toHaveBeenCalled();
    }
  },
);

it("missing or malformed local capture refuses before issuance instead of selecting General", async () => {
  const { scope, ...missing } = hints();
  expect(() => conversationSessionHints.parse(missing)).toThrow();
  for (const value of [
    missing,
    { ...hints(), scope: { ...scope, stale: false } },
    { ...hints(), scope: { ...scope, researchPortfolioName: " " } },
  ]) {
    const fetcher = vi.fn();
    await expect(
      bootstrapConversationSession(
        value as ConversationSessionHints,
        account,
        new AbortController().signal,
        fetcher,
        () => 1000,
      ),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  }
});

it.each(["General", "capture", "denied"])(
  "%s response cannot clear the Research discriminator or trigger a General fallback",
  async (kind) => {
    const r = receipt();
    if (kind === "General")
      r.context = {
        ...account,
        conversationId: id(3),
        runId: id(4),
        selectedClientId: null,
      };
    if (kind === "capture" && "scope" in r.context)
      r.context.scope.researchPortfolioRevision = 2;
    const fetcher = vi.fn<typeof fetch>(async () =>
      kind === "denied"
        ? new Response(null, { status: 403 })
        : Response.json(r),
    );
    await expect(
      bootstrapConversationSession(
        hints(),
        account,
        new AbortController().signal,
        fetcher,
        () => 1000,
      ),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetcher.mock.lastCall?.[1]?.body)).scopeKind).toBe(
      "research_portfolio",
    );
  },
);

it("the actual host retains immutable Research scope and exact bound run through reconnect", async () => {
  const input = hints();
  let next = receipt();
  const fetcher = vi.fn<typeof fetch>(async (url) => {
    expect(String(url)).toBe("/api/action-followthrough/session");
    return Response.json(next);
  });
  const host = new ConversationHostController({
    hints: input,
    account,
    fetcher,
    now: () => 1000,
    retryDelaysMs: [],
  });
  cleanups.push(host.attach());
  input.scope.researchPortfolioName = "Caller mutation";
  await host.connect();
  expect(host.getSnapshot().status).toBe("ready");
  host.revoke();
  await host.connect();
  expect(host.getSnapshot().status).toBe("ready");
  expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({
    clientId: null,
    conversationId: id(3),
    runId: id(4),
    scopeKind: "research_portfolio",
  });
  next = receipt();
  if ("scope" in next.context)
    next.context.scope.researchPortfolioName =
      "Fresh name cannot replace capture";
  host.revoke();
  await host.connect();
  expect(host.getSnapshot().status).toBe("unavailable");
  expect(fetcher).toHaveBeenCalledTimes(3);
});
