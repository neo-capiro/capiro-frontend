import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const origin = "http://127.0.0.1:5188";
const output = process.argv[2];
assert.ok(
  output,
  "Output directory must be supplied by the standalone runner.",
);
const results = [];
for (const [path, status, text] of [
  ["/healthz", 200, '"status":"ok"'],
  ["/portfolio", 200, "Portfolio setup required"],
  ["/calendar", 200, "Portfolio setup required"],
  ["/sign-in", 200, "Sign-in setup required"],
  ["/api/backend/core/clients", 503, ""],
  ["/", 200, "Portfolio setup required"],
  ["/modules", 200, "Connection setup required"],
  ["/settings", 307, ""],
  ["/settings?clientId=10000000-0000-4000-8000-000000000001", 307, ""],
  ["/settings/personal", 200, "Connection setup required"],
  ["/api/capiro/me.read", 503, ""],
]) {
  const response = await fetch(origin + path, {
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, status, path);
  if (new URL(origin + path).pathname === "/settings")
    assert.equal(
      response.headers.get("location"),
      `/settings/personal${new URL(origin + path).search}`,
    );
  assert.ok((await response.text()).includes(text), path);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff", path);
  assert.equal(response.headers.get("x-frame-options"), "DENY", path);
  assert.equal(response.headers.get("x-powered-by"), null, path);
  results.push({ path, status, headers: "passed" });
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  timeout: 30_000,
  args: [
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const browserVersion = browser.version();
const pageErrors = [];
try {
  for (const colorScheme of ["light", "dark"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1040 },
      colorScheme,
    });
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(20_000);
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(origin + "/meri");
    await page.waitForFunction(
      () => typeof window.next?.router?.push === "function",
    );
    await page.evaluate(() => {
      window.portfolioRuntimeProbe = "same-document";
    });
    const before = await page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      color: getComputedStyle(document.body).color,
      fontSize: getComputedStyle(document.body).fontSize,
      markerCount: document.querySelectorAll("[data-portfolio-root]").length,
    }));
    assert.equal(before.markerCount, 0);
    for (const viewport of [
      { width: 1440, height: 1040 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      // Exercise the actual shared header's Link, including after a return to
      // the fixture entry. No synthetic route or identity is installed.
      await page.evaluate(() => window.next.router.push("/meri"));
      const portfolioLink = page
        .getByRole("navigation", { name: "Product modes" })
        .getByRole("link", { name: "Portfolio", exact: true });
      assert.equal(await portfolioLink.getAttribute("href"), "/");
      await portfolioLink.click();
      await page
        .getByRole("heading", { name: "Portfolio setup required" })
        .waitFor();
      await page.waitForFunction(() => {
        const logo = document.querySelector('main img[alt="Capiro"]');
        return (
          logo instanceof HTMLImageElement &&
          logo.complete &&
          logo.naturalWidth > 0
        );
      });
      const portfolio = await page.evaluate(() => ({
        background: getComputedStyle(document.body).backgroundColor,
        color: getComputedStyle(document.body).color,
        fontSize: getComputedStyle(document.body).fontSize,
        markerCount: document.querySelectorAll("[data-portfolio-root]").length,
        fits: document.documentElement.scrollWidth <= innerWidth,
        sameDocument: window.portfolioRuntimeProbe === "same-document",
      }));
      const wordmark = await page
        .locator('main img[alt="Capiro"]')
        .evaluate((logo) => ({
          width: logo.getBoundingClientRect().width,
          height: logo.getBoundingClientRect().height,
          filter: getComputedStyle(logo).filter,
        }));
      assert.equal(portfolio.markerCount, 1);
      assert.equal(portfolio.fontSize, "14px");
      assert.equal(
        portfolio.background,
        colorScheme === "dark" ? "rgb(18, 18, 18)" : "rgb(245, 245, 244)",
      );
      assert.ok(portfolio.fits);
      assert.ok(portfolio.sameDocument);
      assert.equal(wordmark.width, 77);
      assert.equal(wordmark.height, 26);
      assert.equal(
        wordmark.filter,
        colorScheme === "dark" ? "invert(1)" : "none",
      );
      await page.screenshot({
        path: join(
          output,
          `production-portfolio-${viewport.width}-${colorScheme}.png`,
        ),
      });
      await page.evaluate(() => window.next.router.push("/meri"));
      await page
        .getByRole("heading", { name: "Good morning, Jordan." })
        .waitFor();
      const returned = await page.evaluate(() => ({
        background: getComputedStyle(document.body).backgroundColor,
        color: getComputedStyle(document.body).color,
        fontSize: getComputedStyle(document.body).fontSize,
        markerCount: document.querySelectorAll("[data-portfolio-root]").length,
      }));
      assert.deepEqual(returned, before);
      assert.equal(
        await page.evaluate(() => window.portfolioRuntimeProbe),
        "same-document",
      );
      results.push({
        colorScheme,
        viewport,
        portfolio,
        wordmark,
        stylesRestoredOnReturn: true,
        clientNavigation: true,
        headerNavigation: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 1040 });
    await page.getByRole("link", { name: "Modules", exact: true }).click();
    await page
      .getByRole("heading", { name: "Connection setup required" })
      .waitFor();
    assert.equal(await page.locator("[data-portfolio-root]").count(), 0);
    await page.getByRole("link", { name: "Account settings" }).click();
    await page.waitForURL("**/settings/personal");
    await page.goBack();
    await page.waitForURL("**/modules");
    await page.goForward();
    await page.waitForURL("**/settings/personal");
    assert.equal(
      await page.evaluate(() => window.portfolioRuntimeProbe),
      "same-document",
    );
    results.push({
      crossMode: "Meri/Portfolio/Modules/Settings",
      history: "back/forward",
      sameDocument: true,
    });
    await page.close();
  }
  assert.deepEqual(pageErrors, []);
} finally {
  await browser.close();
}
const result = {
  scope:
    "Actual Next standalone server without credentials, fixture identity or service interception. Live sign-in not exercised.",
  browserVersion,
  results,
  pageErrors,
};
await writeFile(
  join(output, "production-smoke.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result, null, 2));
