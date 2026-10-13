import { test, expect } from "@playwright/test";
import { client, clientId, installFixtures, json } from "./fixtures";
import { installProfileCurrentState } from "./profile-current-state-fixtures";

const details = {
  ...client,
  primaryContactName: "Synthetic Contact",
  primaryContactEmail: "contact@example.test",
  primaryContactPhone: "+1 202 555 0142",
  cageCode: "1AB2C",
  uei: "ABC123DEF456",
  naicsCodes: ["541330"],
  pscCodes: ["R425"],
  applicantTypes: ["Small businesses"],
  submissionTracks: ["NDAA"],
  issueCodes: ["DEF"],
  intakeData: {
    ein: "123456789",
    samStatus: "Active",
    samExpirationDate: "2027-06-14",
    ldaRegistrantName: "Synthetic Registrant",
    sectors: ["DEFENSE"],
    fundingPriorities: ["Synthetic funding priority"],
    engagementStartDate: "2026-09-01",
    internalNotes: "Saved synthetic intake note",
    sbClassification: { sb: true },
  },
};

test("CI-01 standard reader can inspect saved client details and government fields", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/") && request.method() !== "GET")
      writes.push(request.url());
  });
  await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
    json(route, details),
  );
  await page.route("**/api/backend/core/me", (route) =>
    json(route, {
      user: {
        id: "91000000-0000-4000-8000-000000000001",
        clerkUserId: "user-test",
        email: "reader@example.test",
        name: "Synthetic Reader",
      },
      tenant: {
        id: "92000000-0000-4000-8000-000000000001",
        name: "Synthetic Firm",
      },
      role: "standard_user",
    }),
  );
  await page.goto(`/portfolio/${clientId}`);
  await expect(
    page.getByRole("heading", { name: "Client details", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(details.primaryContactEmail, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Saved synthetic intake note", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Government info", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Government info",
    exact: true,
  });
  for (const value of [
    "1AB2C",
    "ABC123DEF456",
    "123456789",
    "Synthetic Registrant",
    "541330",
    "R425",
    "DEF",
    "NDAA Authorization Request",
  ])
    await expect(dialog.getByText(value, { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Edit/ })).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("government-standard-reader.png"),
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Government info", exact: true }),
  ).toBeFocused();
  expect(writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("CI-02 view search selects the canonical current-client route", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  await page.goto(`/portfolio/${clientId}`);
  await page
    .getByRole("button", { name: "Switch client view: Overview" })
    .click();
  const search = page.getByRole("combobox", { name: "Jump to a view" });
  await expect(search).toBeFocused();
  await search.fill("files");
  await expect(page.getByRole("option")).toHaveCount(1);
  await page.screenshot({ path: info.outputPath("view-search.png") });
  await search.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}/files$`));
  await page.keyboard.press("g");
  await page.keyboard.press("o");
  await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}$`));
  expect(unexpected).toEqual([]);
});

test("CI-03 account roster shows supplied member email and inline addition", async ({
  page,
}, info) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  await page.goto("/profile-current-state.html?mode=team");
  const row = page.getByRole("listitem").filter({ hasText: "Olivia Owner" });
  await expect(
    row.getByText(state.team[0]!.email!, { exact: false }),
  ).toBeVisible();
  const member = await page
    .getByRole("combobox", { name: "Add team member", exact: true })
    .boundingBox();
  const role = await page
    .getByRole("textbox", { name: "Role", exact: true })
    .boundingBox();
  expect(member).not.toBeNull();
  expect(role).not.toBeNull();
  expect(Math.abs(member!.y - role!.y)).toBeLessThan(2);
  await page.screenshot({ path: info.outputPath("account-team-desktop.png") });
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("CI-04 choice groups retain their distinct desktop layouts", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  await page.goto("/portfolio");
  await page
    .getByRole("button", { name: "Add profile", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: /Manual entry/ }).click();
  const dialog = page.getByRole("dialog", { name: "Add profile", exact: true });
  const company = dialog.getByRole("group", {
    name: "Small Business Classification",
  });
  const outer = await company.boundingBox();
  const foreign = await company
    .locator("label")
    .filter({ hasText: "Foreign-owned" })
    .boundingBox();
  expect(foreign!.width).toBeGreaterThan(outer!.width * 0.9);
  await page.screenshot({ path: info.outputPath("company-choices.png") });
  await dialog
    .getByRole("button", { name: "2. Government Registration", exact: true })
    .click();
  const certifications = dialog
    .getByRole("group", { name: "Federal set-aside certifications" })
    .locator("label");
  const y = await certifications.evaluateAll((labels) =>
    labels.map((label) => label.getBoundingClientRect().y),
  );
  expect(new Set(y.map(Math.round)).size).toBe(1);
  await page.screenshot({ path: info.outputPath("registration-choices.png") });
  await dialog
    .getByRole("button", { name: "3. Sector & Tracks", exact: true })
    .click();
  const tracks = dialog
    .getByRole("group", { name: "Active submission tracks" })
    .locator("label");
  const positions = await tracks.evaluateAll((labels) =>
    labels.map((label) => label.getBoundingClientRect().y),
  );
  expect(positions[0]).toBe(positions[1]);
  expect(positions[2]).toBeGreaterThan(positions[1]!);
  await page.screenshot({ path: info.outputPath("track-choices.png") });
  expect(unexpected).toEqual([]);
});

test("CI-02 keyboard search has an empty state, arrow selection and dialog/input boundaries", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  await page.goto(`/portfolio/${clientId}`);
  await expect(
    page.getByRole("button", { name: "Government info", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Control+j");
  const search = page.getByRole("combobox", { name: "Jump to a view" });
  await expect(search).toBeFocused();
  await expect(page.getByRole("option")).toHaveCount(9);
  await page.screenshot({ path: info.outputPath("view-switcher-full.png") });
  await search.fill("no such view");
  await expect(page.getByRole("status")).toHaveText(
    "No matching client views.",
  );
  await search.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}$`));
  await search.fill("");
  await search.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: "Objectives", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await search.press("ArrowUp");
  await expect(
    page.getByRole("option", { name: "Overview", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await search.press("g");
  await search.press("f");
  await expect(search).toHaveValue("gf");
  await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}$`));
  await search.press("Escape");
  await expect(
    page.getByRole("button", { name: "Switch client view: Overview" }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Government info", exact: true })
    .click();
  await page.keyboard.press("Control+j");
  await page.keyboard.press("g");
  await page.keyboard.press("f");
  await expect(
    page.getByRole("dialog", { name: "Government info", exact: true }),
  ).toBeVisible();
  await expect(search).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}$`));
  expect(unexpected).toEqual([]);
});

test("CI-01 unavailable client never exposes saved details or government action", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
    json(route, { message: "Denied" }, 403),
  );
  await page.goto(`/portfolio/${clientId}`);
  await expect(page.getByRole("alert").first()).toContainText("permission");
  await expect(
    page.getByRole("heading", { name: "Client details", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Government info", exact: true }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

test("CI-01 government read view fits a narrow screen and keeps absent values explicit", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/portfolio/${clientId}`);
  await page
    .getByRole("button", { name: "Government info", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Government info",
    exact: true,
  });
  await expect(
    dialog.getByText("Not provided", { exact: true }).first(),
  ).toBeVisible();
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Tab");
  expect(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("government-mobile.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  expect(unexpected).toEqual([]);
});

test("CI-04 all three choice groups stack without horizontal overflow on mobile", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/portfolio");
  await page
    .getByRole("button", { name: "Add profile", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: /Manual entry/ }).click();
  const dialog = page.getByRole("dialog", { name: "Add profile", exact: true });
  for (const [tab, group] of [
    ["1. Company Info", "Small Business Classification"],
    ["2. Government Registration", "Federal set-aside certifications"],
    ["3. Sector & Tracks", "Active submission tracks"],
  ] as const) {
    await dialog.getByRole("button", { name: tab, exact: true }).click();
    const boxes = await dialog
      .getByRole("group", { name: group })
      .locator("label")
      .evaluateAll((labels) =>
        labels.map((label) => ({
          x: label.getBoundingClientRect().x,
          y: label.getBoundingClientRect().y,
        })),
      );
    expect(new Set(boxes.map((box) => Math.round(box.x))).size).toBe(1);
    expect(new Set(boxes.map((box) => Math.round(box.y))).size).toBe(
      boxes.length,
    );
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`${tab[0]}-choices-mobile.png`),
    });
  }
  expect(unexpected).toEqual([]);
});

test("CI-02 narrow dark view switcher keeps keyboard selection visible", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  await page.setViewportSize({ width: 390, height: 600 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`/portfolio/${clientId}`);
  await expect(
    page.getByRole("button", { name: "Switch client view: Overview" }),
  ).toBeVisible();
  await page.keyboard.press("Control+j");
  const search = page.getByRole("combobox", { name: "Jump to a view" });
  await expect(search).toBeFocused();
  await search.press("ArrowUp");
  const selected = page.getByRole("option", { name: "Files", exact: true });
  await expect(selected).toHaveAttribute("aria-selected", "true");
  const box = await selected.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(600);
  const inputBox = await search.boundingBox();
  const listBox = await page
    .getByRole("listbox", { name: "Client views" })
    .boundingBox();
  const popupBox = await page.getByRole("dialog").boundingBox();
  expect(inputBox!.y).toBeGreaterThanOrEqual(popupBox!.y);
  expect(inputBox!.y + inputBox!.height).toBeLessThanOrEqual(listBox!.y);
  await page.screenshot({
    path: info.outputPath("view-switcher-mobile-dark.png"),
  });
  await search.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}/files$`));
  expect(unexpected).toEqual([]);
});
