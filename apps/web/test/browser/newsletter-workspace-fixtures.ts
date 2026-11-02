import type { Page } from "@playwright/test";

/** Use the canonical workspace's actual details action in future browser runs. */
export async function openNewsletterDetails(page: Page) {
  if (await page.getByLabel("Subject", { exact: true }).isVisible()) return;
  const menu = page
    .locator("details")
    .filter({ has: page.locator("summary").filter({ hasText: /^Actions/ }) });
  if ((await menu.getAttribute("open")) === null)
    await menu.locator("summary").click();
  await menu
    .getByRole("button", { name: "Newsletter details", exact: true })
    .click();
  await menu.locator("summary").click();
}
