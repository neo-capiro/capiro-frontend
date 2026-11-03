import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import {
  managedTitleQuery,
  managedTitlesView,
  pageTimedOut,
} from "../src/shared/meri-conversations/useManagedConversations";
import { ConversationHistoryUnavailable } from "../src/shared/meri-conversations/history-client";

/**
 * The real title query (react-query's own InfiniteQueryObserver over the production options and
 * the real history client/contracts) is driven against a bounded synthetic fetch port. Every
 * response below is either a contract-admitted page/refusal or a deliberate transport failure.
 */

const ID = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const scope = { tenantId: ID(900), actorId: ID(901) };

const titleRow = (n: number, updatedAt: string) => ({
  conversationId: ID(n),
  title: `Synthetic chat ${n}`,
  status: "active" as const,
  revision: "1",
  scopeKind: "general" as const,
  clientId: null,
  updatedAt,
  archivedAt: null,
  trashedAt: null,
  restoreUntil: null,
  hasTranscript: true,
  canManage: true,
});

/** Descending by updatedAt, one row per minute, so the admitted order and cursor both hold. */
const rowsFrom = (first: number, count: number) =>
  Array.from({ length: count }, (_, index) =>
    titleRow(
      first + index,
      new Date(
        Date.parse("2026-11-03T05:00:00.000Z") - (first + index) * 60_000,
      ).toISOString(),
    ),
  );

const page = (
  first: number,
  count: number,
  more: boolean,
  status: "active" | "archived" | "trashed" = "active",
) => {
  const conversations = rowsFrom(first, count).map((row) => ({
    ...row,
    status,
  }));
  const last = conversations[conversations.length - 1]!;
  return {
    version: "meri.conversation-management.v1",
    conversations,
    nextBefore: more
      ? { updatedAt: last.updatedAt, conversationId: last.conversationId }
      : null,
  };
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

type Reply = () => Response | Promise<Response>;
let replies: Reply[] = [];
const sentBodies: unknown[] = [];
const fetchPort = vi.fn(async (_url: string, init?: RequestInit) => {
  const body = init?.body;
  sentBodies.push(
    body instanceof Uint8Array
      ? JSON.parse(new TextDecoder().decode(body))
      : body,
  );
  const reply = replies.shift();
  if (!reply) throw new TypeError("unexpected synthetic request");
  return reply();
});

const subscriptions: Array<() => void> = [];
afterEach(() => {
  for (const unsubscribe of subscriptions.splice(0)) unsubscribe();
  replies = [];
  sentBodies.length = 0;
  fetchPort.mockClear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const client = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });

const options = (
  title = "",
  target: { tenantId: string; actorId: string } = scope,
  enabled = true,
) => managedTitleQuery(target, "active", title, enabled);

/** Mounting the observer is what the hook does; the first read of a stale query starts here. */
function mount(cache: QueryClient, target?: ReturnType<typeof options>) {
  const observer = new InfiniteQueryObserver(cache, target ?? options());
  subscriptions.push(observer.subscribe(() => undefined));
  return observer;
}

const settled = (observer: ReturnType<typeof mount>) =>
  vi.waitFor(() => expect(observer.getCurrentResult().isFetching).toBe(false));

const view = (observer: ReturnType<typeof mount>) =>
  managedTitlesView(scope, observer.getCurrentResult());

async function openFirstPage(cache: QueryClient) {
  vi.stubGlobal("fetch", fetchPort);
  replies.push(() => json(page(1, 17, true)));
  const observer = mount(cache);
  await settled(observer);
  return observer;
}

it("classifies only a timed-out page as the same read asked again", () => {
  const typed = (status: number, code: string) =>
    new ConversationHistoryUnavailable(status, code);
  expect(pageTimedOut(typed(408, "DEADLINE"))).toBe(true);
  expect(pageTimedOut(typed(500, "DEADLINE"))).toBe(false);
  expect(pageTimedOut(typed(408, "CONVERSATION_RESPONSE_INVALID"))).toBe(false);
  expect(pageTimedOut(typed(503, "CONVERSATION_UNAVAILABLE"))).toBe(false);
  expect(pageTimedOut(typed(502, "PRODUCT_UNAVAILABLE"))).toBe(false);
  expect(pageTimedOut(typed(403, "CONVERSATION_ACCESS_DENIED"))).toBe(false);
  expect(pageTimedOut(typed(409, "MEMBERSHIP_CHANGED"))).toBe(false);
  expect(pageTimedOut(new TypeError("Failed to fetch"))).toBe(false);
  expect(pageTimedOut(new DOMException("aborted", "AbortError"))).toBe(false);
  expect(pageTimedOut(undefined)).toBe(false);
});

it("shows the admitted first page as current", async () => {
  const observer = await openFirstPage(client());
  const result = view(observer);
  expect(result).toMatchObject({ current: true, retained: false, shown: true });
  expect(result.summaries).toHaveLength(17);
  expect(observer.getCurrentResult().hasNextPage).toBe(true);
  expect(fetchPort).toHaveBeenCalledTimes(1);
});

it("keeps the admitted rows while the next page is in flight", async () => {
  const observer = await openFirstPage(client());
  let release!: (value: Response) => void;
  replies.push(
    () =>
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
  );
  const pending = observer.fetchNextPage();
  await vi.waitFor(() => expect(fetchPort).toHaveBeenCalledTimes(2));
  expect(observer.getCurrentResult().isFetchingNextPage).toBe(true);
  const during = view(observer);
  expect(during).toMatchObject({
    current: false,
    retained: false,
    shown: true,
  });
  expect(during.summaries).toHaveLength(17);
  release(json(page(18, 3, false)));
  await pending;
  expect(view(observer)).toMatchObject({
    current: true,
    retained: false,
    shown: true,
  });
});

it("keeps the admitted rows and offers the next page again after a timed-out page", async () => {
  const observer = await openFirstPage(client());
  replies.push(() => json({ error: { code: "DEADLINE" } }, 408));
  await observer.fetchNextPage();
  expect(observer.getCurrentResult().isFetchNextPageError).toBe(true);
  const retained = view(observer);
  expect(retained).toMatchObject({
    retained: true,
    current: false,
    shown: true,
  });
  expect(retained.summaries).toHaveLength(17);

  // No automatic query, fetch or retry loop follows the failure.
  await new Promise((resolve) => setTimeout(resolve, 25));
  expect(fetchPort).toHaveBeenCalledTimes(2);

  // One manual continuation asks for exactly the same cursor and appends its page.
  const timedOutBody = sentBodies[1];
  expect(timedOutBody).toMatchObject({ before: expect.anything() });
  replies.push(() => json(page(18, 3, false)));
  await observer.fetchNextPage();
  expect(fetchPort).toHaveBeenCalledTimes(3);
  expect(sentBodies[2]).toEqual(timedOutBody);
  const after = view(observer);
  expect(after).toMatchObject({ retained: false, current: true, shown: true });
  expect(after.summaries).toHaveLength(20);
});

it.each([
  ["a refused access", () => json({ error: { code: "ACCESS_DENIED" } }, 403)],
  ["an unauthenticated read", () => json({}, 401)],
  [
    "a changed membership",
    () => json({ error: { code: "MEMBERSHIP_CHANGED" } }, 409),
  ],
  [
    "an unavailable store",
    () => json({ error: { code: "CONVERSATION_UNAVAILABLE" } }, 503),
  ],
  [
    "an upstream product failure",
    () => json({ error: { code: "PRODUCT_UNAVAILABLE" } }, 502),
  ],
  ["a cancelled read", () => json({ error: { code: "CANCELLED" } }, 499)],
  [
    "an unreadable answer",
    () => json({ error: { code: "NOT_A_CONTRACT_CODE" } }, 408),
  ],
  [
    "a malformed body",
    () =>
      new Response("{not json", {
        status: 408,
        headers: { "content-type": "application/json" },
      }),
  ],
  [
    "a lost transport",
    () => {
      throw new TypeError("Failed to fetch");
    },
  ],
])("drops the display and retains nothing after %s", async (_, reply) => {
  const observer = await openFirstPage(client());
  replies.push(reply);
  await observer.fetchNextPage();
  expect(observer.getCurrentResult().isFetchNextPageError).toBe(true);
  expect(view(observer)).toMatchObject({
    retained: false,
    current: false,
    shown: false,
    summaries: [],
  });
});

it("fails closed when the first page fails", async () => {
  const cache = client();
  vi.stubGlobal("fetch", fetchPort);
  replies.push(() => json({ error: { code: "DEADLINE" } }, 408));
  const observer = mount(cache);
  await settled(observer);
  const result = observer.getCurrentResult();
  expect(result.isError).toBe(true);
  expect(result.isFetchNextPageError).toBe(false);
  expect(view(observer)).toMatchObject({
    retained: false,
    current: false,
    shown: false,
    summaries: [],
  });
});

it("does not retain rows when a full re-read fails", async () => {
  const observer = await openFirstPage(client());
  replies.push(() => json({ error: { code: "DEADLINE" } }, 408));
  await observer.refetch();
  const result = observer.getCurrentResult();
  expect(result.isRefetchError).toBe(true);
  expect(result.isFetchNextPageError).toBe(false);
  expect(view(observer)).toMatchObject({
    retained: false,
    shown: false,
    summaries: [],
  });
});

it("never shows a retained page under a replaced scope and ignores its late answer", async () => {
  const cache = client();
  const observer = await openFirstPage(cache);
  let release!: (value: Response) => void;
  replies.push(
    () =>
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
  );
  const pending = observer.fetchNextPage();
  await vi.waitFor(() => expect(fetchPort).toHaveBeenCalledTimes(2));

  const replacement = { tenantId: ID(910), actorId: ID(911) };
  const replacedObserver = new InfiniteQueryObserver(
    cache,
    managedTitleQuery(replacement, "active", "", true),
  );
  const beforeLate = managedTitlesView(
    replacement,
    replacedObserver.getCurrentResult(),
  );
  release(json({ error: { code: "DEADLINE" } }, 408));
  await pending;
  const afterLate = managedTitlesView(
    replacement,
    replacedObserver.getCurrentResult(),
  );
  expect(afterLate).toEqual(beforeLate);
  expect(afterLate).toMatchObject({ retained: false, summaries: [] });
  // The answer settled in the scope that asked for it, never in the replacement.
  expect(
    cache.getQueryData(
      managedTitleQuery(replacement, "active", "", true).queryKey,
    ),
  ).toBeUndefined();
  expect(
    cache.getQueryData(options().queryKey) as { pages: unknown[] },
  ).toMatchObject({ pages: [expect.anything()] });
});
