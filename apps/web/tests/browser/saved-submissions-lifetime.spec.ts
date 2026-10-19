import { expect, test } from "@playwright/test";
import { actorId, savedSubmission } from "./overview-removal-fixtures";
import {
  heldSubmissionDelete,
  openSubmissionRemoval,
  savedHistory,
  settleSubmissions,
} from "./saved-submissions-fixtures";

for (const source of ["identity", "history"] as const) {
  test(`a held preflight cannot delete after ${source} is invalidated and restored`, async ({
    page,
  }) => {
    const { state } = await savedHistory(page);
    const initialHistoryReads = state.historyGets;
    const dialog = await openSubmissionRemoval(page);
    state.holdHistory = true;
    try {
      await dialog
        .getByRole("button", { name: "Remove submission", exact: true })
        .click();
      await expect.poll(() => state.historyGets).toBe(initialHistoryReads + 1);
      await page.evaluate(
        (name) => window.__savedSubmissions!.invalidate(name, true),
        source,
      );
    } finally {
      state.holdHistory = false;
      state.release();
    }
    await settleSubmissions(page);
    expect(state.deletes).toEqual([]);
    await expect(dialog).not.toBeVisible();
  });
}

test("closing a dispatched removal cannot invalidate history or publish a late success", async ({
  page,
}) => {
  const { state } = await savedHistory(page);
  const initialHistoryReads = state.historyGets;
  const dialog = await openSubmissionRemoval(page);
  const held = await heldSubmissionDelete(page);
  try {
    await dialog
      .getByRole("button", { name: "Remove submission", exact: true })
      .click();
    await held.started;
    expect(state.historyGets).toBe(initialHistoryReads + 1);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  } finally {
    held.release();
    await held.finished;
  }
  await settleSubmissions(page);
  expect(state.historyGets).toBe(initialHistoryReads + 1);
  await expect(
    page.getByText("Saved submission removed.", { exact: false }),
  ).toHaveCount(0);
  const reopened = await openSubmissionRemoval(page);
  await expect(reopened).toContainText("result is uncertain");
  await expect(
    reopened.getByRole("button", { name: "Remove submission", exact: true }),
  ).toBeDisabled();
});

test("an obsolete actor's delete cannot invalidate either current or replacement history", async ({
  page,
}) => {
  await savedHistory(page);
  const dialog = await openSubmissionRemoval(page);
  const held = await heldSubmissionDelete(page);
  try {
    await dialog
      .getByRole("button", { name: "Remove submission", exact: true })
      .click();
    await held.started;
    await page.evaluate(() => window.__savedSubmissions!.actor(true));
  } finally {
    held.release();
    await held.finished;
  }
  await settleSubmissions(page);
  const old = await page.evaluate(
    (id) =>
      window
        .__savedSubmissions!.snapshots()
        .find((row) => row.key.includes(id)),
    actorId,
  );
  expect(old).toMatchObject({ status: "success", invalidated: false });
  await expect(
    page.getByText("Saved submission removed.", { exact: false }),
  ).toHaveCount(0);
});

test("an uncertain removal remains fenced when its view is reopened in the same session", async ({
  page,
}) => {
  const { state } = await savedHistory(page);
  state.mode = "wrongAck";
  const dialog = await openSubmissionRemoval(page);
  await dialog
    .getByRole("button", { name: "Remove submission", exact: true })
    .click();
  await expect(dialog).toContainText("result is uncertain");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.evaluate(() => window.__savedSubmissions!.show(false));
  await expect(
    page.getByText("Saved-submission view unmounted", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.__savedSubmissions!.show(true));
  const reopened = await openSubmissionRemoval(page);
  await expect(
    reopened.getByRole("button", { name: "Remove submission", exact: true }),
  ).toBeDisabled();
  await expect(reopened).toContainText("result is uncertain");
  expect(state.deletes).toHaveLength(1);
});

test("Cancel returns keyboard focus to the current saved submission removal control", async ({
  page,
}) => {
  await savedHistory(page);
  const button = page.getByRole("button", {
    name: `Remove submission: ${savedSubmission.title}`,
    exact: true,
  });
  await button.focus();
  await button.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Remove submission?",
    exact: true,
  });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(button).toBeFocused();
});
