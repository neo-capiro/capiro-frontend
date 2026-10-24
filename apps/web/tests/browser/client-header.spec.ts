import { test, expect } from "@playwright/test";
import { clientId, installFixtures } from "./fixtures";
test("client header supports keyboard navigation and scoped quick-add deep links", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.goto(`/portfolio/${clientId}/work`);
  await expect(
    page.getByRole("button", { name: "Switch client view: Work", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Control+j");
  await expect(
    page.getByRole("listbox", { name: "Client views" }),
  ).toBeVisible();
  await page.getByRole("option", { name: "Objectives", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${clientId}/objectives$`));
  await page.getByRole("button", { name: "Quick add", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "New meeting", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`${clientId}/calendar\\?new=meeting$`),
  );
  const meeting = page.getByRole("dialog", {
    name: "New meeting",
    exact: true,
  });
  await expect(meeting).toBeVisible();
  await meeting.getByRole("button", { name: "Close", exact: true }).click();
  await expect(meeting).not.toBeVisible();
  await expect(page).not.toHaveURL(/new=/);
  // Calendar owns a dedicated meeting header. Return through its real client
  // breadcrumb before exercising the profile header's next quick-add action.
  await page
    .getByRole("navigation", { name: "Breadcrumb", exact: true })
    .getByRole("link", { name: "Test Aerospace", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${clientId}$`));
  await page.getByRole("button", { name: "Quick add", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Account notes", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${clientId}\\?notes=1$`));
  await expect(
    page.getByRole("dialog", { name: "Profile notes", exact: true }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});
