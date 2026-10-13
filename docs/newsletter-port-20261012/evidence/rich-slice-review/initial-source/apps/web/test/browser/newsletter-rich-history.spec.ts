import { test, expect } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";

test("typing after Undo retains editor focus and the complete new branch", async ({
  page,
}) => {
  await onlyLocalRequests(page);
  await operationFixtures(page, moduleRouteFixtures);
  await page.goto("/modules/workspace?view=rich-newsletter");
  await page
    .getByRole("button", { name: /^Heading · This week in policy/ })
    .click();
  const editor = page.getByRole("textbox", { name: "Block rich text" });
  await editor.fill("First local edit");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await editor.click();
  await editor.press("Control+End");
  await editor.pressSequentially(" branch");
  await expect(editor).toBeFocused();
  await expect(editor).toHaveText("This week in policy branch");
  await expect(
    page.getByRole("button", { name: "Redo", exact: true }),
  ).toBeDisabled();
});
