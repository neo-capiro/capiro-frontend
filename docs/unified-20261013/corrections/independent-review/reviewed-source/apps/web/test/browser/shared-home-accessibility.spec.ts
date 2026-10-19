import { test, expect } from "@playwright/test";
import { expectAccessibleHome } from "../accessibility";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";

for (const width of [1440, 390]) {
  for (const mode of ["meri", "modules"]) {
    test(`${mode} home retains full default axe checks at ${width}px`, async ({
      page,
    }, testInfo) => {
      await onlyLocalRequests(page);
      await operationFixtures(page, {
        "me.read": testIdentity,
        "clients.list": [],
      });
      await page.setViewportSize({
        width,
        height: width === 1440 ? 1040 : 844,
      });
      await page.goto(`/${mode}`);
      if (mode === "meri") {
        await expect(
          page.getByLabel("Message draft", { exact: true }),
        ).toBeVisible();
      } else {
        await expect(
          page.getByLabel("Client profile scope", { exact: true }),
        ).toBeEnabled();
      }
      await expectAccessibleHome(page, testInfo);
    });
  }
}
