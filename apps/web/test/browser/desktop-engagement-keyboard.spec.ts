import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { client, clientId, meeting, setup } from "./next-modules-fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { tabTo, expectFocusEvidence } from "../accessibility-interaction";
import { expectRenderedContrast } from "../rendered-contrast";
import { expectAccessibleHome } from "../accessibility";
for (const colorScheme of ["light", "dark"] as const) {
  test(`Desktop Engagement client navigation keeps physical keyboard focus and contrast ${colorScheme}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1440, height: 1040 });
    await page.emulateMedia({ colorScheme });
    await setup(page, {
      ...moduleRouteFixtures,
      "clients.list": [client],
      "engagement.meetings": [meeting],
    });
    await page.goto("/modules/engagement?view=overview");
    const table = page.getByRole("table", {
      name: "Client engagement activity",
      exact: true,
    });
    const button = table.getByRole("button", {
      name: client.name,
      exact: true,
    });
    await tabTo(page, button);
    await expectFocusEvidence(button, info);
    await expectRenderedContrast(
      button,
      info,
      "Desktop client-to-Outreach action",
    );
    await expectAccessibleHome(page, info);
    await page.screenshot({
      path: info.outputPath("desktop-engagement-keyboard.png"),
    });
    await button.press("Enter");
    await expect(page).toHaveURL(
      new RegExp(
        `clientId=${clientId}.*view=outreach|view=outreach.*clientId=${clientId}`,
      ),
    );
    await expect(
      page.getByRole("tab", { name: "Outreach", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
  });
}
