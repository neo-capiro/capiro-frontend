import type { Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { firstPageDocument } from "../../tests/workspace-first-page-fixture";
import type { HillDayDocument } from "../../src/shared/capiro/operations/workspace-schemas";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import {
  client,
  clientId,
  otherClient,
  otherClientId,
} from "./next-modules-fixtures";

export const firstPageUrl = `/modules/workspace?clientId=${clientId}&view=hillday&hilldayId=${firstPageDocument().id}`;
export type FirstPageWrite = {
  params: { id: string };
  body: { firstPage: HillDayDocument["firstPage"]; expectedUpdatedAt: string };
};

export function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

export async function firstPageFixture(
  page: Page,
  options: { status?: number; message?: string; gate?: Promise<void> } = {},
) {
  await onlyLocalRequests(page);
  // Reuse the retained local font without changing the shared Vite allowlist.
  await page.route("**/Geist-Variable.woff2", (route) =>
    route.fulfill({
      path: fileURLToPath(
        new URL(
          "../../../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
          import.meta.url,
        ),
      ),
      contentType: "font/woff2",
    }),
  );
  let document = firstPageDocument();
  let reads = 0;
  const writes: FirstPageWrite[] = [];
  const aborted: string[] = [];
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText.includes("ABORTED"))
      aborted.push(new URL(request.url()).pathname);
  });
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "clients.list": [client, otherClient],
    "workspace.hillday.document": () => {
      reads++;
      return document;
    },
    "workspace.hillday.quality": {
      documentId: document.id,
      score: 100,
      checks: [],
      computedAt: document.updatedAt,
    },
  });
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({
      json: route.request().url().endsWith(otherClientId)
        ? otherClient
        : client,
    }),
  );
  await page.route("**/api/capiro/workspace.hillday.update", async (route) => {
    writes.push(route.request().postDataJSON() as FirstPageWrite);
    await options.gate;
    await route
      .fulfill(
        options.status
          ? {
              status: options.status,
              json: {
                message:
                  options.message ??
                  "This document changed. Reload it before saving the first page again",
              },
            }
          : { json: document },
      )
      .catch(() => {});
  });
  return {
    writes,
    aborted,
    reads: () => reads,
    setDocument: (next: HillDayDocument) => {
      document = next;
    },
  };
}

export async function openFirstPage(page: Page) {
  await page.goto(firstPageUrl);
  await page
    .getByRole("button", { name: "Edit first page", exact: true })
    .click();
  return page.getByRole("dialog", { name: "Edit first page", exact: true });
}
