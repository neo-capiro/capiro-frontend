import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import {
  client,
  clientId,
  otherTaskId,
  setup,
  taskId,
} from "./next-modules-fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { expectAccessibleHome } from "../accessibility";
for (const colorScheme of ["light", "dark"] as const) {
  test(`Desktop Engagement summary and team navigation survive history and reload ${colorScheme}`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ colorScheme });
    const followup = {
      id: taskId,
      title: "Synthetic returned follow-up",
      status: "todo",
      dueDate: null,
      description: null,
      ownerUserId: "60000000-0000-4000-8000-000000000001",
      client: null,
    };
    await setup(page, {
      ...moduleRouteFixtures,
      "clients.list": [client],
      "engagement.tasks": [
        followup,
        { ...followup, id: otherTaskId, ownerUserId: null },
        {
          ...followup,
          id: "51000000-0000-4000-8000-000000000003",
          status: "done",
        },
      ],
    });
    await page.goto(`/modules/engagement?clientId=${clientId}&view=overview`);
    await expect(
      page.getByText("2 returned open follow-ups · 1 assigned · 1 unassigned", {
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath("desktop-engagement-workload.png"),
    });
    await page
      .getByRole("button", { name: "Open team workload →", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`clientId=${clientId}.*view=team`));
    await expect(
      page.getByRole("tab", { name: "Team", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.reload();
    await expect(
      page.getByRole("tab", { name: "Team", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.goBack();
    await expect(
      page.getByRole("tab", { name: "Overview", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByLabel("Engagement client scope", { exact: true }),
    ).toHaveValue(clientId);
    await expectAccessibleHome(page, info);
  });
}
