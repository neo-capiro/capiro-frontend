import { expect, test, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";

const meeting = {
  id: "40000000-0000-4000-8000-000000000001",
  subject: "Synthetic briefing alpha",
  startsAt: "2026-10-12T14:00:00Z",
  endsAt: "2026-10-12T15:00:00Z",
  status: "scheduled",
  location: "Video meeting",
  description: null,
  client: {
    id: "30000000-0000-4000-8000-000000000001",
    name: "Synthetic Aerospace",
  },
  joinLink: "https://meet.example.test/alpha?code=synthetic",
  preps: [],
  notes: [],
  debriefs: [],
  visibility: "private",
};
const second = {
  ...meeting,
  id: "40000000-0000-4000-8000-000000000002",
  subject: "Synthetic briefing beta",
  joinLink: "https://meet.example.test/beta",
};
async function setup(page: Page, detail: object = meeting) {
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    "me.read": testIdentity,
    "clients.list": [],
    "engagement.meetings": [meeting, second],
    "engagement.meeting": detail,
    "engagement.notes": [],
    "engagement.debriefs": [],
  });
}
async function openFirst(page: Page) {
  await page.goto("/modules/engagement?view=meetings");
  await page.getByRole("button", { name: /Synthetic briefing alpha/ }).click();
}

test("MS06 baseline: current supplied link appears with safe external-link attributes", async ({
  page,
}) => {
  await setup(page);
  await openFirst(page);
  const join = page.getByRole("link", { name: "Join meeting", exact: true });
  await expect(join).toHaveAttribute("href", meeting.joinLink);
  await expect(join).toHaveAttribute("target", "_blank");
  await expect(join).toHaveAttribute("rel", "noopener noreferrer");
  await expect(join).toHaveAttribute("referrerpolicy", "no-referrer");
});

test("MS06 baseline: meetings retain selectable list beside current detail with Prep entry", async ({
  page,
}) => {
  await setup(page);
  await openFirst(page);
  const list = page.getByRole("region", { name: "Meeting list", exact: true });
  const detail = page.getByRole("region", {
    name: "Selected meeting",
    exact: true,
  });
  await expect(
    detail.getByRole("heading", { name: meeting.subject }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    detail.getByRole("tab", { name: "Prep", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const left = await list.boundingBox(),
    right = await detail.boundingBox();
  expect(left && right && left.x + left.width + 15 <= right.x).toBeTruthy();
  expect(left?.width).toBe(280);
  await page.screenshot({
    path: "test-results/remaining-ms06-desktop.png",
    fullPage: true,
  });
});

for (const joinLink of [
  null,
  "",
  "javascript:alert(1)",
  "data:text/html,hello",
  "https://name:secret@meet.example.test/",
  "//meet.example.test/alpha",
]) {
  test(`MS06 missing or unsafe supplied link is inactive: ${joinLink}`, async ({
    page,
  }) => {
    await setup(page, { ...meeting, joinLink });
    await openFirst(page);
    await expect(
      page.getByRole("tab", { name: "Prep", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Join meeting", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Join meeting", exact: true }),
    ).toBeDisabled();
  });
}

test("MS06 loading and denied detail never activate summary link or read its materials", async ({
  page,
}) => {
  await setup(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let materialReads = 0;
  page.on("request", (request) => {
    if (/engagement\.(notes|debriefs)/.test(request.url())) materialReads++;
  });
  await page.route("**/api/capiro/engagement.meeting?*", async (route) => {
    await held;
    await route.fulfill({
      status: 403,
      json: { message: "Synthetic current read denied" },
    });
  });
  await openFirst(page);
  await expect(
    page.getByRole("button", { name: "Join meeting", exact: true }),
  ).toBeDisabled();
  expect(materialReads).toBe(0);
  release();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic current read denied",
  );
  await expect(
    page.getByRole("link", { name: "Join meeting", exact: true }),
  ).toHaveCount(0);
  expect(materialReads).toBe(0);
});

for (const foreign of [
  second,
  {
    ...meeting,
    client: { ...meeting.client, id: "30000000-0000-4000-8000-000000000002" },
  },
]) {
  test(`MS06 foreign receipt stays unavailable: ${foreign.id}:${foreign.client.id}`, async ({
    page,
  }) => {
    await setup(page, foreign);
    let materialReads = 0;
    page.on("request", (request) => {
      if (/engagement\.(notes|debriefs)/.test(request.url())) materialReads++;
    });
    await openFirst(page);
    await expect(page.getByRole("alert")).toContainText(
      "does not match the selected meeting",
    );
    await expect(
      page.getByRole("link", { name: "Join meeting", exact: true }),
    ).toHaveCount(0);
    expect(materialReads).toBe(0);
  });
}

test("MS06 replaced detail cannot publish its late link", async ({ page }) => {
  await setup(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/capiro/engagement.meeting?*", async (route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    );
    if (input.params.id === meeting.id) {
      await held;
      await route.fulfill({ json: meeting }).catch(() => {});
    } else await route.fulfill({ json: second });
  });
  await openFirst(page);
  await page.getByRole("button", { name: /Synthetic briefing beta/ }).click();
  const link = page.getByRole("link", { name: "Join meeting", exact: true });
  await expect(link).toHaveAttribute("href", second.joinLink);
  release();
  await expect(
    page.getByRole("heading", { name: second.subject }),
  ).toBeVisible();
  await expect(link).toHaveAttribute("href", second.joinLink);
});

test("MS06 phone detail stays in bounds and Escape restores its list opener", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await openFirst(page);
  const heading = page.getByRole("heading", { name: meeting.subject });
  await expect(heading).toBeFocused();
  const detail = page.getByRole("region", {
    name: "Selected meeting",
    exact: true,
  });
  const box = await detail.boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 390).toBeTruthy();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/remaining-ms06-phone.png",
    fullPage: true,
  });
  await heading.press("Escape");
  await expect(
    page.getByRole("button", { name: /Synthetic briefing alpha/ }),
  ).toBeFocused();
  await expect(
    page.getByRole("link", { name: "Join meeting", exact: true }),
  ).toHaveCount(0);
});

test("MS06 client replacement clears selection before a new list can expose the prior link", async ({
  page,
}) => {
  await setup(page);
  const clientId = "30000000-0000-4000-8000-000000000002";
  await page.route("**/api/capiro/clients.list?*", (route) =>
    route.fulfill({
      json: [
        {
          id: clientId,
          name: "Synthetic Replacement",
          status: "ACTIVE",
          profileStatus: "ACTIVE",
        },
      ],
    }),
  );
  await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
    route.fulfill({
      json: {
        id: clientId,
        name: "Synthetic Replacement",
        status: "ACTIVE",
        profileStatus: "ACTIVE",
      },
    }),
  );
  await openFirst(page);
  await expect(
    page.getByRole("link", { name: "Join meeting", exact: true }),
  ).toBeVisible();
  await page.route("**/api/capiro/engagement.meetings?*", (route) =>
    route.fulfill({
      json: [
        { ...second, client: { id: clientId, name: "Synthetic Replacement" } },
      ],
    }),
  );
  await page.getByLabel("Engagement client scope").selectOption(clientId);
  await expect(
    page.getByRole("button", { name: /Synthetic briefing beta/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Join meeting", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Selected meeting", exact: true }),
  ).toContainText("Select a meeting");
});
