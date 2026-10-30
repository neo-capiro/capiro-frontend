import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
import {
  activateWatch,
  readAlerts,
  sendAlertDismiss,
  sendAlertRead,
  readWatch,
  refusalOf,
  updateWatch,
} from "../src/features/portfolio/prospects/watch/api";
import { WatchView } from "../src/features/portfolio/prospects/watch/ProspectWatch";
import type {
  AlertsPage,
  WatchResponse,
} from "../src/features/portfolio/prospects/watch/contracts";

/**
 * SCRUM-240 — the prospect watch user entry, exercised through the real adapters with a mocked
 * network boundary (exact URL/method/body + parsed responses + refusal mapping) and through the real
 * rendered surface (visible controls and their disabled states).
 */

const PROSPECT = "11111111-2222-3333-4444-555555555555";
const OTHER = "99999999-8888-7777-6666-555555555555";

type Call = { url: string; method: string; body: unknown };
const stub = (respond: (call: Call) => { status?: number; json?: unknown }) => {
  const calls: Call[] = [];
  const api = createApiClient(async (input, options) => {
    const call = {
      url: String(input),
      method: options?.method ?? "GET",
      body: options?.body ? JSON.parse(String(options.body)) : undefined,
    };
    calls.push(call);
    const { status = 200, json } = respond(call);
    return new Response(json === undefined ? null : JSON.stringify(json), {
      status,
      headers: json === undefined ? undefined : { "Content-Type": "application/json" },
    });
  });
  return { api, calls };
};

const watchBody = (over: Partial<WatchResponse["watch"]> = {}) => ({
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

it("reads the watch and the prospect inbox from the existing Core paths", async () => {
  const { api, calls } = stub((call) =>
    call.url.includes("/alerts")
      ? { json: page() }
      : { json: watchBody() },
  );
  const watch = await readWatch(api, PROSPECT);
  const alerts = await readAlerts(api, PROSPECT);
  expect(calls[0]!).toEqual({
    url: `/api/backend/core/business-development/prospects/${PROSPECT}/watch`,
    method: "GET",
    body: undefined,
  });
  expect(calls[1]!.url).toBe(
    `/api/backend/core/business-development/prospects/${PROSPECT}/alerts?limit=25`,
  );
  expect(watch.watch?.status).toBe("active");
  expect(watch.sources[0]!).toMatchObject({ source: "federal_award", health: "healthy" });
  expect(alerts.unreadCount).toBe(1);
  expect(alerts.items[0]!.title).toBe("New award recorded");
});

it("activates and updates through the exact POST/PATCH bodies Core accepts", async () => {
  const { api, calls } = stub(() => ({ json: watchBody() }));
  await activateWatch(api, PROSPECT, {});
  await updateWatch(api, PROSPECT, { status: "paused" });
  expect(calls[0]!).toMatchObject({
    url: `/api/backend/core/business-development/prospects/${PROSPECT}/watch`,
    method: "POST",
    body: {},
  });
  expect(calls[1]!).toMatchObject({
    url: `/api/backend/core/business-development/prospects/${PROSPECT}/watch`,
    method: "PATCH",
    body: { status: "paused" },
  });
});

it("marks and dismisses exactly one alert", async () => {
  const { api, calls } = stub((call) =>
    call.url.endsWith("/read")
      ? { json: { readAt: "2026-10-30T02:00:00.000Z" } }
      : { json: { readAt: "2026-10-30T02:00:00.000Z", dismissedAt: "2026-10-30T02:00:00.000Z" } },
  );
  const read = await sendAlertRead(api, PROSPECT, "alert-one");
  const dismissed = await sendAlertDismiss(api, PROSPECT, "alert-one");
  expect(calls[0]!).toMatchObject({
    url: `/api/backend/core/business-development/prospects/${PROSPECT}/alerts/alert-one/read`,
    method: "POST",
    body: undefined,
  });
  expect(calls[1]!).toMatchObject({
    url: `/api/backend/core/business-development/prospects/${PROSPECT}/alerts/alert-one/dismiss`,
    method: "POST",
  });
  expect(read.readAt).toBe("2026-10-30T02:00:00.000Z");
  expect(dismissed.dismissedAt).toBe("2026-10-30T02:00:00.000Z");
});

it("reports a disabled feature and a foreign inbox honestly", async () => {
  const disabled = stub(() => ({ status: 404, json: { message: "Not Found" } }));
  await expect(readWatch(disabled.api, PROSPECT)).rejects.toBeInstanceOf(Error);
  expect(refusalOf((await readWatch(disabled.api, PROSPECT).catch((error) => error)) as never)).toBe(404);

  const forbidden = stub(() => ({ status: 403, json: { message: "Forbidden" } }));
  const denied = await sendAlertRead(forbidden.api, PROSPECT, "alert-one").catch((error) => error);
  expect(refusalOf(denied)).toBe(403);

  const foreign = stub(() => ({ json: page({ items: [alertRow({ prospectId: OTHER }) as never] }) }));
  await expect(readAlerts(foreign.api, PROSPECT)).rejects.toThrow(/another prospect/);
});

const view = (props: Parameters<typeof WatchView>[0]) =>
  renderToStaticMarkup(createElement(WatchView, props));

const base = {
  refusal: null,
  pending: false,
  failed: false,
  actionError: undefined,
  busy: false,
  onRetry: () => {},
  onStart: () => {},
  onStatus: () => {},
  onRead: () => {},
  onDismiss: () => {},
};

it("offers the start control when no watch exists and shows real state once active", () => {
  const idle = view({
    ...base,
    record: { watch: null, sources: [], lastCompletedCheckAt: null },
    alerts: { isPending: false, isError: false, error: undefined, data: undefined },
  });
  expect(idle).toContain("Start watch");

  const active = view({
    ...base,
    record: watchBody() as never,
    alerts: { isPending: false, isError: false, error: undefined, data: page() },
  });
  expect(active).toContain("Status: active");
  expect(active).toContain("Contract award");
  expect(active).toContain("federal_award: healthy");
  expect(active).toContain("1 unread");
  expect(active).toContain("New award recorded");
  expect(active).toContain("Pause watch");
  expect(active).not.toContain("Start watch");
});

it("disables alert actions already satisfied and keeps refused states visible", () => {
  const done = view({
    ...base,
    record: watchBody() as never,
    alerts: {
      isPending: false,
      isError: false,
      error: undefined,
      data: page({ items: [alertRow({ readAt: "2026-10-30T02:00:00.000Z" }) as never], unreadCount: 0 }),
    },
  });
  expect(done).toMatch(/<button[^>]*disabled=""[^>]*>Mark read<\/button>/);
  expect(done).toContain("0 unread");

  const disabledFeature = view({
    ...base,
    refusal: 404,
    record: undefined,
    alerts: { isPending: false, isError: false, error: undefined, data: undefined },
  });
  expect(disabledFeature).toContain("not enabled for this workspace");
  expect(disabledFeature).not.toContain("Start watch");

  const refused = view({
    ...base,
    record: watchBody() as never,
    actionError: new ApiError(403, "No in-app delivery for this recipient"),
    alerts: { isPending: false, isError: false, error: undefined, data: page() },
  });
  expect(refused).toContain("delivered to you");
});
