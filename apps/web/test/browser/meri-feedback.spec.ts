import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
test("an expired retry cannot erase an earlier uncertain request", async ({
  page,
}) => {
  const dialog = await open(page, "expired");
  await dialog
    .getByRole("button", { name: "Save feedback", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Retry exact feedback" }),
  ).toBeEnabled();
  await dialog.getByRole("button", { name: "Retry exact feedback" }).click();
  await expect(dialog.getByRole("alert")).toContainText("earlier save");
  await expect(
    dialog.getByRole("button", { name: "Retry exact feedback" }),
  ).toBeEnabled();
  await expect(dialog.getByLabel("Type of feedback")).toBeDisabled();
});
const open = async (page: import("@playwright/test").Page, mode = "") => {
  await page.goto(`/feedback/index.html${mode ? `?mode=${mode}` : ""}`);
  await page
    .getByRole("button", { name: "Give feedback", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Save feedback", exact: true }),
  ).toBeEnabled();
  return dialog;
};
const capture = async (page: import("@playwright/test").Page, name: string) => {
  if (!process.env.CAPIRO_FEEDBACK_CAPTURE_DIR) return;
  mkdirSync(process.env.CAPIRO_FEEDBACK_CAPTURE_DIR, { recursive: true });
  await page.screenshot({
    path: join(process.env.CAPIRO_FEEDBACK_CAPTURE_DIR, name),
    fullPage: true,
  });
};
test("native turn records factual correction and displays truthful saved context", async ({
  page,
}) => {
  const dialog = await open(page);
  await dialog
    .getByLabel("Type of feedback")
    .selectOption("factual_correction");
  await expect(
    dialog.getByRole("button", { name: "Save feedback", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByLabel("What should be corrected?")
    .fill("The hearing is on 26 October.");
  await capture(page, "feedback-desktop.png");
  await dialog
    .getByRole("button", { name: "Save feedback", exact: true })
    .click();
  await expect(
    dialog.getByText("Factual correction · Recorded · Not reviewed"),
  ).toBeVisible();
  await dialog.getByText("Recorded context", { exact: true }).click();
  await expect(
    dialog.getByText("synthetic.actual.model (including subagents)"),
  ).toBeVisible();
  await capture(page, "feedback-receipt.png");
});
test("preference and recommendation remain distinct and artifact target pins its version", async ({
  page,
}) => {
  const dialog = await open(page);
  await dialog.getByLabel("Was this helpful?").selectOption("not_helpful");
  await dialog
    .getByRole("button", { name: "Save feedback", exact: true })
    .click();
  await expect(
    dialog.getByText("Preference · Recorded · Not reviewed"),
  ).toBeVisible();
  await dialog
    .getByLabel("Feedback about")
    .selectOption({ label: "File 1 · this version" });
  await dialog.getByLabel("Type of feedback").selectOption("recommendation");
  await dialog
    .getByLabel("What do you recommend?")
    .fill("Add the source date to the first paragraph.");
  await dialog
    .getByRole("button", { name: "Save feedback", exact: true })
    .click();
  const requests = await page.evaluate(() =>
    (
      window as unknown as {
        feedbackFixture: {
          requests(): Array<{
            target: { kind: string; versionId?: string };
            signal: { kind: string };
          }>;
        };
      }
    ).feedbackFixture.requests(),
  );
  expect(requests.map((r) => r.signal.kind)).toEqual([
    "preference",
    "recommendation",
  ]);
  expect(requests[1].target.kind).toBe("artifact");
  expect(requests[1].target.versionId).toBeTruthy();
});
test("lost commit acknowledgement freezes fields and readback confirms without another write", async ({
  page,
}) => {
  const dialog = await open(page, "lost-after");
  await dialog
    .getByRole("button", { name: "Save feedback", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "could not be confirmed",
  );
  await expect(dialog.getByLabel("Type of feedback")).toBeDisabled();
  await capture(page, "feedback-unknown.png");
  await dialog
    .getByRole("button", { name: "Check saved feedback", exact: true })
    .click();
  await expect(
    dialog.getByText("Preference · Recorded · Not reviewed"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as { feedbackFixture: { requests(): unknown[] } }
        ).feedbackFixture.requests().length,
    ),
  ).toBe(1);
});
test("unknown request survives reload and identical retry uses its original ID", async ({
  page,
}) => {
  const dialog = await open(page, "lost-before");
  await dialog
    .getByRole("button", { name: "Save feedback", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Retry exact feedback" }),
  ).toBeEnabled();
  await page.reload();
  await page
    .getByRole("button", { name: "Check feedback", exact: true })
    .click();
  const reopened = page.getByRole("dialog");
  await expect(
    reopened.getByRole("button", { name: "Retry exact feedback" }),
  ).toBeEnabled();
  await reopened.getByRole("button", { name: "Retry exact feedback" }).click();
  await expect(
    reopened.getByText("Preference · Recorded · Not reviewed"),
  ).toBeVisible();
  const requests = await page.evaluate(() =>
    (
      window as unknown as { feedbackFixture: { requests(): unknown[] } }
    ).feedbackFixture.requests(),
  );
  expect(requests).toHaveLength(2);
  expect(requests[0]).toEqual(requests[1]);
});
test("stale output is refused visibly without a success receipt", async ({
  page,
}) => {
  const dialog = await open(page, "stale");
  await dialog
    .getByRole("button", { name: "Save feedback", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("This answer changed");
  await expect(
    dialog.getByRole("region", { name: "Saved feedback" }),
  ).toHaveCount(0);
});
test("forged response cannot become a successful save", async ({ page }) => {
  const dialog = await open(page, "forged");
  await dialog
    .getByRole("button", { name: "Save feedback", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Retry exact feedback" }),
  ).toBeVisible();
  await expect(
    dialog.getByText("Preference · Recorded · Not reviewed"),
  ).toHaveCount(0);
});
test("busy dialog prevents dismissal and returns focus after acknowledged save", async ({
  page,
}) => {
  const dialog = await open(page, "slow");
  await dialog
    .getByRole("button", { name: "Save feedback", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Close feedback" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.evaluate(() =>
    (
      window as unknown as { feedbackFixture: { release(): void } }
    ).feedbackFixture.release(),
  );
  await expect(
    dialog.getByText("Preference · Recorded · Not reviewed"),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Close feedback" }).click();
  await expect(
    page.getByRole("button", { name: "Give feedback", exact: true }),
  ).toBeFocused();
});
test("streaming and incomplete histories cannot submit feedback", async ({
  page,
}) => {
  for (const mode of ["streaming", "incomplete"]) {
    await page.goto(`/feedback/index.html?mode=${mode}`);
    await expect(
      page.getByRole("button", { name: "Give feedback", exact: true }),
    ).toBeDisabled();
  }
});
test("phone dialog fits the viewport with labelled keyboard controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await open(page);
  await dialog.getByLabel("Type of feedback").selectOption("recommendation");
  await dialog.getByLabel("What do you recommend?").fill("Show the next step.");
  await capture(page, "feedback-phone.png");
  const box = await dialog.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(358);
  expect(box!.x).toBeGreaterThanOrEqual(15);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
