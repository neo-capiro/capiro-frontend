import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { expectAccessibleHome } from "../accessibility";
import { observeHomeIsolation } from "../accessibility-interaction";
import {
  actionClient,
  expectFilesIsolation,
  filesFixture,
} from "./meri-files-fixtures";

export type ColorScheme = "light" | "dark";
export const colorSchemes: readonly ColorScheme[] = ["light", "dark"];
export const fixtureScreenPath = (slug: string) => `/meri/fixture/${slug}`;
export const fixtureScreenUrl = (slug: string) =>
  `${fixtureScreenPath(slug)}?clientId=${actionClient.id}`;

/**
 * Open one disconnected Meri fixture screen at the 1440x1040 desktop frame. The
 * returned check runs the full axe audit on the screen as it stands and proves
 * no foreign request, page error, session call or document request occurred.
 */
export async function openFixtureScreen(
  page: Page,
  info: TestInfo,
  slug: string,
  colorScheme: ColorScheme,
) {
  const fixture = await filesFixture(page);
  const assertIsolation = await observeHomeIsolation(page, info);
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.emulateMedia({ colorScheme });
  await page.goto(fixtureScreenUrl(slug));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  return async function auditAndExpectIsolation() {
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await expectAccessibleHome(page, info);
    expect(fixture.requests).toEqual([]);
    expect(fixture.host.calls("session")).toHaveLength(0);
    expectFilesIsolation(fixture);
    assertIsolation();
  };
}

/** Press a key on the focused control and wait for the resulting frame. */
export async function press(page: Page, key: string) {
  await page.keyboard.press(key);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
}

/**
 * A focused disclosure trigger toggles its content with Enter and then Space,
 * exposing the state through aria-expanded and aria-controls.
 */
export async function expectKeyboardDisclosure(
  page: Page,
  trigger: Locator,
  content: Locator,
  initiallyOpen: boolean,
) {
  await expect(trigger).toBeFocused();
  const states = [initiallyOpen, !initiallyOpen, initiallyOpen];
  for (const [step, open] of states.entries()) {
    if (step > 0) await press(page, step === 1 ? "Enter" : " ");
    await expect(trigger).toHaveAttribute("aria-expanded", String(open));
    if (open) {
      await expect(content).toBeVisible();
      const controls = await trigger.getAttribute("aria-controls");
      expect(controls).toBeTruthy();
      await expect(page.locator(`[id="${controls}"]`)).toBeVisible();
    } else await expect(content).toBeHidden();
    await expect(trigger).toBeFocused();
  }
}

/** An explained unavailable control: disabled, named and outside the tab order. */
export async function expectExplainedUnavailable(control: Locator) {
  await expect(control).toBeDisabled();
  await expect(control).toHaveAttribute("title", /\S/);
}
