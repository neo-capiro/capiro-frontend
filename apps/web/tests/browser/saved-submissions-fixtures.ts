import { expect, type Page } from "@playwright/test";
import { clientId, json } from "./fixtures";
import { installRemoval, savedSubmission } from "./overview-removal-fixtures";

export async function savedHistory(page: Page) {
  const fixture = await installRemoval(page);
  await page.goto("/saved-submissions.html");
  await expect(
    page.getByRole("button", {
      name: `Remove submission: ${savedSubmission.title}`,
      exact: true,
    }),
  ).toBeVisible();
  await settleSubmissions(page);
  return fixture;
}

export async function openSubmissionRemoval(page: Page) {
  await page
    .getByRole("button", {
      name: `Remove submission: ${savedSubmission.title}`,
      exact: true,
    })
    .click();
  return page.getByRole("dialog", { name: "Remove submission?", exact: true });
}

export async function settleSubmissions(page: Page) {
  await expect(
    page.getByRole("status", {
      name: "Synthetic saved-submission requests pending",
      includeHidden: true,
    }),
  ).toHaveText("0");
  await page.evaluate(() => new Promise(requestAnimationFrame));
}

export async function heldSubmissionDelete(page: Page) {
  let start!: () => void;
  let release!: () => void;
  let settled!: () => void;
  const started = new Promise<void>((resolve) => {
    start = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const finished = new Promise<void>((resolve) => {
    settled = resolve;
  });
  await page.route(
    `**/api/backend/core/clients/${clientId}/history/*`,
    async (route) => {
      start();
      await gate;
      try {
        await json(route, { deleted: true });
      } finally {
        settled();
      }
    },
  );
  return { started, release, finished };
}
