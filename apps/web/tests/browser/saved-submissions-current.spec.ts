import { expect, test } from "@playwright/test";
import { clientId, json } from "./fixtures";
import { installRemoval, savedSubmission } from "./overview-removal-fixtures";
import {
  openSubmissionRemoval,
  savedHistory,
  settleSubmissions,
} from "./saved-submissions-fixtures";

test("Capabilities composes current saved submissions and retains Advocacy history", async ({
  page,
}) => {
  const { unexpected } = await installRemoval(page);
  await page.goto(`/portfolio/${clientId}/capabilities`);
  await page.locator("summary").filter({ hasText: "Past performance" }).click();
  const section = page.getByRole("region", { name: "Past performance" });
  await expect(
    section.getByRole("heading", { name: "Saved submissions" }),
  ).toBeVisible();
  await expect(section).toContainText(savedSubmission.title);
  await expect(section).toContainText(savedSubmission.outcome);
  await section.getByText("Saved notes", { exact: true }).click();
  await expect(section).toContainText(savedSubmission.notes);
  await expect(section).not.toContainText("Capability ID:");
  await expect(
    page.getByRole("link", { name: "Advocacy history ↗" }),
  ).toHaveAttribute("href", `/portfolio/${clientId}/objectives`);
  await expect(
    page.getByText("Past advocacy and submissions:", { exact: true }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

test("confirmation uses the current exact client read rather than supplied stale display text", async ({
  page,
}) => {
  await savedHistory(page);
  const dialog = await openSubmissionRemoval(page);
  await expect(dialog).toContainText("Test Aerospace’s past performance");
  await expect(dialog).not.toContainText("Stale supplied client name");
});

test("failed history refresh removes cached rows and its selected confirmation", async ({
  page,
}) => {
  await savedHistory(page);
  const dialog = await openSubmissionRemoval(page);
  await page.route("**/core/clients/*/submission-history", (route) =>
    json(route, { message: "Synthetic history denied" }, 403),
  );
  await page.evaluate(() => window.__savedSubmissions!.refresh("history"));
  await settleSubmissions(page);
  await expect(page.getByRole("alert")).toContainText(
    "You do not have permission for this operation.",
  );
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", {
      name: `Remove submission: ${savedSubmission.title}`,
    }),
  ).toHaveCount(0);
});

test("history invalidation without refetch withholds retained rows and selected details", async ({
  page,
}) => {
  await savedHistory(page);
  const dialog = await openSubmissionRemoval(page);
  await page.evaluate(() => window.__savedSubmissions!.invalidate("history"));
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText(savedSubmission.title, { exact: true }),
  ).toHaveCount(0);
});

test("a fresh removal preflight refusal removes the older actionable history without a DELETE", async ({
  page,
}) => {
  const { state } = await savedHistory(page);
  const dialog = await openSubmissionRemoval(page);
  await page.route("**/core/clients/*/submission-history", (route) =>
    json(route, { message: "Synthetic history denied during preflight" }, 403),
  );
  await dialog
    .getByRole("button", { name: "Remove submission", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "You do not have permission for this operation.",
  );
  await expect(
    page.getByText(savedSubmission.title, { exact: true }),
  ).toHaveCount(0);
  expect(state.deletes).toEqual([]);
});

test("failed exact client refresh cannot leave its saved history actionable", async ({
  page,
}) => {
  await savedHistory(page);
  const dialog = await openSubmissionRemoval(page);
  await page.route(`**/core/clients/${clientId}`, (route) =>
    json(route, { message: "Synthetic client denied" }, 403),
  );
  await page.evaluate(() => window.__savedSubmissions!.refresh("client"));
  await settleSubmissions(page);
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText(savedSubmission.title, { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText(
    "You do not have permission for this operation.",
  );
});

test("a newer successful history requires selecting the updated row again", async ({
  page,
}) => {
  await savedHistory(page);
  const dialog = await openSubmissionRemoval(page);
  const changed = { ...savedSubmission, title: "Updated saved submission" };
  await page.evaluate(
    (rows) => window.__savedSubmissions!.replaceHistory(rows),
    [changed],
  );
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText(changed.title, { exact: true })).toBeVisible();
  await page
    .getByRole("button", {
      name: `Remove submission: ${changed.title}`,
      exact: true,
    })
    .click();
  await expect(dialog).toContainText(changed.title);
  await expect(dialog).not.toContainText(savedSubmission.title);
});

test("an unavailable history leaves the independent capability feed usable", async ({
  page,
}) => {
  const { unexpected } = await installRemoval(page);
  await page.route("**/core/clients/*/submission-history", (route) =>
    json(route, { message: "Synthetic history denied" }, 403),
  );
  await page.goto(`/portfolio/${clientId}/capabilities`);
  await expect(
    page.getByRole("heading", { name: "Capabilities", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add capability", exact: true }),
  ).toBeEnabled();
  await page.locator("summary").filter({ hasText: "Past performance" }).click();
  await expect(
    page.getByRole("region", { name: "Past performance" }).getByRole("alert"),
  ).toContainText("You do not have permission for this operation.");
  expect(unexpected).toEqual([]);
});
