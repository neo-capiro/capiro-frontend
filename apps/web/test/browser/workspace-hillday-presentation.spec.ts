import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import {
  hillDayResumeFixture,
  resumeUrl,
  savedJob,
} from "./workspace-hillday-resume-fixture";

test("generation cards show actual settled units and retain unknown retry consent", async ({
  page,
}, info) => {
  const f = await hillDayResumeFixture(page);
  await page.goto(resumeUrl());
  const card = page.getByRole("region", {
    name: "Generation progress",
    exact: true,
  });
  await expect(card.getByText("50%", { exact: true })).toBeVisible();
  await expect(
    card
      .getByRole("list", { name: "Generation progress by meeting" })
      .getByRole("listitem"),
  ).toHaveText(["✓Meeting 1Completed", "↻Meeting 2Drafting…"]);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: info.outputPath("hillday-generation-running.png"),
  });
  const failed = savedJob("failed");
  failed.units[1] = {
    ...failed.units[1]!,
    state: "unknown",
    reason: "Provider outcome unresolved",
  };
  f.setJob(failed);
  await card
    .getByRole("button", { name: "Refresh progress", exact: true })
    .click();
  await expect(
    card.getByText("Outcome unknown", { exact: false }),
  ).toBeVisible();
  await expect(card.getByText("50%", { exact: true })).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Retry failed and unknown units" }),
  ).toBeDisabled();
  await page.screenshot({
    path: info.outputPath("hillday-generation-unknown.png"),
  });
  f.setJob({
    ...failed,
    status: "complete",
    units: [
      failed.units[0]!,
      { ...failed.units[1]!, state: "failed", reason: "Source unavailable" },
    ],
  });
  await card
    .getByRole("button", { name: "Refresh progress", exact: true })
    .click();
  await expect(card.getByText("100%", { exact: true })).toBeVisible();
  await expect(
    card.getByText("Unavailable · Source unavailable", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("hillday-generation-unavailable.png"),
  });
  expect(
    f.calls.filter((c) =>
      [
        "workspace.hillday.generate",
        "workspace.hillday.retry",
        "workspace.hillday.cancel",
      ].includes(c.key),
    ),
  ).toHaveLength(0);
});

test("meetings group existing controls and selection in one footer; context remains saved", async ({
  page,
}, info) => {
  const f = await hillDayResumeFixture(page);
  await page.goto(resumeUrl("meetings"));
  const selected = page.getByRole("checkbox", {
    name: "Include Saved calendar meeting",
  });
  await expect(selected).toBeChecked();
  const footer = page
    .locator("footer")
    .filter({ has: page.getByRole("button", { name: "Resolve attendees" }) });
  await expect(
    footer.getByRole("button", { name: "Back", exact: true }),
  ).toBeVisible();
  await expect(
    footer.getByText("2 meetings selected", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: info.outputPath("hillday-meetings.png") });
  await selected.focus();
  await page.keyboard.press("Space");
  await expect(
    footer.getByText("1 meetings selected", { exact: true }),
  ).toBeVisible();
  await expect(
    footer.getByRole("button", { name: "Resolve attendees" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(selected).not.toBeChecked();
  expect(
    f.calls.filter((c) => c.key === "workspace.hillday.meetings"),
  ).toHaveLength(0);
  await page.goto(resumeUrl("context"));
  await expect(page.getByLabel("Meeting context", { exact: true })).toHaveValue(
    "Saved meeting context",
  );
  await page.screenshot({ path: info.outputPath("hillday-context.png") });
  expect(
    f.calls.filter((c) => c.key === "workspace.hillday.create"),
  ).toHaveLength(0);
});
