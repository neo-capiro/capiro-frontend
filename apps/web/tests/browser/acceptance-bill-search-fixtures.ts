import { expect, type Page } from "@playwright/test";
import { clientId, installFixtures, json } from "./fixtures";

export const nextBillClient = "10000000-0000-4000-8000-000000000002";
export const searchBill = {
  billId: "tx-2025-hb1",
  displayNum: "HB 1",
  title: "Synthetic original search result",
  stage: "committee",
  probability: 0.17,
  jurisdiction: "TX",
};
export const recoveredBill = {
  ...searchBill,
  billId: "tx-2025-hb2",
  displayNum: "HB 2",
  title: "Synthetic current search result",
};

export async function billSearchFixtures(page: Page) {
  const unexpected = await installFixtures(page);
  const state = {
    status: 200,
    rows: [searchBill],
    hold: undefined as Promise<void> | undefined,
    entered: 0,
    offered: 0,
    reads: [] as { client: string; query: string; jurisdictions: string[] }[],
    writes: [] as { client: string; body: unknown }[],
  };
  await page.route("**/legiwatch/bills/corpus-metadata", (route) =>
    json(route, {
      jurisdictions: [
        { key: "US", count: 2 },
        { key: "TX", count: 2 },
      ],
    }),
  );
  await page.route("**/intelligence/clients/*/tracker/board?*", (route) =>
    json(route, {
      columns: [],
      total: 0,
      nextCursor: null,
      hasMore: false,
      withheld: 0,
    }),
  );
  await page.route(
    "**/intelligence/clients/*/tracker/bill-search?*",
    async (route) => {
      const url = new URL(route.request().url());
      const status = state.status,
        rows = state.rows,
        hold = state.hold;
      state.reads.push({
        client: url.pathname.split("/clients/")[1]!.split("/")[0]!,
        query: url.searchParams.get("q")!,
        jurisdictions: url.searchParams.getAll("jurisdictions"),
      });
      state.entered++;
      if (hold) await hold;
      try {
        await json(
          route,
          status === 200 ? rows : { message: "Synthetic search refused" },
          status,
        );
      } catch (error) {
        if (!route.request().failure()) throw error;
      } finally {
        state.offered++;
      }
    },
  );
  await page.route("**/intelligence/clients/*/tracker/track", (route) => {
    const client = new URL(route.request().url()).pathname
      .split("/clients/")[1]!
      .split("/")[0]!;
    const body = route.request().postDataJSON();
    state.writes.push({ client, body });
    return json(route, { billId: body.billId, clientId: client });
  });
  return { state, unexpected };
}

export function holdBillSearch(
  state: Awaited<ReturnType<typeof billSearchFixtures>>["state"],
) {
  let release!: () => void;
  state.hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  return () => {
    state.hold = undefined;
    release();
  };
}
export const billDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Track a bill", exact: true });
export const trackButton = (page: Page) =>
  billDialog(page).getByRole("button", {
    name: "Track selected bill",
    exact: true,
  });
export async function openBillSearch(page: Page) {
  await page.goto("/__test/acceptance-bill-search");
  await page.getByRole("button", { name: "Track bill", exact: true }).click();
  await billDialog(page).getByLabel("Bill number or title").fill("HB 1");
  await billDialog(page)
    .getByRole("button", { name: "Search", exact: true })
    .click();
  await billDialog(page).getByRole("radio", { name: /HB 1/ }).check();
  await expect(trackButton(page)).toBeEnabled();
}
export async function refreshBillSearch(page: Page) {
  await page.evaluate(() =>
    window.dispatchEvent(new Event("acceptance-bill-search-refresh")),
  );
}
export async function assertCurrentTrack(
  page: Page,
  state: Awaited<ReturnType<typeof billSearchFixtures>>["state"],
  client = clientId,
) {
  await billDialog(page).getByRole("radio", { name: /HB 2/ }).check();
  await trackButton(page).click();
  await expect(billDialog(page)).toHaveCount(0);
  expect(state.writes).toEqual([
    {
      client,
      body: {
        billId: recoveredBill.billId,
        source: "manual_search",
        isManual: true,
      },
    },
  ]);
}
