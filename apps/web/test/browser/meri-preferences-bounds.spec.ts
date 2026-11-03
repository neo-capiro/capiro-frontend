import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { settingsFixtures } from "./settings-fixtures";
import { currentPreferencesFixture as captured } from "../../tests/meri-user-preferences-fixtures";

// Personal defaults must keep its two content columns from overlapping when the Settings
// rail and page padding leave less width than the viewport suggests, and the form must
// shrink its own controls instead of widening past its column.
const clients = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    name: "Synthetic Anchor Client",
    status: "active",
    profileStatus: "active",
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    name: "Synthetic Turnbull & Associates",
    status: "active",
    profileStatus: "active",
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    name: "Synthetic Regional Defense Alliance",
    status: "active",
    profileStatus: "active",
  },
];

async function open(page: Page, width: number, colorScheme: "light" | "dark") {
  await page.setViewportSize({ width, height: 854 });
  await page.emulateMedia({ colorScheme });
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    ...settingsFixtures,
    "me.read": {
      ...testIdentity,
      user: { ...testIdentity.user, id: captured.read.owner.actorId },
      tenant: { ...testIdentity.tenant, id: captured.read.owner.tenantId },
    },
    "clients.list": clients,
  });
  await page.route("**/api/settings/user/*", (route) =>
    route.fulfill({
      json: {
        ...captured.read,
        preferences: {
          ...captured.read.preferences,
          defaultClientId: clients[0]!.id,
        },
      },
    }),
  );
  await page.addInitScript(() =>
    sessionStorage.setItem("user-preferences-enabled", "true"),
  );
  await page.goto("/settings/preferences");
  await page.getByRole("button", { name: "Load current preferences" }).click();
  await expect(
    page.getByRole("heading", { name: "Personal settings", level: 2 }),
  ).toBeVisible();
  await page.mouse.move(2, 2);
}

const cases = [
  { width: 375, colorScheme: "light" as const, columns: 1 },
  { width: 600, colorScheme: "light" as const, columns: 1 },
  { width: 727, colorScheme: "light" as const, columns: 1 },
  { width: 727, colorScheme: "dark" as const, columns: 1 },
  { width: 900, colorScheme: "light" as const, columns: 2 },
  { width: 1280, colorScheme: "light" as const, columns: 2 },
  { width: 1280, colorScheme: "dark" as const, columns: 2 },
];

for (const { width, colorScheme, columns } of cases)
  test(`Personal defaults keep bounds at ${width}px, ${colorScheme}, ${columns} column(s)`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await mkdir("test-results/preferences-bounds", { recursive: true });
    await open(page, width, colorScheme);
    await page.screenshot({
      path: `test-results/preferences-bounds/${width}-${colorScheme}.png`,
      fullPage: true,
    });
    const bounds = await page.evaluate(() => {
      const rect = (el: Element) => el.getBoundingClientRect();
      const prefs = document.querySelector(
        'section[aria-label="Personal Meri preferences"]',
      ) as HTMLElement;
      const form = prefs.querySelector("form") as HTMLFormElement;
      const panel = rect(form);
      const style = getComputedStyle(form);
      const left = panel.left + parseFloat(style.paddingLeft);
      const right = panel.right - parseFloat(style.paddingRight);
      const support = Array.from(document.querySelectorAll("section")).find(
        (el) =>
          el !== prefs &&
          (el.textContent ?? "").includes("Accessibility and other defaults"),
      ) as HTMLElement;
      const controls = Array.from(
        form.querySelectorAll("select, input, button"),
      ).map((el) => {
        const r = rect(el);
        return {
          left: +r.left.toFixed(1),
          right: +r.right.toFixed(1),
          width: +r.width.toFixed(1),
          rendered: r.width > 2 && r.height > 2,
        };
      });
      const content = Array.from(
        form.querySelectorAll(
          "h2, legend, p, label, fieldset, select, input, button",
        ),
      ).map((el) => {
        const r = rect(el);
        return { tag: el.tagName.toLowerCase(), right: +r.right.toFixed(1) };
      });
      const supportRect = support ? rect(support) : null;
      const overlap = supportRect
        ? content.filter(
            (el) =>
              el.right > supportRect.left + 0.5 &&
              supportRect.left > panel.left,
          )
        : [];
      return {
        viewportWidth: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        panel: {
          left: +panel.left.toFixed(1),
          right: +panel.right.toFixed(1),
        },
        contentRight: +right.toFixed(1),
        supportLeft: supportRect ? +supportRect.left.toFixed(1) : null,
        supportTop: supportRect ? +supportRect.top.toFixed(1) : null,
        panelBottom: +panel.bottom.toFixed(1),
        controls,
        overflowing: content.filter((el) => el.right > right + 0.5),
        overlap,
      };
    });
    expect(bounds.documentWidth).toBeLessThanOrEqual(bounds.viewportWidth);
    expect(bounds.overflowing).toEqual([]);
    expect(bounds.overlap).toEqual([]);
    // Rendered controls stay inside the panel and keep a usable width; the model picker's
    // visually hidden 1px search input is not a layout control.
    const rendered = bounds.controls.filter((control) => control.rendered);
    expect(rendered.length).toBeGreaterThan(0);
    expect(
      rendered.every(
        (control) =>
          control.width >= 120 &&
          control.left >= bounds.panel.left &&
          control.right <= bounds.contentRight + 0.5,
      ),
    ).toBe(true);
    if (columns === 1) {
      // Stacked: the supporting card sits below the form, not beside it.
      expect(bounds.supportTop ?? 0).toBeGreaterThan(bounds.panelBottom);
    } else {
      // Two columns: the supporting card starts after the form ends.
      expect(bounds.supportLeft ?? 0).toBeGreaterThan(bounds.panel.right);
    }
  });
