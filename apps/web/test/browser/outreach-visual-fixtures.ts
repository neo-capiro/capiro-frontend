import type { Page } from "@playwright/test";
import { setupOutreach } from "./core109-outreach-fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { operationFixtures } from "./fixtures";
import { client } from "../../tests/browser/fixtures";
import {
  outreachVisualReads,
  outreachVisualRecords,
  clientId,
} from "./outreach-visual-data";

/** Existing local harness, explicit read-only synthetic responses; no production entry. */
export async function setupOutreachVisual(page: Page) {
  const observed = await setupOutreach(page);
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    ...outreachVisualReads,
    "clients.list": [{ ...client, id: clientId, name: "Synthetic client" }],
    "engagement.outreach.record": (input: unknown) => {
      const id = (input as { params: { id: string } }).params.id;
      const record = outreachVisualRecords.find((row) => row.id === id);
      if (!record) throw new Error("Unknown synthetic Outreach record");
      return record;
    },
  });
  // Highest-priority guard refuses every mutation before the generic fixture resolver.
  await page.route("**/api/**", (route) =>
    route.request().method() === "GET"
      ? route.fallback()
      : route.fulfill({
          status: 405,
          json: { message: "Read-only synthetic Outreach visual fixture" },
        }),
  );
  return observed;
}
