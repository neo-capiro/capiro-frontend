import { test, expect } from "@playwright/test";
import { client, clientId, installFixtures, json, objective } from "./fixtures";

const path = `/portfolio/${clientId}/objectives`;

test("create is a full page with a fixed readiness rail, explicit back navigation and a fresh draft on re-entry", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/backend/") && request.method() !== "GET")
      writes.push(request.url());
  });
  await page.goto(`${path}?new=1&source=brief`);
  const editor = page.getByRole("region", {
    name: "New objective",
    exact: true,
  });
  await expect(page.getByRole("dialog", { name: "New objective" })).toHaveCount(
    0,
  );
  await expect(editor.getByLabel(/^Outcome/)).toBeFocused();
  await expect(editor.getByText(client.name, { exact: true })).toBeVisible();
  await expect(
    editor.getByText("Draft not saved yet", { exact: true }),
  ).toBeVisible();
  const card = editor.getByRole("region", { name: "Objective", exact: true });
  const readiness = editor.getByRole("region", {
    name: "Readiness",
    exact: true,
  });
  const cardBounds = await card.boundingBox();
  const readinessBounds = await readiness.boundingBox();
  const identityBounds = await page
    .getByRole("region", { name: "Client identity" })
    .boundingBox();
  expect(identityBounds).not.toBeNull();
  expect(cardBounds).not.toBeNull();
  expect(readinessBounds).not.toBeNull();
  for (const [actual, expected] of [
    [identityBounds!.x, 264],
    [identityBounds!.y, 145],
    [cardBounds!.x, 264],
    [cardBounds!.y, 326],
    [cardBounds!.width, 760],
    [readinessBounds!.x, 1048],
    [readinessBounds!.y, 326],
  ] as const)
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(6);
  expect(readinessBounds?.width).toBe(360);
  expect(readinessBounds?.y).toBe(cardBounds?.y);
  expect(
    (readinessBounds?.x ?? 0) -
      ((cardBounds?.x ?? 0) + (cardBounds?.width ?? 0)),
  ).toBe(24);
  await page.screenshot({
    path: "../../evidence/playwright/objectives/intake-empty-1440x1040.png",
  });
  await editor.getByLabel(/^Outcome/).fill("An unsaved page draft");
  await page.keyboard.press("Escape");
  await expect(editor).toBeVisible();
  await expect(editor.getByLabel(/^Outcome/)).toHaveValue(
    "An unsaved page draft",
  );
  await editor
    .getByRole("button", { name: "← Objectives", exact: true })
    .click();
  await expect(editor).not.toBeVisible();
  expect(new URL(page.url()).search).toBe("?source=brief");
  await page
    .getByRole("button", { name: "New objective", exact: true })
    .click();
  await expect(editor.getByLabel(/^Outcome/)).toHaveValue("");
  await expect(editor.getByRole("radio", { checked: true })).toHaveCount(0);
  expect(writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("an incomplete draft saves only after an explicit action and returns to the refreshed client list", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let saved: typeof objective | undefined;
  const writes: unknown[] = [];
  await page.route(`**/clients/${clientId}/objectives**`, async (route) => {
    if (route.request().method() === "GET")
      return json(route, saved ? [saved] : []);
    expect(route.request().method()).toBe("POST");
    const body = route.request().postDataJSON();
    writes.push(body);
    expect(body).toMatchObject({
      outcome: "A partial outcome",
      governmentProblem: "",
      askType: null,
      minimumWin: "",
      limits: "",
    });
    saved = {
      ...objective,
      ...body,
      readiness: {
        isReady: false,
        completedFields: 1,
        requiredFields: 4,
        checklist: {
          outcome: true,
          governmentProblem: false,
          askType: false,
          minimumWin: false,
        },
      },
    };
    return json(route, saved);
  });
  await page.goto(`${path}?new=1`);
  const editor = page.getByRole("region", {
    name: "New objective",
    exact: true,
  });
  await editor.getByLabel(/^Outcome/).fill("A partial outcome");
  await editor.getByLabel(/^Government problem/).focus();
  expect(writes).toEqual([]);
  await editor
    .getByRole("button", { name: "Save draft", exact: true })
    .first()
    .click();
  await expect(editor).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "A partial outcome", exact: true }),
  ).toBeVisible();
  const savedObjective = page
    .getByRole("region", { name: "Current objectives" })
    .getByRole("article")
    .filter({
      has: page.getByRole("button", {
        name: "A partial outcome",
        exact: true,
      }),
    });
  await expect(
    savedObjective.locator("p").filter({
      hasText: /^Readiness\s*1\/4 required fields$/,
    }),
  ).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(new URL(page.url()).searchParams.has("new")).toBe(false);
  expect(unexpected).toEqual([]);
});

test("ask chips are native keyboard choices and the phone form stays within the viewport", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.goto(`${path}?new=1`);
  const editor = page.getByRole("region", {
    name: "New objective",
    exact: true,
  });
  const funding = editor.getByRole("radio", { name: "Funding", exact: true });
  await funding.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    editor.getByRole("radio", { name: "Policy or authority", exact: true }),
  ).toBeChecked();
  await expect(editor.getByRole("radio", { checked: true })).toHaveCount(1);
  await editor
    .getByLabel(/^Outcome/)
    .fill("A concrete outcome for this client");
  await editor
    .getByLabel(/^Government problem/)
    .fill("The government problem this outcome addresses");
  await editor
    .getByLabel(/^Minimum win/)
    .fill("The smallest successful result");
  await page.screenshot({
    path: "../../evidence/playwright/objectives/intake-filled-1440x1040.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(
    editor.getByRole("button", { name: "Request review", exact: true }),
  ).toBeVisible();
  await expect(
    editor.getByRole("region", { name: "Readiness", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "work/objective-intake-phone-dark.png",
    fullPage: true,
  });
  expect(unexpected).toEqual([]);
});

test("editing a ready objective retains the drawer, select interaction and exact versioned draft write", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let record = { ...objective, status: "ready", version: 3 };
  let writes = 0;
  await page.route(`**/clients/${clientId}/objectives**`, async (route) => {
    if (route.request().method() === "GET") return json(route, [record]);
    expect(route.request().method()).toBe("PATCH");
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({
      outcome: "Revised exact outcome",
      expectedVersion: 3,
      askType: "policy_authority",
    });
    writes++;
    record = { ...record, ...body, status: "draft", version: 4 };
    return json(route, record);
  });
  await page.goto(`${path}?objective=${objective.id}`);
  const editor = page.getByRole("dialog", {
    name: "Edit objective",
    exact: true,
  });
  await expect(editor).toBeVisible();
  await expect(
    page.getByRole("region", { name: "New objective", exact: true }),
  ).toHaveCount(0);
  await expect(
    editor.getByText("Saving changes reopens this objective as a draft."),
  ).toBeVisible();
  await editor.getByLabel(/^Outcome/).fill("Revised exact outcome");
  await editor.getByLabel("Ask type").selectOption("policy_authority");
  await editor.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(editor).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Revised exact outcome", exact: true }),
  ).toBeVisible();
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("a mismatched client response cannot populate or authorize the new objective form", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.route(`**/clients/${clientId}`, (route) =>
    json(route, {
      ...client,
      id: "10000000-0000-4000-8000-000000000002",
      name: "Unrelated private client",
    }),
  );
  await page.goto("/__test/objective-session?new=1");
  await expect(page.getByRole("alert")).toContainText(
    "did not confirm the selected client",
  );
  await expect(
    page.getByRole("region", { name: "New objective", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Unrelated private client")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});
