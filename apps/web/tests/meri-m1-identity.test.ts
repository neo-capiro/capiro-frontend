import { afterEach, expect, it, vi } from "vitest";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { USER_PREFERENCE_DEFAULTS } from "@capiro/meri-client/user-preferences";
import { clearConversationReads } from "../src/shared/meri-conversations/history-queries";
import {
  ConversationView,
  SessionComposer,
} from "../src/features/meri/conversation/ConversationView";
import { createConversationComposer } from "../src/features/meri/conversation/conversation-composer";

import { ConversationHostController } from "../src/shared/meri-conversations/host-controller";
import { ALL_TYPED_SKILL_IDS } from "../src/features/meri/conversation/quick-action-gate";

const context = {
  tenantId: "m1-tenant",
  actorId: "m1-native-actor",
  selectedClientId: "10000000-0000-4000-8000-000000000001",
  conversationId: "20000000-0000-4000-8000-000000000001",
  runId: "30000000-0000-4000-8000-000000000001",
};
const exact = {
  clientId: context.selectedClientId,
  conversationId: context.conversationId,
  runId: context.runId,
};
const account = { tenantId: context.tenantId, actorId: context.actorId };
const session = (ttl: number) =>
  Response.json({
    credential: `action_session_${"s".repeat(43)}`,
    expiresAtMs: Date.now() + ttl,
    context,
  });
const startClock = () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-21T12:00:00Z"));
};
afterEach(() => vi.useRealTimers());

it("two short-session renewal cycles preserve the admitted run without allocating or cancelling work", async () => {
  startClock();
  const calls: unknown[] = [];
  const host = new ConversationHostController({
    hints: { clientId: context.selectedClientId },
    account,
    fetcher: async (url, init) => {
      calls.push([url, JSON.parse(String(init?.body))]);
      return session(60_000);
    },
  });
  const detach = host.attach();
  try {
    await host.connect();
    for (let cycle = 0; cycle < 2; cycle++) {
      const current = host.getSnapshot();
      if (current.status !== "ready") throw new Error("Expected ready host");
      await vi.advanceTimersByTimeAsync(15_000);
      expect(host.getSnapshot().status).toBe("expired");
      expect(host.getExpirationReason()).toBe("renewal");
      expect(current.port.getSnapshot().status).toBe("disposed");
      await host.connect();
      const renewed = host.getSnapshot();
      expect(renewed.status).toBe("ready");
      if (renewed.status !== "ready") throw new Error("Expected renewed host");
      expect(renewed.port.context).toEqual(context);
    }
    expect(calls).toEqual([
      ["/api/action-followthrough/session", { clientId: exact.clientId }],
      ["/api/action-followthrough/session", exact],
      ["/api/action-followthrough/session", exact],
    ]);
  } finally {
    detach();
  }
});

it("a membership refusal aborts the current reader and remains a denial before the issued cap", async () => {
  startClock();
  const calls: string[] = [];
  let readSignal: AbortSignal | null | undefined;
  const host = new ConversationHostController({
    hints: exact,
    account,
    fetcher: async (url, init) => {
      calls.push(String(url));
      if (calls.length === 1) return session(300_000);
      readSignal = init?.signal;
      return Response.json(
        { error: { code: "SESSION_REFUSED" } },
        { status: 403 },
      );
    },
  });
  const detach = host.attach();
  try {
    await host.connect();
    await vi.advanceTimersByTimeAsync(70_000);
    const ready = host.getSnapshot();
    if (ready.status !== "ready") throw new Error("Expected ready host");
    await expect(ready.port.history()).rejects.toThrow();
    expect(host.getSnapshot().status).toBe("expired");
    expect(host.getExpirationReason()).toBe("access-lost");
    expect(readSignal?.aborted).toBe(true);
    expect(ready.port.getSnapshot().status).toBe("disposed");
    await vi.advanceTimersByTimeAsync(300_000);
    expect(calls).toEqual([
      "/api/action-followthrough/session",
      "/api/conversations/history",
    ]);
  } finally {
    detach();
  }
});

it("the port's earlier-registered expiry timer does not turn natural expiry into membership loss", async () => {
  startClock();
  const host = new ConversationHostController({
    hints: exact,
    account,
    fetcher: async () => session(1_000),
  });
  const detach = host.attach();
  try {
    await host.connect();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(host.getSnapshot().status).toBe("expired");
    expect(host.getExpirationReason()).toBe("expiry");
    await host.connect();
    expect(host.getSnapshot().status).toBe("ready");
    expect(host.getExpirationReason()).toBeUndefined();
  } finally {
    detach();
  }
});

it("a denied bootstrap exhausts only its bounded issuance retries and records lost access", async () => {
  startClock();
  for (const status of [401, 403]) {
    const fetcher = vi.fn(async () => Response.json({}, { status }));
    const host = new ConversationHostController({
      hints: exact,
      account,
      fetcher,
    });
    const detach = host.attach();
    try {
      const connect = host.connect();
      await vi.advanceTimersByTimeAsync(4_000);
      await connect;
      expect(host.getSnapshot().status).toBe("unavailable");
      expect(host.getExpirationReason()).toBe("access-lost");
      expect(fetcher).toHaveBeenCalledTimes(status === 401 ? 3 : 1);
      await vi.advanceTimersByTimeAsync(300_000);
      expect(fetcher).toHaveBeenCalledTimes(status === 401 ? 3 : 1);
    } finally {
      detach();
    }
  }
});

it("access loss aborts private reads and rejects a late response without erasing exact command identity", async () => {
  const cache = new QueryClient();
  const key = [
    "meri-conversation-transcript",
    account.tenantId,
    account.actorId,
    exact.clientId,
    exact.conversationId,
  ];
  const journal = [
    "meri-conversation-intent",
    account.tenantId,
    account.actorId,
    exact.conversationId,
    exact.runId,
    exact.clientId,
  ];
  const other = [
    "meri-conversation-transcript",
    account.tenantId,
    account.actorId,
    "different-client",
    exact.conversationId,
  ];
  cache.setQueryData(journal, { requestId: "immutable-request" });
  cache.setQueryData(other, { content: "other scope" });
  let signal: AbortSignal | undefined;
  let complete!: (data: unknown) => void;
  const pending = cache
    .fetchQuery({
      queryKey: key,
      queryFn: (request) => {
        signal = request.signal;
        return new Promise((resolve) => {
          complete = resolve;
        });
      },
    })
    .catch(() => undefined);
  clearConversationReads(cache, account, exact.clientId);
  expect(signal?.aborted).toBe(true);
  complete({ content: "late private answer" });
  await pending;
  expect(cache.getQueryData(key)).toBeUndefined();
  expect(cache.getQueryData(journal)).toEqual({
    requestId: "immutable-request",
  });
  expect(cache.getQueryData(other)).toEqual({ content: "other scope" });
  cache.clear();
});

it("the denied view hides saved, pending and draft content through connecting and failed explicit retry", () => {
  for (const status of ["expired", "connecting", "unavailable"]) {
    const session = {
      accessLost: true,
      connection: { state: { status }, pending: "Private pending prompt" },
      earlier: [{ runId: "old-run", prompt: "Private saved prompt" }],
      draft: "Private unsent draft",
      continuation: {},
      skillSelection: {},
      modelCatalog: { document: undefined, loading: false, refresh: vi.fn() },
      setDraft: () => undefined,
      textarea: { current: null },
    } as unknown as ComponentProps<typeof ConversationView>["session"];
    const html = renderToStaticMarkup(
      createElement(ConversationView, { session, scope: "Client" }),
    );
    expect(html).not.toContain("Private");
    expect(html).toContain(
      status === "connecting"
        ? "Checking conversation access…"
        : "Conversation access unavailable",
    );
    expect(html).not.toContain("Conversation session expired");
    expect(html).not.toContain(">Reconnect<");
    expect(html).not.toContain("Model choices unavailable");
    expect(html).not.toContain("Reload models");
    expect(
      html.match(/<button[^>]*aria-label="Send message"[^>]*>/)?.[0],
    ).toContain("disabled");
  }
});

it("available conversation access preserves catalog failure recovery and shows models after recovery", () => {
  const refresh = vi.fn();
  const session = {
    accessLost: false,
    connection: { state: { status: "connecting" } },
    earlier: [],
    draft: "",
    skillSelection: {},
    modelCatalog: { document: undefined, loading: false, refresh },
    setDraft: () => undefined,
    textarea: { current: null },
  } as unknown as ComponentProps<typeof SessionComposer>["session"];
  const render = () =>
    renderToStaticMarkup(
      createElement(SessionComposer, {
        session,
        scope: "General",
        channel: createConversationComposer(),
        gate: { status: "on", available: ALL_TYPED_SKILL_IDS },
        // The model control is one of the optional Tools-panel settings.
        toolsOpen: true,
        onToggleTools: () => undefined,
      }),
    );
  const failed = render();
  expect(failed).toContain("Model choices unavailable");
  expect(failed).toMatch(/<button type="button">Reload models<\/button>/);
  expect(failed).not.toContain("Model for next message");

  const selection = {
    provider: "bedrock" as const,
    modelId: "synthetic-qualified",
    effort: null,
  };
  session.modelCatalog.document = {
    owner: account,
    revision: 1,
    preferences: USER_PREFERENCE_DEFAULTS,
    modelCatalog: {
      defaultSelection: selection,
      models: [
        {
          ...selection,
          label: "Synthetic qualified",
          efforts: [null],
          available: true,
          unavailableReason: null,
        },
      ],
    },
  };
  session.accessLost = true;
  const denied = render();
  expect(denied).not.toContain("Model for next message");
  expect(denied).not.toContain("Model choices unavailable");
  expect(denied).not.toContain("Reload models");

  session.accessLost = false;
  const recovered = render();
  expect(recovered).toContain("Model for next message");
  expect(recovered).toContain("Use personal default");
  expect(recovered).not.toContain("Model choices unavailable");
  expect(recovered).not.toContain("Reload models");
  expect(refresh).not.toHaveBeenCalled();
});
