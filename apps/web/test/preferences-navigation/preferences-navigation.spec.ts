import { expect, test, type Page } from "@playwright/test";

const labels: Record<string, string> = {
  personal: "Personal defaults",
  connections: "Connections",
  "connected-services": "Connected services",
  "data-access": "Data access",
  usage: "Usage and limits",
  skills: "Skills and templates",
  updates: "Workspace updates",
  privacy: "Privacy and retention",
  help: "Help and shortcuts",
};

const tab = (page: Page, id: string) =>
  page.getByRole("tab", { name: labels[id] ?? id, exact: true });

async function shown(page: Page, id: string) {
  await expect(page.getByTestId("page-body")).toHaveAttribute("data-page", id);
  await expect(tab(page, id)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { selected: true })).toHaveCount(1);
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
});

// VQA-015 regression: Next keeps the committed page rendered while a push's response is
// still streaming. Clicking the still-shown page in that window must supersede the
// pending navigation; the earlier head took the current-page early return and lost it.
test("returns to the current page when a different tab is still pending", async ({
  page,
}) => {
  await page.goto("/settings/preferences?page=data-access&reviewDelay=1");
  await shown(page, "data-access");
  const outgoing = page.waitForRequest(
    (request) =>
      request.url().includes("page=privacy") && request.url().includes("_rsc="),
  );
  await tab(page, "privacy").click();
  await outgoing;
  await expect(tab(page, "data-access")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await tab(page, "data-access").click();
  await page.waitForTimeout(2000);
  await shown(page, "data-access");
  await expect(page).toHaveURL(/page=data-access/);
});

test("a settled current tab click stays a no-op", async ({ page }) => {
  await page.goto("/settings/preferences?page=data-access");
  await shown(page, "data-access");
  const before = await page.evaluate(() => history.length);
  await tab(page, "data-access").click();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => history.length)).toBe(before);
  await shown(page, "data-access");
});

test("rapid distinct selections settle on the last target", async ({
  page,
}) => {
  await page.goto(
    "/settings/preferences?page=personal&tab=audit&reviewDelay=1",
  );
  await shown(page, "personal");
  await page.evaluate(() => {
    for (const label of [
      "Connections",
      "Privacy and retention",
      "Help and shortcuts",
    ]) {
      const button = [
        ...document.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
      ].find((element) => element.textContent === label);
      button?.click();
    }
  });
  await shown(page, "help");
  await expect(page).toHaveURL(/page=help&tab=audit/);
});
