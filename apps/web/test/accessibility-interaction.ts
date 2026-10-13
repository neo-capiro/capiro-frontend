import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

/** Test-only observation; never provides data or session/approval authority. */
export async function observeHomeIsolation(page: Page, testInfo: TestInfo) {
  const baseURL = testInfo.project.use.baseURL;
  if (!baseURL) throw new Error("A leased local baseURL is required");
  const origin = new URL(baseURL).origin;
  const foreign: string[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => {
    const requested = route.request().url();
    if (new URL(requested).origin !== origin) {
      foreign.push(requested);
      return route.abort("blockedbyclient");
    }
    return route.fallback();
  });
  return () => {
    expect(foreign).toEqual([]);
    expect(errors).toEqual([]);
  };
}

/** Reach the actual sequential focus order, without forced focus or sleeps. */
export async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  for (let step = 0; step < 64; step += 1) {
    await page.keyboard.press("Tab");
    // Finish focus-induced scrolling before advancing to another control.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    if (await target.evaluate((element) => element === document.activeElement))
      return;
  }
  await expect(target).toBeFocused();
}

export async function expectFocusEvidence(target: Locator, testInfo: TestInfo) {
  await expect(target).toBeFocused();
  const focus = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      focusVisible: element.matches(":focus-visible"),
      outlineStyle: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth),
      outlineColor: style.outlineColor,
      inViewport:
        rect.top >= 0 &&
        rect.bottom <= innerHeight &&
        rect.left >= 0 &&
        rect.right <= innerWidth,
    };
  });
  await testInfo.attach("focused-control-style", {
    body: JSON.stringify(focus, null, 2),
    contentType: "application/json",
  });
  expect(focus.focusVisible).toBe(true);
  expect(focus.outlineStyle).not.toBe("none");
  expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(focus.outlineColor).not.toMatch(/transparent|rgba\([^)]*, 0\)$/);
  expect(focus.inViewport).toBe(true);
  await testInfo.attach("focused-control-page", {
    body: await target.page().screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

/** Assert the browser's real hit target before an unforced pointer click. */
export async function pointWithLink(
  page: Page,
  target: Locator,
  expectedLink: string | null,
) {
  await target.scrollIntoViewIfNeeded();
  const rect = await target.boundingBox();
  if (!rect) throw new Error("Visible pointer target has no bounds");
  const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  const hitLink = await page.evaluate(
    ({ x, y }) =>
      document.elementFromPoint(x, y)?.closest("a")?.getAttribute("href") ??
      null,
    point,
  );
  expect(hitLink).toBe(expectedLink);
  return point;
}

export async function clickObservedPoint(
  page: Page,
  target: Locator,
  expectedLink: string | null,
) {
  const point = await pointWithLink(page, target, expectedLink);
  await page.mouse.click(point.x, point.y);
}
