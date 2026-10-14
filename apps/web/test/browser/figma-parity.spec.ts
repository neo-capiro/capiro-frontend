import { test, expect } from "@playwright/test";
import { operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { installFixtures, clientId, json } from "../../tests/browser/fixtures";
const views = [
  {
    name: "portfolio",
    path: "/portfolio",
    heading: /^Portfolio/,
    nav: "Workspace",
  },
  {
    name: "modules",
    path: "/modules",
    heading: /^Everything in Capiro/,
    nav: "Product modes",
  },
  {
    name: "meri",
    path: `/meri?clientId=${clientId}`,
    heading: "Meri",
    nav: "Product modes",
  },
  {
    name: "meri-fixture",
    path: "/meri/fixture/home",
    heading: "Good morning, Jordan.",
    nav: "Product modes",
  },
];
for (const width of [1440, 390])
  for (const view of views)
    test(`${view.name} ${width} approved comparison and existing interaction`, async ({
      page,
    }, info) => {
      const errors: string[] = [];
      const writes: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (
          new URL(request.url()).pathname.startsWith("/api/") &&
          request.method() !== "GET"
        )
          writes.push(request.method());
      });
      await installFixtures(page);
      await operationFixtures(page, moduleRouteFixtures);
      await page.route("**/api/backend/core/me", (route) =>
        json(route, testIdentity),
      );
      await page.setViewportSize({
        width,
        height: width === 1440 ? 1040 : 844,
      });
      await page.goto(view.path);
      await expect(
        page.getByRole("heading", { name: view.heading, exact: true }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      if (width === 390) {
        await expect(page.locator("header").first()).toHaveCSS(
          "height",
          "108px",
        );
        const modes = page.getByRole("navigation", {
          name: view.nav,
          exact: true,
        });
        if (view.name !== "meri-fixture") {
          await expect(
            modes.getByRole("link", { name: "Meri", exact: true }),
          ).toBeVisible();
          await expect(
            modes.getByRole("link", { name: "Portfolio", exact: true }),
          ).toBeVisible();
          await expect(
            modes.getByRole("link", { name: "Modules", exact: true }),
          ).toBeVisible();
        }
        if (view.name === "portfolio") {
          const attention = await page
            .getByRole("complementary", { name: "Needs attention" })
            .boundingBox();
          const profiles = await page
            .getByRole("region", { name: "Portfolio profiles" })
            .boundingBox();
          expect(attention!.y).toBeLessThan(profiles!.y);
          const pulse = await page
            .getByRole("region", { name: "Portfolio pulse" })
            .boundingBox();
          expect(pulse!.height).toBeLessThanOrEqual(120);
          await page
            .getByRole("button", { name: "Toggle navigation", exact: true })
            .click();
          await expect(
            page.getByRole("complementary", { name: "Portfolio navigation" }),
          ).toBeVisible();
          await page
            .getByRole("button", { name: "Toggle navigation", exact: true })
            .click();
        }
        if (view.name === "modules") {
          const toggle = page.getByRole("button", {
            name: "Modules menu",
            exact: true,
          });
          await toggle.click();
          const link = page
            .getByRole("navigation", { name: "Modules", exact: true })
            .getByRole("link", { name: "Planner", exact: true });
          await link.focus();
          await page.keyboard.press("Escape");
          await expect(toggle).toBeFocused();
          await expect(toggle).toHaveAttribute("aria-expanded", "false");
          await expect(link).not.toBeVisible();
        }
      }
      await page.screenshot({
        path: info.outputPath(`${view.name}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      const geometry = await page.evaluate(() => ({
        viewport: { width: innerWidth, height: innerHeight },
        overflow: document.documentElement.scrollWidth > innerWidth,
        header: document
          .querySelector("header")
          ?.getBoundingClientRect()
          .toJSON(),
        headings: Array.from(document.querySelectorAll("h1,h2")).map((el) => ({
          text: el.textContent,
          rect: el.getBoundingClientRect().toJSON(),
        })),
        assets: Array.from(document.images).map((el) => ({
          src: el.getAttribute("src"),
          naturalWidth: el.naturalWidth,
          naturalHeight: el.naturalHeight,
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
        })),
      }));
      await info.attach("geometry.json", {
        body: JSON.stringify(geometry, null, 2),
        contentType: "application/json",
      });
      expect(geometry.overflow).toBe(false);
      for (const asset of geometry.assets)
        expect(asset.naturalWidth).toBeGreaterThan(0);
      if (view.name === "meri") {
        await expect(
          page.getByRole("heading", {
            name: "Conversations unavailable",
            exact: true,
          }),
        ).toBeVisible();
        await expect(page.locator("body")).not.toContainText("Jordan");
        await expect(page.locator("body")).not.toContainText("Anduril");
        await expect(
          page.getByLabel("Message draft", { exact: true }),
        ).toHaveCount(0);
      }
      if (view.name === "modules") {
        const scope = page.getByLabel("Client profile scope", { exact: true });
        await scope.focus();
        await expect(scope).toBeFocused();
      }
      if (view.name !== "meri-fixture") {
        const nav = page.getByRole("navigation", {
          name: view.nav,
          exact: true,
        });
        const target = nav.getByRole("link", {
          name: view.name === "meri" ? "Modules" : "Meri",
          exact: true,
        });
        await expect(target).toBeVisible();
        await target.focus();
        await expect(target).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/meri|\/modules/);
      }
      expect(errors).toEqual([]);
      expect(writes).toEqual([]);
    });
