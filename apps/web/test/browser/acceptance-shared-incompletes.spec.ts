import { test, expect } from "@playwright/test";
import { expectRenderedContrast } from "../rendered-contrast";
import { tabTo, expectFocusEvidence } from "../accessibility-interaction";
import {
  filesFixture,
  filesUrl,
  actionClient,
  connectFiles,
  expectFilesIsolation,
} from "./meri-files-fixtures";

for (const width of [1440, 390]) {
  for (const theme of ["light", "dark"] as const) {
    for (const view of [
      "home",
      "docx",
      "xlsx",
      "unavailable",
      "modules",
    ] as const) {
      test(`Shared incomplete contrast ${view} ${width}px ${theme}`, async ({
        page,
      }, info) => {
        const fixture = await filesFixture(
          page,
          view === "xlsx" ? "xlsx" : "docx",
        );
        await page.setViewportSize({
          width,
          height: width === 1440 ? 1040 : 844,
        });
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: "reduce",
        });
        const route =
          view === "home"
            ? `/meri/fixture/home?clientId=${actionClient.id}`
            : view === "modules"
              ? `/modules?clientId=${actionClient.id}`
              : filesUrl(actionClient.id, view === "xlsx" ? "xlsx" : "docx") +
                (view === "unavailable" ? "&documents-disabled=1" : "");
        await page.goto(route);
        if (view === "home")
          await expect(
            page.getByLabel("Message draft", { exact: true }),
          ).toBeVisible();
        else if (view === "modules")
          await expect(
            page.getByRole("heading", {
              name: /^Everything in Capiro/,
            }),
          ).toBeVisible();
        else if (view !== "unavailable")
          await connectFiles(page, view === "xlsx" ? "xlsx" : "docx");
        else await expect(page.getByRole("main")).toContainText("not enabled");
        const control =
          view === "modules"
            ? page.getByRole("link", { name: "Open Engagement", exact: true })
            : width === 1440
              ? page.getByRole("button", {
                  name: view === "home" ? "New conversation" : "Files",
                  exact: true,
                })
              : page
                  .getByRole("navigation", { name: "Meri sections" })
                  .getByRole("link", { name: "Files", exact: true });
        if (view !== "home" && view !== "modules")
          await expect(
            page.getByRole("button", {
              name: "New conversation",
              exact: true,
              includeHidden: true,
            }),
          ).toBeDisabled();
        await page.mouse.move(0, 0);
        await expectRenderedContrast(control, info, "rest");
        await control.hover();
        await expectRenderedContrast(control, info, "hover");
        await tabTo(page, control);
        await expectFocusEvidence(control, info);
        await expectRenderedContrast(control, info, "focus");
        if (view !== "modules" && width === 390)
          await expect(
            page.getByRole("button", { name: "New conversation", exact: true }),
          ).toBeHidden();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
        expect(fixture.requests).toEqual([]);
        expectFilesIsolation(fixture);
      });
    }
  }
}
