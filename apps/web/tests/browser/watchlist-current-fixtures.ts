import { expect, type Page, type Route } from "@playwright/test";
import { client, clientId, json } from "./fixtures";
import type { WatchlistSource } from "./watchlist-current-harness";

export const watchlistIdentity = {
  user: {
    id: "current-user",
    clerkUserId: "user_current_clerk",
    email: "current@example.test",
  },
  tenant: { id: "tenant-current", name: "Current workspace" },
  role: "user_admin",
};
export const intelTargeting = {
  clientId,
  issueAreas: ["Defense"],
  jurisdictions: ["VA"],
  topics: [
    {
      id: "stable-topic",
      label: "Current targeting",
      issueArea: "Defense",
      position: "monitor",
      priority: "high",
      terms: [{ termType: "agency", value: "Current Department" }],
    },
  ],
  version: 7,
};
export const coreTargeting = {
  issueAreas: ["Defense"],
  tags: [
    {
      tag: "Current targeting",
      issueArea: "Defense",
      position: "monitor",
      priority: "high",
      synonyms: ["Current sensor"],
      relatedEntities: ["Current Department"],
      riskTerms: ["Prohibition"],
    },
  ],
};
export const watchlistPath = (
  backend: "core" | "intelligence",
  id = clientId,
) =>
  backend === "core"
    ? `intelligence/clients/${id}/tracker/watchlist`
    : `tracker/watchlists/${id}`;
export const watchlistDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Configure Bill Tracker", exact: true });

export async function installCurrentWatchlist(
  page: Page,
  backend: "core" | "intelligence" = "intelligence",
) {
  const unexpected: string[] = [];
  const reads = {
    identity: 0,
    client: 0,
    targeting: 0,
    taxonomy: 0,
    jurisdictions: 0,
  };
  const writes: unknown[] = [];
  const state: { record: unknown } = {
    record:
      backend === "core"
        ? structuredClone(coreTargeting)
        : structuredClone(intelTargeting),
  };
  await page.route("**/api/backend/**", (route) => {
    unexpected.push(
      `${route.request().method()} ${new URL(route.request().url()).pathname}`,
    );
    return json(route, { message: "Unconfigured synthetic endpoint" }, 404);
  });
  await page.route("**/api/backend/core/me", (route) => {
    reads.identity++;
    return json(route, watchlistIdentity);
  });
  await page.route("**/api/backend/core/clients/*", (route) => {
    reads.client++;
    return json(route, {
      ...client,
      id: new URL(route.request().url()).pathname.split("/").at(-1),
      tenantId: watchlistIdentity.tenant.id,
    });
  });
  await page.route(
    `**/api/backend/${backend}/${backend === "core" ? "intelligence" : "tracker"}/issue-areas`,
    (route) => {
      reads.taxonomy++;
      return json(route, { issueAreas: ["Defense", "Health"] });
    },
  );
  await page.route("**/legiwatch/bills/corpus-metadata", (route) => {
    reads.jurisdictions++;
    return json(route, {
      jurisdictions: [
        { key: "US", count: 10 },
        { key: "VA", count: 2 },
      ],
    });
  });
  await page.route(
    `**/api/backend/${backend}/${watchlistPath(backend)}`,
    (route) => {
      if (route.request().method() === "GET") {
        reads.targeting++;
        return json(route, state.record);
      }
      const body = route.request().postDataJSON();
      writes.push(body);
      state.record =
        backend === "core"
          ? body
          : { ...body, clientId, version: body.expectedVersion + 1 };
      return json(route, state.record);
    },
  );
  return { unexpected, reads, writes, state };
}
export async function settleWatchlist(page: Page) {
  await expect(
    page.getByRole("status", {
      name: "Synthetic Watchlist requests pending",
      includeHidden: true,
    }),
  ).toHaveText("0");
  await page.evaluate(() => new Promise(requestAnimationFrame));
}
export async function openCurrentWatchlist(
  page: Page,
  backend: "core" | "intelligence" = "intelligence",
) {
  await page.goto(`/watchlist-current.html?backend=${backend}`);
  await expect(
    watchlistDialog(page).getByLabel("Topic name", { exact: true }),
  ).toHaveValue("Current targeting");
  await settleWatchlist(page);
  return watchlistDialog(page);
}
export async function refreshWatchlist(page: Page, source: WatchlistSource) {
  await page.evaluate(
    (source) => window.__watchlistCurrent!.refresh(source),
    source,
  );
  await settleWatchlist(page);
}
export async function heldWatchlistWrite(
  page: Page,
  backend: "core" | "intelligence" = "intelligence",
  response?: unknown,
) {
  let start!: () => void, release!: () => void, finish!: () => void;
  const started = new Promise<void>((resolve) => {
    start = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const finished = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const bodies: unknown[] = [];
  await page.route(
    `**/api/backend/${backend}/${watchlistPath(backend)}`,
    async (route: Route) => {
      if (route.request().method() === "GET") return route.fallback();
      const body = route.request().postDataJSON();
      bodies.push(body);
      start();
      await gate;
      try {
        await json(
          route,
          response ??
            (backend === "core"
              ? body
              : { ...body, clientId, version: body.expectedVersion + 1 }),
        );
      } finally {
        finish();
      }
    },
  );
  return { started, release, finished, bodies };
}
