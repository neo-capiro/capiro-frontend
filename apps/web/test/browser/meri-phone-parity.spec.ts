import { test, expect } from "@playwright/test";
import { tabTo, expectFocusEvidence } from "../accessibility-interaction";
import { onlyLocalRequests, testIdentity } from "./fixtures";
import { installFixtures, clientId, json } from "../../tests/browser/fixtures";

for (const width of [1440, 390, 320])
  for (const colorScheme of ["light", "dark"] as const)
    test(`explicit Meri fixture ${width} ${colorScheme} exact phone comparison`, async ({
      page,
    }, info) => {
      await onlyLocalRequests(page);
      await installFixtures(page);
      const errors: string[] = [],
        writes: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (
          new URL(request.url()).pathname.startsWith("/api/") &&
          request.method() !== "GET"
        )
          writes.push(request.method());
      });
      await page.setViewportSize({
        width,
        height: width === 1440 ? 1040 : 844,
      });
      await page.emulateMedia({ colorScheme });
      await page.goto("/meri/fixture/home");
      await expect(
        page.getByLabel("Message draft", { exact: true }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => {
        const rect = (element: Element | null) =>
          element?.getBoundingClientRect().toJSON();
        const group = document.querySelector(
          '[aria-label="Draft suggestions"]',
        );
        return {
          viewport: { width: innerWidth, height: innerHeight },
          overflow: document.documentElement.scrollWidth > innerWidth,
          header: rect(document.querySelector("header")),
          navigation: rect(
            document.querySelector('[aria-label="Meri sections"]'),
          ),
          scope: rect(
            document.querySelector(
              'button[title="Synthetic Anduril fixture; no client authorization"]',
            ),
          ),
          heading: rect(document.querySelector("h1")),
          textarea: rect(document.querySelector("textarea")),
          composer: rect(
            document.querySelector('[aria-label="Local draft composer"]'),
          ),
          suggestions: rect(group),
          cards: Array.from(group?.querySelectorAll("section") ?? []).map(rect),
        };
      });
      await info.attach("geometry.json", {
        body: JSON.stringify(geometry, null, 2),
        contentType: "application/json",
      });
      await page.screenshot({
        path: info.outputPath(`meri-fixture-${width}-${colorScheme}.png`),
        fullPage: true,
        animations: "disabled",
      });
      expect(geometry.overflow).toBe(false);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name:
            width <= 680
              ? "What would you like to work on?"
              : "Good morning, Jordan.",
          exact: true,
        }),
      ).toBeVisible();
      if (width === 390) {
        expect(geometry.header!.height).toBe(108);
        expect(geometry.heading!.x).toBe(16);
        expect(geometry.heading!.width).toBe(358);
        const offset = geometry.navigation!.height;
        expect(Math.abs(geometry.heading!.y - offset - 216)).toBeLessThan(2);
        expect(Math.abs(geometry.composer!.y - offset - 307)).toBeLessThan(2);
        expect(Math.abs(geometry.cards[0]!.y - offset - 477)).toBeLessThan(2);
        expect(geometry.textarea!.height).toBe(45);
        expect(geometry.cards[0]!.width).toBe(172);
        expect(geometry.cards[1]!.x).toBe(202);
        expect(Math.abs(geometry.cards[0]!.height - 161)).toBeLessThan(3);
      }
      if (width <= 680) {
        const group = page.getByRole("group", {
          name: "Draft suggestions",
          exact: true,
        });
        expect(geometry.cards[1]!.right).toBeLessThanOrEqual(width - 16);
        await expect(
          group.getByRole("button", { name: /^Start .+ draft$/ }),
        ).toHaveCount(3);
        for (const [name, value] of [
          ["Start research draft", "Help me research a question about "],
          ["Start create a brief draft", "Help me create a brief about "],
          ["Start analyze a file draft", "Help me analyze a file. "],
          ["Build a spreadsheet", "Help me plan a spreadsheet for "],
          ["Create a presentation", "Help me plan a presentation about "],
          ["Use a template", "Help me choose a template for "],
        ]) {
          const action = page.getByRole("button", { name: name!, exact: true });
          await tabTo(page, action);
          await expectFocusEvidence(action, info);
          await expect
            .poll(async () => {
              const bounds = await action.boundingBox();
              return bounds!.x >= 16 && bounds!.x + bounds!.width <= width - 16;
            })
            .toBe(true);
          await page.keyboard.press("Enter");
          await expect(
            page.getByLabel("Message draft", { exact: true }),
          ).toHaveValue(value!);
          await expect(
            page.getByLabel("Message draft", { exact: true }),
          ).toBeFocused();
        }
      }
      await expect(
        page.getByText("Disconnected synthetic fixture.", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: "Send unavailable: disconnected fixture",
          exact: true,
        }),
      ).toBeDisabled();
      expect(errors).toEqual([]);
      expect(writes).toEqual([]);
    });

for (const colorScheme of ["light", "dark"] as const)
  test(`ordinary Meri 390 ${colorScheme} retains real data boundaries`, async ({
    page,
  }, info) => {
    await onlyLocalRequests(page);
    const unexpected = await installFixtures(page);
    await page.route("**/api/backend/core/me", (route) =>
      json(route, testIdentity),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme });
    await page.goto(`/meri?clientId=${clientId}`);
    await expect(
      page.getByRole("heading", {
        name: "Conversations unavailable",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Message draft", { exact: true })).toHaveCount(
      0,
    );
    for (const sample of ["Jordan", "Anduril", "Your authorized data"])
      await expect(page.locator("body")).not.toContainText(sample);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.screenshot({
      path: info.outputPath(`meri-ordinary-390-${colorScheme}.png`),
      fullPage: true,
      animations: "disabled",
    });
    expect(unexpected).toEqual([]);
  });
