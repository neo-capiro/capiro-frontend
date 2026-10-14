import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { meeting, setup } from "./next-modules-fixtures";
import { expectAccessibleHome } from "../accessibility";

for (const colorScheme of ["light", "dark"] as const) {
  test(`Desktop Engagement overview and selected meeting preserve distinct intents at 1440 ${colorScheme}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1440, height: 1040 });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await setup(page, {
      ...moduleRouteFixtures,
      "engagement.meetings": [meeting],
      "engagement.meeting": meeting,
      "engagement.notes": [],
      "engagement.debriefs": [],
    });
    await page.goto("/modules/engagement?view=overview");
    await expect(
      page.getByRole("heading", {
        name: "Engagement Manager",
        exact: true,
        level: 1,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Overview", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.screenshot({
      path: info.outputPath("desktop-engagement-overview.png"),
    });
    await page.getByRole("tab", { name: "Meetings", exact: true }).click();
    await page.getByRole("button", { name: /Current meeting/ }).click();
    const detail = page.getByRole("region", {
      name: "Selected meeting",
      exact: true,
    });
    const list = page.getByRole("region", {
      name: "Meeting list",
      exact: true,
    });
    await expect(detail).toBeVisible();
    await expect(list).toBeVisible();
    await info.attach("engagement-state-coverage", {
      body: JSON.stringify({
        overviewReference: "411:93988",
        selectedMeetingReference: "NO_ADMITTED_FULL_MODULES_DETAIL_FRAME",
        detail: await detail.boundingBox(),
        list: await list.boundingBox(),
        scope: "canonical local fixture; not native or full overview parity",
      }),
      contentType: "application/json",
    });
    await page.screenshot({
      path: info.outputPath("desktop-selected-meeting.png"),
    });
    await expectAccessibleHome(page, info);
  });
}
