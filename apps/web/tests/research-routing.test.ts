import { expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  researchRoute,
  researchSelection,
} from "../src/shared/meri-conversations/research-context";
import { conversationHref } from "../src/shared/meri-conversations/conversation-navigation";
import {
  receiveResearchConversation,
  researchLaunchOwner,
} from "../src/features/meri/conversation/research-launch";
import { conversationSelectionOwner } from "../src/shared/meri-conversations/query-journal";
import { syncMeriTabIdentity } from "../src/shared/meri-conversations/tab-journal";
import { conversationInClient } from "../src/shared/meri-conversations/history-pages";
import { meriResearchConversationOperations as operations } from "../src/shared/capiro/operations/meri-research-conversation";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const account = { tenantId: id(1), actorId: id(2) };
const capture = {
  kind: "research_portfolio" as const,
  researchPortfolioId: id(3),
  researchPortfolioName: "Original Research",
  researchPortfolioRevision: 4,
  scopeVersion: "a".repeat(64),
};
const row = {
  id: id(4),
  tenantId: account.tenantId,
  userId: account.actorId,
  clientId: null,
  status: "active",
  archivedAt: null,
  trashedAt: null,
  metadata: {
    researchPortfolioScope: {
      ...capture,
      currentResearchPortfolioName: "Renamed",
      stale: true,
    },
  },
};
const research = researchSelection(account, row.id, capture);
function storage() {
  const data = new Map<string, string>();
  const store = {
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
  syncMeriTabIdentity("synthetic-account", store);
  return store;
}
it("uses the existing route for launch and explicit Research history, with no capture in URLs", () => {
  expect(
    researchRoute(new URLSearchParams(`researchPortfolioId=${id(3)}`)),
  ).toEqual({
    state: "research",
    portfolioId: id(3),
    conversationId: undefined,
  });
  const href = conversationHref(
    { scopeKind: "research_portfolio", clientId: null },
    id(4),
  );
  expect(href).toBe(`/meri?scope=research_portfolio&conversationId=${id(4)}`);
  expect(
    researchRoute(new URL(href, "https://example.test").searchParams)?.state,
  ).toBe("research");
  expect(conversationHref(null, id(4))).toContain("scope=general");
  expect(conversationHref(id(5), id(4))).toContain(`clientId=${id(5)}`);
});
it.each([
  `researchPortfolioId=${id(3)}&clientId=${id(5)}`,
  `researchPortfolioId=${id(3)}&scope=general`,
  `researchPortfolioId=${id(3)}&researchPortfolioId=${id(3)}`,
  "scope=research_portfolio",
  `scope=research_portfolio&scope=research_portfolio&conversationId=${id(4)}`,
  `scope=research_portfolio&conversationId=${id(4)}&prospectId=${id(5)}`,
  "researchPortfolioId=",
  `scope=research_portfolio&conversationId=${id(4)}&conversationId=${id(4)}`,
])("refuses conflicting/incomplete Research selectors: %s", (query) => {
  expect(researchRoute(new URLSearchParams(query))).toEqual({
    state: "invalid",
  });
});
it("keeps the immutable capture through stale current metadata and snapshots it", () => {
  const selected = receiveResearchConversation(row, account, {
    conversationId: id(4),
    portfolioId: id(3),
  });
  expect(selected.scope).toEqual(capture);
  expect(Object.isFrozen(selected.scope)).toBe(true);
  expect(Object.keys(selected.scope)).toHaveLength(5);
});
it.each([
  { tenantId: id(9) },
  { userId: id(9) },
  { clientId: id(9) },
  { status: "archived" },
  { archivedAt: "2026-10-31T00:00:00Z" },
  { trashedAt: "2026-10-31T00:00:00Z" },
  { metadata: {} },
  { metadata: { researchPortfolioScope: { ...capture, scopeVersion: "bad" } } },
])("refuses wrong owner/lifecycle/capture metadata", (change) => {
  expect(() =>
    receiveResearchConversation({ ...row, ...change }, account, {}),
  ).toThrow();
});
it("refuses retargeted conversation or portfolio rather than selecting a replacement", () => {
  expect(() =>
    receiveResearchConversation(row, account, { conversationId: id(9) }),
  ).toThrow();
  expect(() =>
    receiveResearchConversation(row, account, { portfolioId: id(9) }),
  ).toThrow();
});
it("retains unknown creation before dispatch, blocking double click, lost replies and remount replay", async () => {
  const store = storage(),
    owner = researchLaunchOwner(account, id(3), store);
  const send = vi.fn(async () => {
    expect(owner.read()).toEqual({ state: "unknown" });
    throw Error("lost");
  });
  await expect(
    owner.create(send, new AbortController().signal),
  ).rejects.toThrow("lost");
  await expect(
    researchLaunchOwner(account, id(3), store).create(
      send,
      new AbortController().signal,
    ),
  ).rejects.toThrow();
  expect(send).toHaveBeenCalledTimes(1);
});
it("retains only the confirmed conversation identity; a later read must resolve authority again", async () => {
  const store = storage(),
    owner = researchLaunchOwner(account, id(3), store);
  await owner.create(async () => row, new AbortController().signal);
  expect(researchLaunchOwner(account, id(3), store).read()).toEqual({
    state: "created",
    conversationId: row.id,
  });
});
it("does not dispatch when persistence fails or the account lifetime has ended", async () => {
  const store = storage(),
    send = vi.fn(async () => row),
    controller = new AbortController();
  controller.abort();
  await expect(
    researchLaunchOwner(account, id(3), store).create(send, controller.signal),
  ).rejects.toThrow();
  const broken = {
    ...store,
    setItem: () => {
      throw Error("quota");
    },
  };
  await expect(
    researchLaunchOwner(account, id(3), broken).create(
      send,
      new AbortController().signal,
    ),
  ).rejects.toThrow();
  expect(send).not.toHaveBeenCalled();
});
it("withholds a late creation result after cancellation, keeping its unknown marker", async () => {
  const owner = researchLaunchOwner(account, id(3), storage()),
    controller = new AbortController();
  await expect(
    owner.create(async () => {
      controller.abort();
      return row;
    }, controller.signal),
  ).rejects.toThrow();
  expect(owner.read()).toEqual({ state: "unknown" });
});
it("selection recovery retains Research capture and cannot consume General or altered-capture runs", () => {
  const cache = new QueryClient(),
    store = storage();
  const general = conversationSelectionOwner(
    cache,
    account,
    null,
    row.id,
    store,
  );
  general.record({
    ...account,
    selectedClientId: null,
    conversationId: row.id,
    runId: id(8),
  });
  const owner = conversationSelectionOwner(
    cache,
    account,
    null,
    row.id,
    store,
    research,
  );
  expect(owner.hints).toEqual({ ...research, clientId: null });
  const context = {
    ...account,
    selectedClientId: null,
    ...research,
    runId: id(7),
  };
  owner.record(context);
  expect(
    conversationSelectionOwner(cache, account, null, row.id, store, research)
      .hints,
  ).toEqual({ ...research, clientId: null, runId: id(7) });
  expect(() =>
    owner.record({
      ...context,
      scope: { ...capture, researchPortfolioName: "Changed" },
    }),
  ).toThrow();
  expect(() => general.record(context)).toThrow();
  const changed = researchSelection(account, row.id, {
    ...capture,
    researchPortfolioRevision: 5,
  });
  expect(
    conversationSelectionOwner(cache, account, null, row.id, store, changed)
      .hints,
  ).not.toHaveProperty("runId");
});
it("Research history uses private-user as storage only and stays on its exact captured conversation", () => {
  const conversation: Parameters<typeof conversationInClient>[0] = {
    conversationId: row.id,
    owner: account,
    createdAt: "2026-10-31T00:00:00Z",
    policyRevision: "1",
    scopes: [
      {
        tenantId: account.tenantId,
        kind: "private-user" as const,
        resourceId: account.actorId,
        policyRevision: "1",
      },
    ],
  };
  expect(conversationInClient(conversation, account, null, research)).toBe(
    true,
  );
  expect(
    conversationInClient(
      { ...conversation, conversationId: id(9) },
      account,
      null,
      research,
    ),
  ).toBe(false);
  expect(conversationInClient(conversation, account, id(5), research)).toBe(
    false,
  );
});
it("gateway operations expose only canonical create ID and exact read ID, never grant/capture claims", () => {
  expect(
    operations["meri.research.conversation.create"].request.safeParse({
      body: { researchPortfolioId: id(3), scope: capture },
    }).success,
  ).toBe(false);
  expect(
    operations["meri.research.conversation.read"].request.safeParse({
      params: { id: row.id },
    }).success,
  ).toBe(true);
  expect(operations["meri.research.conversation.create"].path).toBe(
    "/clio/conversations",
  );
});
