import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
import {
  activateWatch,
  alertsInfiniteOptions,
  alertsKey,
  readAlerts,
  runWatchAction,
  sendAlertDismiss,
  sendAlertRead,
  updateWatch,
  watchKey,
} from "../src/features/portfolio/prospects/watch/api";
import { WatchView } from "../src/features/portfolio/prospects/watch/ProspectWatch";
import type {
  AlertsPage,
  WatchResponse,
} from "../src/features/portfolio/prospects/watch/contracts";

/**
 * SCRUM-240 — the prospect watch entry, exercised through the real adapters, the real react-query
 * paging/reconciliation state and the real rendered surface, with a mocked network boundary.
 */

const PROSPECT = "11111111-2222-3333-4444-555555555555";
const OTHER_PROSPECT = "99999999-8888-7777-6666-555555555555";
const CURSOR = "cursor/older+page=";

type Call = { url: string; method: string; body: unknown };
type Reply = { status?: number; json?: unknown; networkError?: boolean };

const stub = (respond: (call: Call) => Reply) => {
  const calls: Call[] = [];
  const api = createApiClient(async (input, options) => {
    const call = {
      url: String(input),
      method: options?.method ?? "GET",
      body: options?.body ? JSON.parse(String(options.body)) : undefined,
    };
    calls.push(call);
    const { status = 200, json, networkError } = respond(call);
    if (networkError) throw new TypeError("Failed to fetch");
    return new Response(json === undefined ? null : JSON.stringify(json), {
      status,
      headers: json === undefined ? undefined : { "Content-Type": "application/json" },
    });
  });
  return { api, calls };
};

const watchBody = (over: Partial<NonNullable<WatchResponse["watch"]>> = {}): WatchResponse => ({
  watch: {
    status: "active",
    categories: ["contract_award"],
    ownerUserId: null,
    mutedUntil: null,
    createdAt: "2026-10-30T00:00:00.000Z",
    updatedAt: "2026-10-30T00:00:00.000Z",
    ...over,
  },
  sources: [
    {
      source: "federal_award",
      health: "healthy",
      lastCheckedAt: "2026-10-30T01:00:00.000Z",
      detail: null,
    },
  ],
  lastCompletedCheckAt: "2026-10-30T01:00:00.000Z",
});

const alertRow = (over: Record<string, unknown> = {}) => ({
  id: "alert-one",
  title: "New award recorded",
  summary: "Material award change",
  materiality: "high",
  materialityLevel: "high",
  company: "Synthetic Co",
  sourceFamily: "federal_award",
  category: "contract_award",
  eventAt: null,
  effectiveAt: null,
  publishedAt: null,
  firstObservedAt: "2026-10-30T01:00:00.000Z",
  sourceLocator: "award-1",
  implication: null,
  readAt: null,
  dismissedAt: null,
  prospectId: PROSPECT,
  ...over,
});

const page = (over: Partial<AlertsPage> = {}): AlertsPage => ({
  items: [alertRow() as never],
  nextCursor: null,
  unreadCount: 1,
  ...over,
});

/* --------------------------------------------------------------- transports */

it("reads the watch and pages the inbox through the real cursor", async () => {
  const { api, calls } = stub((call) =>
    call.url.includes("cursor=")
      ? { json: page({ items: [alertRow({ id: "alert-older", title: "Older award" }) as never], nextCursor: null }) }
      : call.url.includes("/alerts")
        ? { json: page({ nextCursor: CURSOR, unreadCount: 2 }) }
        : { json: watchBody() },
  );
  const client = new QueryClient();
  const watch = await client.fetchQuery({ queryKey: watchKey(PROSPECT), queryFn: () => Promise.resolve(watchBody()) });
  const first = await readAlerts(api, PROSPECT);
  const older = await readAlerts(api, PROSPECT, first.nextCursor);

  expect(calls[0]).toEqual({
    url: `/api/backend/core/business-development/prospects/${PROSPECT}/alerts?limit=25`,
    method: "GET",
    body: undefined,
  });
  expect(calls[1]!.url).toBe(
    `/api/backend/core/business-development/prospects/${PROSPECT}/alerts?limit=25&cursor=${encodeURIComponent(CURSOR)}`,
  );
  expect(watch.watch?.status).toBe("active");
  expect(older.items[0]!.title).toBe("Older award");
});

it("walks two pages through react-query's own infinite query", async () => {
  const { api, calls } = stub((call) =>
    call.url.includes("cursor=")
      ? { json: page({ items: [alertRow({ id: "alert-older", title: "Older award" }) as never] }) }
      : { json: page({ nextCursor: CURSOR, unreadCount: 2 }) },
  );
  const client = new QueryClient();
  const result = await client.fetchInfiniteQuery({
    ...alertsInfiniteOptions(api, PROSPECT),
    pages: 2,
  });
  expect(result.pages).toHaveLength(2);
  expect(result.pages[1]!.items[0]!.id).toBe("alert-older");
  expect(calls).toHaveLength(2);
  expect(calls[1]!.url).toContain(`cursor=${encodeURIComponent(CURSOR)}`);
  // Same react-query cache the hook reads, so this is the state the component renders.
  const cached = client.getQueryData(alertsKey(PROSPECT)) as { pages: AlertsPage[] };
  expect(cached.pages.flatMap((entry) => entry.items).map((item) => item.id)).toEqual([
    "alert-one",
    "alert-older",
  ]);
});

it("keeps each prospect's pages and cursor separate", async () => {
  const { api } = stub((call) =>
    call.url.includes(OTHER_PROSPECT)
      ? { json: page({ items: [alertRow({ id: "other-alert", prospectId: OTHER_PROSPECT }) as never], unreadCount: 0 }) }
      : { json: page({ nextCursor: CURSOR }) },
  );
  const client = new QueryClient();
  await client.fetchInfiniteQuery({ ...alertsInfiniteOptions(api, PROSPECT), pages: 2 });
  await client.fetchInfiniteQuery(alertsInfiniteOptions(api, OTHER_PROSPECT));
  const mine = client.getQueryData(alertsKey(PROSPECT)) as { pages: AlertsPage[] };
  const theirs = client.getQueryData(alertsKey(OTHER_PROSPECT)) as { pages: AlertsPage[] };
  expect(mine.pages.flatMap((entry) => entry.items)).toHaveLength(2);
  expect(theirs.pages.flatMap((entry) => entry.items).map((item) => item.id)).toEqual(["other-alert"]);
});

it("activates, updates, reads and dismisses on the exact Core paths", async () => {
  const { api, calls } = stub((call) =>
    call.url.endsWith("/read")
      ? { json: { readAt: "2026-10-30T02:00:00.000Z" } }
      : call.url.endsWith("/dismiss")
        ? { json: { readAt: "2026-10-30T02:00:00.000Z", dismissedAt: "2026-10-30T02:00:00.000Z" } }
        : { json: watchBody() },
  );
  await activateWatch(api, PROSPECT, {});
  await updateWatch(api, PROSPECT, { status: "paused" });
  await sendAlertRead(api, PROSPECT, "alert-one");
  await sendAlertDismiss(api, PROSPECT, "alert-one");
  expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
    `POST /api/backend/core/business-development/prospects/${PROSPECT}/watch`,
    `PATCH /api/backend/core/business-development/prospects/${PROSPECT}/watch`,
    `POST /api/backend/core/business-development/prospects/${PROSPECT}/alerts/alert-one/read`,
    `POST /api/backend/core/business-development/prospects/${PROSPECT}/alerts/alert-one/dismiss`,
  ]);
  expect(calls[0]!.body).toEqual({});
  expect(calls[1]!.body).toEqual({ status: "paused" });
});

it("refuses a foreign inbox page instead of rendering it", async () => {
  const { api } = stub(() => ({ json: page({ items: [alertRow({ prospectId: OTHER_PROSPECT }) as never] }) }));
  await expect(readAlerts(api, PROSPECT)).rejects.toThrow(/another prospect/);
});

/* --------------------------------------------------- outcome reconciliation */

const reconcileStub = (mutationReply: Reply, getReply: (call: Call) => Reply) =>
  stub((call) => (call.method === "GET" ? getReply(call) : mutationReply));

/** Watch GET answers the watch, alert GETs answer an empty page. */
const stateReply =
  (watch: () => Reply) =>
  (call: Call): Reply =>
    call.url.includes("/alerts") ? { json: page({ items: [], unreadCount: 0 }) } : watch();

it("treats a lost acknowledgement as unconfirmed and adopts the committed read-back", async () => {
  const { api, calls } = reconcileStub(
    { networkError: true },
    stateReply(() => ({ json: watchBody({ status: "ended" }) })),
  );
  const client = new QueryClient();
  const outcome = await runWatchAction(api, client, PROSPECT, { type: "status", status: "ended" });

  expect(outcome.kind).toBe("unconfirmed");
  const readback = outcome.kind === "unconfirmed" ? (outcome.readback as WatchResponse | null) : null;
  expect(readback?.watch?.status).toBe("ended");
  // The re-read is what the cache now holds, so the surface cannot keep showing "active".
  const cached = client.getQueryData(watchKey(PROSPECT)) as WatchResponse;
  expect(cached.watch?.status).toBe("ended");
  expect(calls.filter((call) => call.method === "GET").length).toBeGreaterThan(0);
});

it("keeps an unresolvable outcome behind a usable retry instead of claiming a refusal", async () => {
  const { api } = reconcileStub({ status: 503, json: { message: "Service Unavailable" } }, () => ({
    networkError: true,
  }));
  const client = new QueryClient();
  const outcome = await runWatchAction(api, client, PROSPECT, { type: "status", status: "paused" });
  expect(outcome).toEqual({ kind: "unconfirmed", acknowledged: false, readback: null });
});

it("reports a real refusal as a refusal and changes nothing", async () => {
  const { api } = stub(() => ({ status: 403, json: { message: "Forbidden" } }));
  const client = new QueryClient();
  const outcome = await runWatchAction(api, client, PROSPECT, { type: "read", alertId: "alert-one" });
  expect(outcome).toEqual({ kind: "refused", status: 403 });
  expect(client.getQueryData(watchKey(PROSPECT))).toBeUndefined();
});

/* ------------------------------------------------------------ rendered surface */

const view = (props: Parameters<typeof WatchView>[0]) =>
  renderToStaticMarkup(createElement(WatchView, props));

const baseView = {
  refusal: null as 403 | 404 | null,
  pending: false,
  failed: false,
  alertsPending: false,
  alertsFailed: false,
  hasNext: false,
  loadingNext: false,
  recovering: false,
  outcome: undefined as Parameters<typeof WatchView>[0]["outcome"],
  busy: false,
  onRetry: () => {},
  onRetryReadback: () => {},
  onLoadMore: () => {},
  onStart: () => {},
  onStatus: () => {},
  onRead: () => {},
  onDismiss: () => {},
};

it("renders both pages, offers load-more only while a cursor remains, and keeps older alert actions", () => {
  const paged = view({
    ...baseView,
    record: watchBody(),
    items: [alertRow() as never, alertRow({ id: "alert-older", title: "Older award" }) as never],
    unread: 2,
    hasNext: true,
  });
  expect(paged).toContain("Older award");
  expect(paged).toContain("2 shown");
  expect(paged).toContain("Load older alerts");
  expect(paged).not.toContain("notification center");

  const lastPage = view({
    ...baseView,
    record: watchBody(),
    items: [alertRow() as never],
    unread: 1,
    hasNext: false,
  });
  expect(lastPage).not.toContain("Load older alerts");
});

it("shows the reconciled outcome, and blocks changes behind Retry when unresolved", () => {
  const reconciled = view({
    ...baseView,
    record: watchBody({ status: "ended" }),
    items: [],
    unread: 0,
    outcome: { kind: "unconfirmed", acknowledged: true, readback: watchBody({ status: "ended" }) },
  });
  expect(reconciled).toContain("Status: ended");
  expect(reconciled).toContain("The current state was re-read");
  expect(reconciled).not.toContain("refused");

  const unresolved = view({
    ...baseView,
    record: watchBody(),
    items: [],
    unread: 0,
    outcome: { kind: "unconfirmed", acknowledged: false, readback: null },
  });
  expect(unresolved).toContain("could not be re-read");
  expect(unresolved).toMatch(/<button[^>]*disabled=""[^>]*>Pause watch<\/button>/);
  expect(unresolved).toContain("Retry");
});

it("keeps feature-off and delivery refusals honest without inventing a cause", () => {
  const unavailable = view({ ...baseView, refusal: 404, record: undefined, items: [], unread: 0 });
  expect(unavailable).toContain("Watch is unavailable for this prospect.");
  expect(unavailable).not.toContain("not enabled");
  expect(unavailable).not.toContain("Start watch");

  const refused = view({
    ...baseView,
    record: watchBody(),
    items: [alertRow() as never],
    unread: 1,
    outcome: { kind: "refused", status: 403 },
  });
  expect(refused).toContain("not delivered to you");
});
