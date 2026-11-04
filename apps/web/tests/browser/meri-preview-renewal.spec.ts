import { expect, test } from "@playwright/test";
import {
  previewResponse,
  previewSource,
} from "../meri-preview-revision-fixtures";

test("an already mounted preview uses renewed access and retains an unknown publication", async ({
  page,
}) => {
  const calls: string[] = [];
  await page.route("**/api/documents/*", async (route) => {
    const operation = new URL(route.request().url()).pathname
      .split("/")
      .at(-1)!;
    calls.push(operation);
    if (operation === "inspect") {
      await route.fulfill({ json: previewSource() });
    } else if (operation === "preview-publish") {
      await route.abort("failed");
    } else if (operation === "preview") {
      const response = previewResponse();
      await route.fulfill({
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body: Buffer.from(await response.arrayBuffer()),
      });
    } else throw new Error(`Unexpected document operation ${operation}`);
  });
  await page.goto("/meri-preview-renewal.html");
  await page.getByRole("button", { name: "Prepare PDF preview" }).click();
  await expect(
    page.getByText("A publication attempt is unresolved.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Renew file access" }).click();
  await expect(
    page.getByRole("button", { name: "Prepare PDF preview" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Renewal count")).toHaveText("1");
  expect(calls).toEqual(["inspect", "preview-publish"]);
  await page.getByRole("button", { name: "Open existing preview" }).click();
  await expect(
    page.getByText("PDF bytes verified for this saved version."),
  ).toBeVisible();
  await expect(page.getByTitle("Verified PDF preview")).toBeVisible();
  expect(calls).toEqual(["inspect", "preview-publish", "inspect", "preview"]);
});

test("an existing preview refusal remains specific after the connection is renewed", async ({
  page,
}) => {
  await page.route("**/api/documents/inspect", (route) =>
    route.fulfill({ json: previewSource() }),
  );
  await page.route("**/api/documents/preview", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: { code: "PREVIEW_UNAVAILABLE", outcome: "NOT_DISPATCHED" },
      },
    }),
  );
  await page.goto("/meri-preview-renewal.html");
  await page.getByRole("button", { name: "Renew file access" }).click();
  await page.getByRole("button", { name: "Open existing preview" }).click();
  await expect(
    page.getByText("PDF preview is not configured for this environment."),
  ).toBeVisible();
  await expect(page.getByTitle("Verified PDF preview")).toHaveCount(0);
});
