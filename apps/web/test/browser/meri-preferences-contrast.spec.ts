import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { settingsFixtures } from "./settings-fixtures";
import { currentPreferencesFixture as captured } from "../../tests/meri-user-preferences-fixtures";

// B005-04 dark preview contrast: the model picker's helper text ("Configured default: ...")
// paints with the shared muted token while the Personal settings preview panel repaints its
// own foreground/background for dark and system-dark. The light-tuned token left that 12px
// normal text near 3.2:1 on the dark surface. This probe reads rendered computed styles from
// the real component fixture and requires AA normal-text contrast, and requires the light and
// system-light previews to keep the shared token unchanged.
//
// Artifacts (screenshots, probe JSON) use this test's own Playwright output path, so a run is
// only safe with an explicit `--output` lane directory; the repo default output directory is
// shared with other lanes' evidence.

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
  const diagnostics: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.push(String(error)));
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
  return diagnostics;
}

type ContrastProbe = {
  color: string;
  background: string;
  fontSize: string;
  fontWeight: string;
  opacity: number;
  ratio: number;
};

/** Rendered colour/contrast of a text element, composited over its painted ancestors. */
async function probe(page: Page, selector: string): Promise<ContrastProbe> {
  return page.evaluate((target: string) => {
    const el = document.querySelector(target) as HTMLElement | null;
    if (!el) throw new Error(`Missing probe target ${target}`);
    const parse = (value: string) => {
      const parts = value
        .replace(/rgba?\(|\)/g, "")
        .split(/[,\s/]+/)
        .filter(Boolean)
        .map(Number);
      return {
        r: parts[0] ?? 0,
        g: parts[1] ?? 0,
        b: parts[2] ?? 0,
        a: parts.length > 3 ? (parts[3] ?? 1) : 1,
      };
    };
    const style = getComputedStyle(el);
    const color = parse(style.color);
    // Opaque ancestors only: the preview panel paints its own surface.
    const layers: { r: number; g: number; b: number; a: number }[] = [];
    let opacity = Number(style.opacity);
    for (let node: HTMLElement | null = el; node; node = node.parentElement) {
      const current = getComputedStyle(node);
      if (node !== el) opacity *= Number(current.opacity);
      const background = parse(current.backgroundColor);
      if (background.a > 0) {
        layers.push(background);
        if (background.a === 1) break;
      }
    }
    const base = layers[layers.length - 1] ?? { r: 255, g: 255, b: 255, a: 1 };
    let background = { ...base };
    for (let index = layers.length - 2; index >= 0; index -= 1) {
      const top = layers[index]!;
      background = {
        r: top.r * top.a + background.r * (1 - top.a),
        g: top.g * top.a + background.g * (1 - top.a),
        b: top.b * top.a + background.b * (1 - top.a),
        a: 1,
      };
    }
    const composite = {
      r: color.r * color.a + background.r * (1 - color.a),
      g: color.g * color.a + background.g * (1 - color.a),
      b: color.b * color.a + background.b * (1 - color.a),
    };
    const luminance = (input: { r: number; g: number; b: number }) => {
      const channel = (value: number) => {
        const scaled = value / 255;
        return scaled <= 0.03928
          ? scaled / 12.92
          : Math.pow((scaled + 0.055) / 1.055, 2.4);
      };
      return (
        0.2126 * channel(input.r) +
        0.7152 * channel(input.g) +
        0.0722 * channel(input.b)
      );
    };
    const first = luminance(composite);
    const second = luminance(background);
    const ratio =
      (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    const round = (value: number) => Number(value.toFixed(2));
    return {
      color: `rgb(${color.r}, ${color.g}, ${color.b})`,
      background: `rgb(${Math.round(background.r)}, ${Math.round(background.g)}, ${Math.round(background.b)})`,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      opacity: round(opacity),
      ratio: round(ratio),
    };
  }, selector);
}

const helper = 'form span[id$="-help"]';
const timezoneHelp = "#preferences-timezone-help";
// Light preview keeps the global token (globals.css --muted-foreground: #756e69).
const lightMuted = "rgb(117, 110, 105)";
const darkReadable = "rgb(168, 162, 158)";

const cases = [
  { name: "dark", theme: "dark", colorScheme: "dark" as const, readable: true },
  {
    name: "system-dark",
    theme: "system",
    colorScheme: "dark" as const,
    readable: true,
  },
  {
    name: "light",
    theme: "light",
    colorScheme: "light" as const,
    readable: false,
  },
  {
    name: "system-light",
    theme: "system",
    colorScheme: "light" as const,
    readable: false,
  },
];

for (const { name, theme, colorScheme, readable } of cases)
  test(`Personal settings ${name} preview helper text keeps AA contrast`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const diagnostics = await open(page, 727, colorScheme);
    await page.getByRole("combobox", { name: "Theme" }).selectOption(theme);
    await expect(page.locator(`form[data-theme="${theme}"]`)).toBeVisible();
    await page.mouse.move(2, 2);

    const panel = await probe(page, `form[data-theme="${theme}"]`);
    const measured = await probe(page, helper);
    const body = await probe(page, timezoneHelp);
    const hint = await page.locator(helper).innerText();
    const layout = await page.evaluate(() => {
      const form = document.querySelector(
        "form[data-theme]",
      ) as HTMLFormElement;
      const rect = form.getBoundingClientRect();
      const style = getComputedStyle(form);
      const right = rect.right - parseFloat(style.paddingRight);
      const controls = Array.from(
        form.querySelectorAll("select, input, button"),
      ).map((el) => {
        const box = el.getBoundingClientRect();
        return {
          width: +box.width.toFixed(1),
          inside: box.left >= rect.left && box.right <= right + 0.5,
          rendered: box.width > 2 && box.height > 2,
        };
      });
      return {
        viewport: {
          innerWidth,
          innerHeight,
          devicePixelRatio,
          visualViewport: visualViewport
            ? {
                width: visualViewport.width,
                height: visualViewport.height,
                scale: visualViewport.scale,
              }
            : null,
        },
        documentWidth: document.documentElement.scrollWidth,
        renderedControls: controls.filter((control) => control.rendered),
      };
    });

    const outDir = testInfo.outputPath();
    await mkdir(outDir, { recursive: true });
    await page.screenshot({
      path: path.join(outDir, `preferences-727-${name}.png`),
      fullPage: true,
    });
    await writeFile(
      path.join(outDir, `contrast-727-${name}.json`),
      JSON.stringify(
        {
          case: name,
          theme,
          colorScheme,
          label:
            "727 CSS px at DPR 1, local synthetic fixture; original report did not measure viewport/DPR/zoom",
          hint,
          panel,
          helper: measured,
          timezoneHelp: body,
          layout,
          diagnostics,
        },
        null,
        2,
      ),
    );

    // No console or page errors on the route being measured.
    expect(diagnostics).toEqual([]);
    // Rendered, not inferred: helper text is 12px normal weight, so AA normal text applies.
    expect(measured.opacity).toBe(1);
    expect(measured.fontSize).toBe("12px");
    expect(Number(measured.fontWeight)).toBeLessThan(600);
    expect(measured.ratio).toBeGreaterThanOrEqual(4.5);
    expect(body.ratio).toBeGreaterThanOrEqual(4.5);
    if (readable) {
      expect(panel.background).toBe("rgb(23, 34, 53)");
      expect(measured.color).toBe(darkReadable);
      expect(measured.ratio).toBeGreaterThan(4.5);
    } else {
      expect(panel.background).toBe("rgb(255, 255, 255)");
      expect(measured.color).toBe(lightMuted);
    }
    // The 019 structural fix stays intact at the reported width.
    expect(layout.viewport.devicePixelRatio).toBe(1);
    expect(layout.documentWidth).toBeLessThanOrEqual(
      layout.viewport.innerWidth,
    );
    expect(layout.renderedControls.length).toBeGreaterThan(0);
    expect(layout.renderedControls.every((control) => control.inside)).toBe(
      true,
    );
  });
