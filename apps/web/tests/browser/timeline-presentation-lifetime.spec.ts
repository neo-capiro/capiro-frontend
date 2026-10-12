import { test, expect } from "@playwright/test";
import { clientId, installFixtures, json } from "./fixtures";
const note = {
  id: "90000000-0000-4000-8000-000000000001",
  kind: "note",
  title: "Uncertain timeline note",
  body: "Recorded detail",
  occurredAt: "2026-10-11T12:00:00Z",
  origin: "recorded",
  sourceType: null,
  sourceId: null,
  dueAt: null,
  settledAt: null,
  pinned: false,
};
const newer = {
  ...note,
  id: "90000000-0000-4000-8000-000000000002",
  title: "Newer note",
  occurredAt: "2026-10-12T12:00:00Z",
};
for (const transition of [
  "expand and return",
  "native pinned regrouping",
] as const)
  test(`uncertain activity stays fenced through ${transition}`, async ({
    page,
  }) => {
    const unexpected = await installFixtures(page);
    let current = [newer, note];
    let writes = 0;
    await page.route(`**/clients/${clientId}/activity**`, (route) => {
      if (route.request().method() === "GET") return json(route, current);
      writes++;
      if (transition === "native pinned regrouping")
        current = [{ ...note, pinned: true }, newer];
      return json(route, { message: "Synthetic uncertain timeline pin" }, 503);
    });
    await page.goto(`/portfolio/${clientId}`);
    const timeline = page.getByRole("region", {
      name: "Activity timeline",
      exact: true,
    });
    await timeline
      .getByRole("button", {
        name: `Activity actions: ${note.title}`,
        exact: true,
      })
      .click();
    await page.getByRole("menuitem", { name: "Pin note", exact: true }).click();
    await expect.poll(() => writes).toBe(1);
    if (transition === "expand and return") {
      await expect(
        timeline.getByRole("button", {
          name: "Review latest activity",
          exact: true,
        }),
      ).toBeVisible();
      await timeline
        .getByRole("button", { name: "Expand timeline ↗", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Engagement timeline", exact: true })
        .getByRole("button", { name: "Return to profile", exact: true })
        .click();
    }
    await expect(
      timeline.getByRole("button", {
        name: "Review latest activity",
        exact: true,
      }),
    ).toBeVisible();
    await timeline
      .getByRole("button", {
        name: `Activity actions: ${note.title}`,
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("menuitem", { name: /^Pin note$|^Unpin note$/ }),
    ).toHaveAttribute("data-disabled", "");
    await page.keyboard.press("Escape");
    expect(writes).toBe(1);
    expect(unexpected).toEqual([]);
  });

test("pending activity stays fenced while its response is held across expand and return", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let writes = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/clients/${clientId}/activity**`, async (route) => {
    if (route.request().method() === "GET") return json(route, [note]);
    writes++;
    await pending;
    return json(route, { message: "Synthetic held pin reply" }, 503).catch(
      () => {},
    );
  });
  await page.goto(`/portfolio/${clientId}`);
  const timeline = page.getByRole("region", {
    name: "Activity timeline",
    exact: true,
  });
  const action = timeline.getByRole("button", {
    name: `Activity actions: ${note.title}`,
    exact: true,
  });
  await action.click();
  await page.getByRole("menuitem", { name: "Pin note", exact: true }).click();
  await expect.poll(() => writes).toBe(1);
  try {
    await timeline
      .getByRole("button", { name: "Expand timeline ↗", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Engagement timeline", exact: true })
      .getByRole("button", { name: "Return to profile", exact: true })
      .click();
    await expect(action).toBeDisabled();
  } finally {
    release();
  }
  await expect(
    timeline.getByRole("button", {
      name: "Review latest activity",
      exact: true,
    }),
  ).toBeVisible();
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("expanded Log activity reuses the existing Quick log uncertain creation owner", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let writes = 0;
  await page.route(`**/clients/${clientId}/activity**`, (route) => {
    if (route.request().method() === "GET") return json(route, [note]);
    writes++;
    return json(route, { message: "Synthetic uncertain new activity" }, 503);
  });
  await page.goto(`/portfolio/${clientId}?log=1&context=preserved`);
  const log = page.getByRole("dialog", { name: "Quick log", exact: true });
  await log
    .getByLabel("Title", { exact: true })
    .fill("Uncertain original activity");
  await log.getByRole("button", { name: "Save activity", exact: true }).click();
  await expect(log.getByText(/save result is uncertain/i)).toBeVisible();
  await log.getByRole("button", { name: "Close", exact: true }).click();
  const timeline = page.getByRole("region", {
    name: "Activity timeline",
    exact: true,
  });
  await timeline
    .getByRole("button", { name: "Expand timeline ↗", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Engagement timeline", exact: true })
    .getByRole("button", { name: "Log activity", exact: true })
    .click();
  await expect(
    log.getByRole("button", { name: "Save activity", exact: true }),
  ).toBeDisabled();
  await expect(log.getByText(/save result is uncertain/i)).toBeVisible();
  expect(new URL(page.url()).searchParams.get("context")).toBe("preserved");
  expect(new URL(page.url()).searchParams.get("log")).toBe("1");
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});
