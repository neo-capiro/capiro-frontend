import type { Page } from "@playwright/test";
import { installFixtures, json, prospect, prospectId } from "./fixtures";

export const stageCatalog = {
  version: "portfolio-3.1",
  createStage: "identified",
  legacyMapping: "complete",
  allowLegacyTransitions: true,
  stages: [
    "identified",
    "initiated",
    "engaged",
    "proposal",
    "negotiation",
    "closed_won",
    "closed_lost",
  ].map((value) => ({ value, label: value.replaceAll("_", " ") })),
};

/** Synthetic local-only records; no signed-in session or live API is exercised. */
export async function qaFixtures(page: Page) {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
  const unexpected = await installFixtures(page);
  await page.route("**/business-development/prospect-stages", (route) =>
    json(route, stageCatalog),
  );
  for (const resource of ["watch", "alerts"]) {
    await page.route(
      (url) =>
        url.pathname ===
        `/api/backend/core/business-development/prospects/${prospectId}/${resource}`,
      (route) =>
        json(route, { message: "Synthetic watch source unavailable" }, 404),
    );
  }
  return unexpected;
}

export function prospectList(records = [prospect]) {
  return {
    prospects: records,
    counts: {
      visible: records.length,
      total: records.length,
      active: records.filter((row) => row.status === "active").length,
      dismissed: records.filter((row) => row.status === "dismissed").length,
      byStage: Object.fromEntries(records.map((row) => [row.stage, 1])),
    },
  };
}

export function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
