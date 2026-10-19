import { expect, test } from "@playwright/test";
import { capability, clientId, json } from "./fixtures";
import { installCapabilityBoundary } from "./capability-boundary-fixtures";
import {
  installRegistrationBoundary,
  openRegistrations,
  registrationClient,
} from "./capability-registration-fixtures";

const areas = [
  { name: "Counter-UAS interceptors", trl: 6, peNumbers: ["0604134A"] },
  { name: "Autonomy software stack", trl: 9, peNumbers: ["0603461A"] },
  { name: "Sensor fusion", trl: 2, peNumbers: [] },
  { name: "Maritime autonomy", trl: null, peNumbers: [], peNumber: "0604454N" },
].map((area, index) => ({
  ...capability,
  id: `20000000-0000-4000-8000-00000000000${index + 1}`,
  peNumber: null,
  description:
    "A supplied capability description remains available in its editor.",
  ...area,
}));

for (const colorScheme of ["light", "dark"] as const)
  test(`phone capability rows retain native content and keyboard selection in ${colorScheme}`, async ({
    page,
  }, info) => {
    const unexpected = await installCapabilityBoundary(page);
    await page.route(`**/core/clients/${clientId}/capabilities`, (route) =>
      json(route, areas),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme });
    await page.goto(`/portfolio/${clientId}/capabilities`);
    const section = page
      .locator("section")
      .filter({ hasText: "Capability areas" });
    const rows = section.getByRole("button");
    await expect(rows).toHaveCount(4);
    const first = rows.first();
    await expect(first.locator(".monogram")).toBeHidden();
    await expect(
      first.getByText(areas[0]!.description, { exact: true }),
    ).toBeHidden();
    await expect(first).toContainText("PE 0604134A");
    await expect(rows.nth(1)).toContainText("Fielded");
    await expect(rows.nth(2)).toContainText("Research");
    await expect(rows.nth(2)).toContainText("No program line mapped");
    await expect(rows.nth(3)).toContainText("Not set");
    await expect(rows.nth(3)).toContainText("PE 0604454N");
    const geometry = await rows.evaluateAll((elements) =>
      elements.map((node) => {
        const bounds = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const title = node.querySelector("strong")!.getBoundingClientRect();
        const badge = node.querySelector(".chip")!.getBoundingClientRect();
        const mapping = node.querySelector("small")!.getBoundingClientRect();
        return {
          height: bounds.height,
          padding: [
            style.paddingTop,
            style.paddingRight,
            style.paddingBottom,
            style.paddingLeft,
          ],
          radius: style.borderRadius,
          titleY: title.y,
          badgeY: badge.y,
          mappingY: mapping.y,
          titleBottom: title.bottom,
          width: bounds.width,
        };
      }),
    );
    for (const row of geometry) {
      expect(row.height).toBeLessThan(85);
      expect(row.padding).toEqual(["12px", "16px", "12px", "16px"]);
      expect(row.radius).toBe("0px");
      expect(Math.abs(row.titleY - row.badgeY)).toBeLessThan(2);
      expect(row.mappingY - row.titleBottom).toBeGreaterThanOrEqual(6);
      expect(row.width).toBeGreaterThan(350);
    }
    await expect(section.locator("header")).toContainText(
      "Capability areas · 4",
    );
    await page.screenshot({
      path: info.outputPath(`compact-list-${colorScheme}.png`),
      fullPage: true,
    });
    await first.focus();
    await page.keyboard.press("Enter");
    const editor = page.getByRole("dialog", {
      name: `Capability: ${areas[0]!.name}`,
      exact: true,
    });
    await expect(editor).toBeVisible();
    await expect(editor.getByLabel("Description", { exact: true })).toHaveValue(
      areas[0]!.description,
    );
    await page.keyboard.press("Escape");
    await expect(editor).toHaveCount(0);
    await expect(first).toBeFocused();
    expect(unexpected).toEqual([]);
  });

test("compact rows wrap long supplied content and desktop retains descriptive cards", async ({
  page,
}, info) => {
  const unexpected = await installCapabilityBoundary(page);
  const long = {
    ...areas[0]!,
    name: "Long supplied capability name ".repeat(5),
    peNumbers: ["0604134A", "0603461A", "0604454N", "0605603A"],
  };
  await page.route(`**/core/clients/${clientId}/capabilities`, (route) =>
    json(route, [long]),
  );
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(`/portfolio/${clientId}/capabilities`);
  const card = page
    .locator("section")
    .filter({ hasText: "Capability areas" })
    .getByRole("button");
  await expect(card).toContainText(long.name.trim());
  expect(
    await card.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await info.attach("phone-overflow-elements", {
    contentType: "application/json",
    body: JSON.stringify(
      await page.evaluate(() => ({
        viewport: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        elements: [...document.querySelectorAll("body *")].flatMap((node) => {
          const bounds = node.getBoundingClientRect();
          return bounds.width && bounds.right > innerWidth + 1
            ? [
                {
                  tag: node.tagName,
                  className: node.className,
                  right: bounds.right,
                  width: bounds.width,
                },
              ]
            : [];
        }),
      })),
      null,
      2,
    ),
  });
  const phoneCard = await card.boundingBox();
  expect(phoneCard!.x).toBeGreaterThanOrEqual(0);
  expect(phoneCard!.x + phoneCard!.width).toBeLessThanOrEqual(320);
  await page.screenshot({
    path: info.outputPath("compact-long-320.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1040 });
  await expect(card.locator(".monogram")).toBeVisible();
  await expect(card.getByText(long.description, { exact: true })).toBeVisible();
  expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(168);
  await page.screenshot({
    path: info.outputPath("desktop-retained-card.png"),
    fullPage: true,
  });
  expect(unexpected).toEqual([]);
});

test("registration summary uses aligned divided rows and the Figma dialog width", async ({
  page,
}, info) => {
  const unexpected = await installRegistrationBoundary(page);
  const dialog = await openRegistrations(page);
  await expect(dialog.locator("dd").first()).toHaveText(registrationClient.uei);
  expect((await dialog.boundingBox())!.width).toBe(680);
  const rows = await dialog.locator("dl > div").evaluateAll((elements) =>
    elements.map((row) => {
      const style = getComputedStyle(row);
      const label = row.querySelector("dt")!.getBoundingClientRect();
      const value = row.querySelector("dd")!.getBoundingClientRect();
      return {
        padding: [style.paddingTop, style.paddingBottom],
        divider: style.borderBottomWidth,
        labelWidth: label.width,
        valueX: value.x,
        gap: value.x - label.right,
      };
    }),
  );
  expect(rows).toHaveLength(8);
  for (const row of rows) {
    expect(row.padding).toEqual(["10px", "10px"]);
    expect(row.divider).toBe("1px");
    expect(row.labelWidth).toBe(170);
    expect(row.gap).toBe(16);
    expect(row.valueX).toBe(rows[0]!.valueX);
  }
  await page.screenshot({
    path: info.outputPath("registrations-divided-desktop.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Registrations & codes", exact: true }),
  ).toBeFocused();
  expect(unexpected).toEqual([]);
});

test("the complete capability page fits the 320px viewport including its shared header", async ({
  page,
}, info) => {
  const unexpected = await installCapabilityBoundary(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(`/portfolio/${clientId}/capabilities`);
  await expect(
    page.getByRole("heading", { name: "Capabilities", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("whole-capability-page-320.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const header = page.getByRole("banner");
  const controls = [
    header.getByRole("button", { name: "Toggle navigation", exact: true }),
    header.getByRole("link", { name: "Capiro Home", exact: true }),
    header.getByRole("link", { name: "Meri", exact: true }),
    header.getByRole("link", { name: "Portfolio", exact: true }),
    header.getByRole("link", { name: "Modules", exact: true }),
    header.getByRole("link", { name: "Quick log", exact: true }),
    header.getByRole("link", { name: "Master calendar", exact: true }),
    header.getByRole("link", { name: "Search Portfolio", exact: true }),
    header.getByRole("button", { name: "Test account", exact: true }),
  ];
  await controls[0]!.focus();
  for (const [index, control] of controls.entries()) {
    if (index) await page.keyboard.press("Tab");
    await expect(control).toBeVisible();
    await expect(control).toBeFocused();
    const bounds = await control.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  }
  await expect(
    header.getByRole("button", { name: "Updates unavailable", exact: true }),
  ).toBeVisible();
  await expect(
    header.getByRole("button", { name: "Updates unavailable", exact: true }),
  ).toBeDisabled();
  expect(unexpected).toEqual([]);
});

test("registration rows wrap long values and preserve missing-value and EIN review states on phone", async ({
  page,
}, info) => {
  const unexpected = await installRegistrationBoundary(page);
  await page.route(`**/core/clients/${clientId}`, (route) =>
    json(route, {
      ...registrationClient,
      cageCode: null,
      applicantTypes: [
        "A long supplied organization category requiring wrapping",
      ],
      setAsideCertifications: ["EXISTING_UNKNOWN_CODE_".repeat(6)],
      intakeData: { ...registrationClient.intakeData, ein: "12-34" },
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  const dialog = await openRegistrations(page);
  await expect(
    dialog.locator("dl > div").filter({ hasText: "CAGE" }).locator("dd"),
  ).toHaveText("Not supplied");
  await expect(dialog.getByRole("status")).toContainText("EIN needs review");
  expect(
    await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await dialog.getByRole("status").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath("registrations-long-dark-phone.png"),
    fullPage: true,
  });
  await dialog
    .getByRole("button", { name: "Edit registrations", exact: true })
    .click();
  await expect(dialog.getByLabel("UEI", { exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog.locator("dd").first()).toHaveText(registrationClient.uei);
  expect(unexpected).toEqual([]);
});
