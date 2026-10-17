import { expect, test } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";

const personnelId = "00000000-0000-4000-8000-000000000001";
const row = {
  id: personnelId,
  fullName: "Casey Bennett",
  title: "Program Analyst",
  role: null,
  organization: "Acquisition office",
  service: "Army",
  pePrimary: "0603001A",
  peSecondary: [],
  email: null,
  phone: null,
  publicProfileUrl: null,
  confidence: 0.92,
  status: "active",
  sourceCount: 1,
  lastSeenAt: "2026-10-17T00:00:00.000Z",
};
const detail = {
  ...row,
  programOfRecord: null,
  emailDomain: "example.gov",
  parentOffice: null,
  department: null,
  firstSeenAt: "2026-01-01T00:00:00.000Z",
  sources: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      source: "public_directory",
      sourceUrl: "https://example.gov/roster",
      observedAt: "2026-10-17T00:00:00.000Z",
      confidence: 0.92,
    },
  ],
};

test("DoW detail restores from browser history and reload; read error retries the same ID", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "directory.personnel": { data: [row], total: 1, page: 1, limit: 25 },
    "directory.personnelDetail": detail,
  });
  let failNextDetailRead = false;
  await page.route("**/api/capiro/directory.personnelDetail*", (route) => {
    if (failNextDetailRead) {
      failNextDetailRead = false;
      return route.fulfill({
        status: 503,
        json: { message: "Synthetic detail read unavailable" },
      });
    }
    return route.fulfill({ json: detail });
  });

  await page.goto("/modules/directory?view=department-of-war");
  const rowButton = page.getByRole("button", { name: "Casey Bennett" });
  const profileHeading = page.getByRole("heading", {
    name: "Casey Bennett",
    exact: true,
  });
  await expect(rowButton).toBeVisible();
  await rowButton.click();
  await expect(page).toHaveURL(new RegExp(`personnelId=${personnelId}`));
  await expect(profileHeading).toBeVisible();

  await page.goBack();
  await expect(page).not.toHaveURL(/personnelId=/);
  await expect(rowButton).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`personnelId=${personnelId}`));
  await expect(profileHeading).toBeVisible();

  await page.reload();
  await expect(profileHeading).toBeVisible();
  failNextDetailRead = true;
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic detail read unavailable",
  );
  await expect(page).toHaveURL(new RegExp(`personnelId=${personnelId}`));
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(profileHeading).toBeVisible();
  expect(pageErrors).toEqual([]);
});
