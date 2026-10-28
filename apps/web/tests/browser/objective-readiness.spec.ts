import { test, expect, type Page, type Locator } from "@playwright/test";
import { clientId, installFixtures, json, objective } from "./fixtures";

const newPath = `/portfolio/${clientId}/objectives?new=1`;
async function complete(editor: Locator) {
  await editor.getByLabel(/^Outcome/).fill("A reviewed outcome");
  await editor
    .getByLabel(/^Government problem/)
    .fill("A reviewed government problem");
  await editor
    .getByRole("radio", { name: "Not sure, let Meri propose", exact: true })
    .check();
  await editor.getByLabel(/^Minimum win/).fill("An agreed minimum win");
}
async function event(page: Page, name: string) {
  await page.evaluate(
    (eventName) => window.dispatchEvent(new Event(eventName)),
    name,
  );
}

test("readiness shows exactly the four required fields and follows edits without creating records", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  const writes: string[] = [];
  await page.route(`**/clients/${clientId}/objectives**`, (route) => {
    if (route.request().method() !== "GET")
      writes.push(route.request().method());
    return json(route, []);
  });
  await page.goto(newPath);
  const editor = page.getByRole("region", {
    name: "New objective",
    exact: true,
  });
  const readiness = editor.getByRole("region", { name: "Readiness" });
  await expect(readiness.getByRole("listitem")).toHaveCount(4);
  await expect(readiness.getByText("Needed", { exact: true })).toHaveCount(4);
  await editor.getByLabel(/^Limits/).fill("Keep the optional constraint");
  await editor.getByLabel(/^Outcome/).fill("   ");
  await expect(readiness.getByText("Needed", { exact: true })).toHaveCount(4);
  await complete(editor);
  await expect(readiness.getByText("Done", { exact: true })).toHaveCount(4);
  await expect(readiness.getByRole("status")).toContainText("4 of 4");
  const bounds = await readiness.boundingBox();
  expect(bounds?.width).toBe(360);
  expect(Math.abs((bounds?.height ?? 0) - 188)).toBeLessThan(1);
  await readiness.screenshot({
    path: "work/objective-readiness-desktop-light.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(readiness).toBeVisible();
  await expect(editor.getByLabel(/^Limits/)).toHaveValue(
    "Keep the optional constraint",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await readiness.screenshot({
    path: "work/objective-readiness-mobile-dark.png",
  });
  await editor.getByLabel(/^Minimum win/).fill("");
  await expect(readiness.getByText("Done", { exact: true })).toHaveCount(3);
  await expect(readiness.getByText("Needed", { exact: true })).toHaveCount(1);
  await expect(readiness.getByRole("status")).toContainText("3 of 4");
  expect(writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("a pending save locks the exact draft and retains it after a failed transition", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const calls: string[] = [];
  let saved = objective;
  await page.route(`**/clients/${clientId}/objectives**`, async (route) => {
    if (route.request().method() === "GET") return json(route, []);
    calls.push(route.request().url());
    if (route.request().url().includes("/transition"))
      return json(
        route,
        { message: "Review request could not be confirmed" },
        503,
      );
    saved = { ...objective, ...route.request().postDataJSON() };
    await held;
    return json(route, saved);
  });
  await page.goto(newPath);
  const editor = page.getByRole("region", {
    name: "New objective",
    exact: true,
  });
  await complete(editor);
  await editor.getByRole("button", { name: "Request review" }).click();
  await expect(editor.getByLabel(/^Outcome/)).toBeDisabled();
  await expect(
    editor.getByRole("radio", { name: "Funding", exact: true }),
  ).toBeDisabled();
  await expect(
    editor.getByRole("button", { name: "Save draft" }).last(),
  ).toBeDisabled();
  await expect(
    editor.getByRole("button", { name: "Save draft" }).first(),
  ).toBeDisabled();
  await expect(
    editor.getByRole("button", { name: "← Objectives", exact: true }),
  ).toBeDisabled();
  expect(calls).toHaveLength(1);
  release();
  await expect(editor.getByRole("alert")).toContainText(
    "Review request could not be confirmed",
  );
  await expect(editor.getByLabel(/^Outcome/)).toHaveValue("A reviewed outcome");
  await expect(editor.getByLabel(/^Outcome/)).toBeEnabled();
  await expect(editor).toBeVisible();
  expect(calls).toHaveLength(2);
  expect(calls[1]).toContain(`/transition?objectiveId=${objective.id}`);
  expect(unexpected).toEqual([]);
});

for (const change of ["actor-change", "role-change", "invalidate", "unmount"])
  test(`late save does not transition after ${change}`, async ({ page }) => {
    const unexpected = await installFixtures(page);
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls: string[] = [];
    await page.route(`**/clients/${clientId}/objectives**`, async (route) => {
      if (route.request().method() === "GET") return json(route, []);
      calls.push(route.request().url());
      await held;
      return json(route, { ...objective, ...route.request().postDataJSON() });
    });
    await page.goto("/__test/objective-session?new=1");
    const editor = page.getByRole("region", {
      name: "New objective",
      exact: true,
    });
    await complete(editor);
    await editor.getByRole("button", { name: "Request review" }).click();
    await expect.poll(() => calls.length).toBe(1);
    await event(page, `objective-session-${change}`);
    release();
    if (change === "unmount") {
      await expect(page.getByText("Objective editor unmounted")).toBeVisible();
      await expect(editor).not.toBeVisible();
    } else {
      await expect(
        editor.getByText("Saving objective…", { exact: true }),
      ).not.toBeVisible();
      await expect(editor.getByRole("alert")).toBeVisible();
      await expect(editor).toBeVisible();
    }
    expect(calls).toHaveLength(1);
    expect(unexpected).toEqual([]);
  });

test("an objective status filter has a recoverable empty state", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.goto(`/portfolio/${clientId}/objectives`);
  await page
    .getByRole("group", { name: "Filter objectives" })
    .getByRole("button", { name: "Ready", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No objectives match this status" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open objective", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Clear status filter" }).click();
  await expect(
    page.getByRole("button", { name: "Open objective", exact: true }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});
