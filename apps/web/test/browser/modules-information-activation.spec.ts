import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { operationFixtures, testIdentity } from "./fixtures";
import { observeHomeIsolation, tabTo } from "../accessibility-interaction";
import { expectAccessibleHome } from "../accessibility";

const explanation =
  "Every client and every activity, across the whole firm. Choose a client profile to show just that client’s work.";

async function openHub(page: Page, info: TestInfo) {
  const isolation = await observeHomeIsolation(page, info);
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname.startsWith("/api/") &&
      !["GET", "HEAD"].includes(request.method())
    )
      mutations.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  page.on("close", () => {
    isolation();
    expect(mutations).toEqual([]);
  });
  await operationFixtures(page, {
    "me.read": testIdentity,
    "clients.list": [],
  });
  await page.goto("/modules");
  await expect(
    page.getByLabel("Client profile scope", { exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  return page.getByRole("button", { name: "About Modules", exact: true });
}

async function expectExplanation(page: Page, info: TestInfo) {
  const help = page.getByRole("button", { name: "About Modules", exact: true });
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCount(1);
  await expect(tooltip).toHaveText(explanation);
  await expect(help).toHaveAccessibleDescription(explanation);
  await expect(help).toHaveAttribute(
    "aria-describedby",
    (await tooltip.getAttribute("id"))!,
  );
  await expect(page.getByRole("main").getByRole("tooltip")).toHaveCount(1);
  const bounds = (await tooltip.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await info.attach("activated-explanation", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
}

for (const width of [390, 320]) {
  test.describe(`touch ${width}px`, () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      viewport: { width, height: 844 },
    });
    test("real tap and repeat reveal the explanation; outside tap dismisses", async ({
      page,
    }, info) => {
      const help = await openHub(page, info);
      await page.evaluate(() => {
        (window as unknown as { observedPointers: string[] }).observedPointers =
          [];
        document.addEventListener("pointerdown", (event) => {
          (
            window as unknown as { observedPointers: string[] }
          ).observedPointers.push(`${event.pointerType}:${event.isTrusted}`);
        });
      });
      await help.tap();
      await expectExplanation(page, info);
      await help.tap();
      await expectExplanation(page, info);
      await expectAccessibleHome(page, info);
      const pointers = await page.evaluate(
        () =>
          (window as unknown as { observedPointers: string[] })
            .observedPointers,
      );
      expect(pointers).toEqual(["touch:true", "touch:true"]);
      await info.attach("trusted-pointer-input", {
        body: JSON.stringify(pointers),
        contentType: "application/json",
      });
      await page
        .getByRole("main")
        .locator("header")
        .getByText("Modules", { exact: true })
        .tap();
      await expect(page.getByRole("tooltip")).toBeHidden();
    });
  });
}

test.describe("desktop activation", () => {
  test.use({ hasTouch: false, viewport: { width: 1440, height: 1040 } });
  test("mouse click reveals the explanation; repeat click and outside dismissal work", async ({
    page,
  }, info) => {
    const help = await openHub(page, info);
    await help.click();
    await expectExplanation(page, info);
    await help.click();
    await expectExplanation(page, info);
    await expectAccessibleHome(page, info);
    await page
      .getByRole("heading", {
        name: "Everything in Capiro, across the whole firm",
        exact: true,
      })
      .click();
    await expect(page.getByRole("tooltip")).toBeHidden();
  });

  test("Enter and Space retain the full explanation with Escape and blur dismissal", async ({
    page,
  }, info) => {
    const help = await openHub(page, info);
    await tabTo(page, help);
    await expectExplanation(page, info);
    await page.keyboard.press("Enter");
    await expectExplanation(page, info);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toBeHidden();
    await expect(help).toBeFocused();
    await page.keyboard.press("Space");
    await expectExplanation(page, info);
    await page.keyboard.press("Tab");
    await expect(
      page.getByLabel("Client profile scope", { exact: true }),
    ).toBeFocused();
    await expect(page.getByRole("tooltip")).toBeHidden();
  });

  test("native hover remains available and scroll dismisses after activation", async ({
    page,
  }, info) => {
    const help = await openHub(page, info);
    await help.hover();
    await expectExplanation(page, info);
    await page.mouse.move(1, 1);
    await page.mouse.move(2, 2);
    await expect(page.getByRole("tooltip")).toBeHidden();
    await help.hover();
    await expectExplanation(page, info);
    await help.click();
    await expectExplanation(page, info);
    await page.mouse.wheel(0, 300);
    await expect(page.getByRole("tooltip")).toBeHidden();
  });
});
