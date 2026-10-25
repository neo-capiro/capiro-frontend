import { createHash } from "node:crypto";
import type { Page } from "@playwright/test";
export const syncMicrosoftId = "80000000-0000-4000-8000-000000000001";
export const syncGoogleId = "80000000-0000-4000-8000-000000000002";
export const syncStats = {
  scanned: 3,
  matched: 2,
  skipped: 1,
  removed: 0,
  failed: 0,
  pages: 1,
  hasMore: false,
};
export function holdCalendarSyncResponse() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
export async function installCalendarSyncFixtures(
  page: Page,
  options: {
    enabled?: boolean;
    status?: string;
    delay?: number;
    responseGate?: Promise<void>;
    responseStatus?: number;
    hasMore?: boolean;
    preflightDelay?: number;
    fallback?: boolean;
  } = {},
) {
  const state = {
    reads: 0,
    commandReads: 0,
    pending: options.hasMore ?? false,
    responseStatus: options.responseStatus ?? 0,
    receipts: new Map<string, unknown>(),
    writes: [] as { url: string; method: string; body: string | null }[],
    unexpected: [] as string[],
  };
  await page.route("**/api/backend/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    const reply = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (request.method() === "GET" && url.pathname.endsWith("/core/me"))
      return reply({
        user: { id: "sync-user", email: "synthetic@example.test" },
        tenant: { id: "sync-tenant", name: "Synthetic tenant" },
        role: "standard_user",
      });
    if (
      request.method() === "GET" &&
      url.pathname.endsWith("/engagement/capabilities")
    )
      return reply({
        runtime: { externalActionsEnabled: options.enabled !== false },
      });
    if (
      request.method() === "GET" &&
      url.pathname.endsWith("/engagement/integrations")
    ) {
      state.reads++;
      if (state.reads > 1 && options.preflightDelay)
        await new Promise((resolve) =>
          setTimeout(resolve, options.preflightDelay),
        );
      return reply(
        [
          [syncMicrosoftId, "microsoft_365", "microsoft@example.test"],
          [syncGoogleId, "google_workspace", "google@example.test"],
        ].map(([id, provider, accountEmail]) => ({
          id,
          provider,
          accountEmail,
          displayName: null,
          createdByUserId: "sync-user",
          status: options.status ?? "connected",
          lastSyncAt: null,
        })),
      );
    }
    const commandPath = url.pathname.match(
      /\/integrations\/(microsoft|google)\/([^/]+)\/calendar-commands(?:\/([^/]+))?$/,
    );
    if (commandPath && request.method() === "GET" && commandPath[3]) {
      state.commandReads++;
      const row = state.receipts.get(commandPath[3]);
      return row ? reply(row) : reply({}, 404);
    }
    if (commandPath && request.method() === "POST" && !commandPath[3]) {
      state.writes.push({
        url: url.pathname + url.search,
        method: request.method(),
        body: request.postData(),
      });
      const body = request.postDataJSON() as {
        schemaVersion: number;
        requestId: string;
        range: { from: string; to: string } | null;
      };
      const provider =
        commandPath[1] === "microsoft" ? "microsoft_365" : "google_workspace";
      const window = body.range ?? {
        from: "2026-10-01T00:00:00.000Z",
        to: "2026-11-01T00:00:00.000Z",
      };
      const receipt = {
        schemaVersion: 1,
        requestId: body.requestId,
        connectionId: commandPath[2],
        provider,
        payloadDigest: createHash("sha256")
          .update(
            JSON.stringify([
              1,
              "sync-tenant",
              "sync-user",
              commandPath[2],
              provider,
              body.range,
            ]),
          )
          .digest("hex"),
        range: body.range,
        window,
        status: state.pending ? "pending" : "completed",
        calendar: {
          ...syncStats,
          hasMore: state.pending,
          pages: state.pending ? 12 : state.writes.length,
        },
        createdAt: "2026-10-25T00:00:00.000Z",
        updatedAt: "2026-10-25T00:00:00.000Z",
      };
      state.receipts.set(body.requestId, receipt);
      if (options.responseGate) await options.responseGate;
      if (options.delay)
        await new Promise((resolve) => setTimeout(resolve, options.delay));
      if (state.responseStatus)
        return reply(
          { message: "Synthetic provider refused a later page" },
          state.responseStatus,
        );
      return reply(receipt);
    }
    if (options.fallback) return route.fallback();
    state.unexpected.push(`${request.method()} ${url.pathname}`);
    return reply({ message: "Unexpected synthetic request" }, 500);
  });
  return state;
}
