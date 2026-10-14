import { test, expect, type Page } from "@playwright/test";
import { operationFixtures, testIdentity } from "./fixtures";
import { installFixtures, json, objective } from "../../tests/browser/fixtures";
import {
  boundTask,
  binding,
  taskId,
  clientId,
} from "../../tests/objective-work-fixtures";
const query = {
  clientId,
  objectiveId: binding.objectiveId,
  objectiveVersion: 1,
};
const key = `planner:${taskId}:due`;
const href = `/calendar?${new URLSearchParams({ ...query, objectiveVersion: "1", occurrence: key, taskVersion: "4" })}`;
const endpoint = "**/api/capiro/planner.objectiveDestination?*";
async function fixture(page: Page) {
  const unexpected = await installFixtures(page);
  await operationFixtures(page, { "me.read": testIdentity });
  page.on("pageerror", (error) => unexpected.push(error.message));
  page.on("request", (r) => {
    const p = new URL(r.url()).pathname;
    if (p.startsWith("/api/") && r.method() !== "GET")
      unexpected.push("Write:" + p);
    if (p === "/api/backend/core/engagement/meetings")
      unexpected.push("Unbound Calendar:" + p);
  });
  return unexpected;
}
for (const timed of [false, true])
  test(`${timed ? "timed" : "civil"} occurrence preflight and Calendar resolve independently on open/history/recheck`, async ({
    page,
  }, info) => {
    const unexpected = await fixture(page);
    let ownerReads = 0,
      preflight = 0;
    const value = {
      ...boundTask,
      task: {
        ...boundTask.task,
        ...(timed ? { dueTime: "09:30", timeZone: "America/New_York" } : {}),
      },
    };
    await page.route("**/api/backend/strategy/planner/tasks?*", (r) =>
      json(r, { items: [value.task], nextCursor: null }),
    );
    await page.route(
      `**/api/backend/strategy/planner/tasks/${taskId}/objective-destination?*`,
      (r) => {
        preflight++;
        expect(
          Object.fromEntries(new URL(r.request().url()).searchParams),
        ).toEqual({ ...query, objectiveVersion: "1" });
        return json(r, value);
      },
    );
    await page.route(endpoint, (r) => {
      ownerReads++;
      const input = JSON.parse(
        new URL(r.request().url()).searchParams.get("input")!,
      );
      expect(input).toEqual({ params: { id: taskId }, query });
      return json(r, value);
    });
    await page.goto(
      `/portfolio/${clientId}/objectives?objective=${objective.id}`,
    );
    await page
      .getByRole("button", { name: "Choose existing resources", exact: true })
      .click();
    await page
      .getByLabel("Resource type", { exact: true })
      .selectOption("planner_occurrence");
    await page
      .getByLabel("Existing Calendar Planner occurrence", { exact: true })
      .selectOption(key);
    await page
      .getByRole("button", {
        name: "Open Objective-bound Calendar Planner occurrence",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/calendar\?/);
    await expect(
      page.getByRole("heading", { name: value.task.name, exact: true }),
    ).toBeVisible();
    expect(preflight).toBe(1);
    expect(ownerReads).toBe(1);
    await expect(
      page.getByText(
        timed
          ? /source timezone America\/New_York/
          : /civil date \(no instant conversion\)/,
      ),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Recheck current Calendar occurrence",
        exact: true,
      })
      .click();
    await expect.poll(() => ownerReads).toBe(2);
    await page
      .getByRole("link", { name: "Back to current Objective", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole("heading", { name: value.task.name, exact: true }),
    ).toBeVisible();
    await expect.poll(() => ownerReads).toBe(3);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: value.task.name, exact: true }),
    ).toBeVisible();
    expect(ownerReads).toBe(4);
    if (!timed) {
      await page.setViewportSize({ width: 390, height: 844 });
      const recheck = page.getByRole("button", {
        name: "Recheck current Calendar occurrence",
        exact: true,
      });
      await recheck.focus();
      await expect(recheck).toBeFocused();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath("objective-calendar-mobile.png"),
        fullPage: true,
      });
    }
    expect(unexpected).toEqual([]);
  });
for (const status of [403, 404, 409, 503])
  test(`owner${status} conceals Calendar occurrence until explicit retry`, async ({
    page,
  }) => {
    const unexpected = await fixture(page);
    let reads = 0;
    await page.route(endpoint, (r) => {
      reads++;
      return reads === 1
        ? json(r, { message: "Current occurrence unavailable" }, status)
        : json(r, boundTask);
    });
    await page.goto(href);
    await expect(page.getByRole("alert")).toContainText(
      "Current occurrence unavailable",
    );
    await expect(
      page.getByRole("heading", { name: boundTask.task.name, exact: true }),
    ).toHaveCount(0);
    expect(reads).toBe(1);
    await page
      .getByRole("button", {
        name: "Recheck current Calendar occurrence",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", { name: boundTask.task.name, exact: true }),
    ).toBeVisible();
    expect(reads).toBe(2);
    expect(unexpected).toEqual([]);
  });
test("fresh receipt with removed or collapsed selection refuses instead of retargeting", async ({
  page,
}) => {
  const unexpected = await fixture(page);
  let reads = 0;
  await page.route(endpoint, (r) => {
    reads++;
    return json(r, {
      ...boundTask,
      task: { ...boundTask.task, startOn: "2026-11-01", dueOn: "2026-11-01" },
    });
  });
  await page.goto(href.replace(":due", ":start").replace("%3Adue", "%3Astart"));
  await expect(page.getByRole("alert")).toContainText("no longer available");
  await expect(
    page.getByRole("heading", { name: boundTask.task.name, exact: true }),
  ).toHaveCount(0);
  expect(reads).toBe(1);
  expect(unexpected).toEqual([]);
});
test("malformed bound selectors and mismatched Objective never fall back to ordinary agenda", async ({
  page,
}) => {
  const unexpected = await fixture(page);
  let reads = 0;
  await page.route(endpoint, (r) => {
    reads++;
    return json(r, {
      ...boundTask,
      destination: { ...boundTask.destination, objectiveVersion: 2 },
    });
  });
  await page.goto(href);
  await expect(page.getByRole("alert")).toContainText("does not match");
  await page.evaluate((url) => {
    history.pushState({}, "", url);
    dispatchEvent(new PopStateEvent("popstate"));
  }, href + "&date=2026-11-01");
  await expect(
    page.getByRole("heading", {
      name: "Objective Calendar occurrence unavailable",
      exact: true,
    }),
  ).toBeVisible();
  expect(reads).toBe(1);
  expect(unexpected).toEqual([]);
});
for (const change of ["session", "selection"])
  test(`${change} replacement rejects a settled late receipt`, async ({
    page,
  }) => {
    const unexpected = await fixture(page);
    let reads = 0,
      release!: () => void,
      settle!: () => void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    const settled = new Promise<void>((r) => {
      settle = r;
    });
    await page.route(endpoint, async (r) => {
      reads++;
      if (reads === 1) {
        await held;
        await json(r, boundTask).catch(() => {});
        settle();
        return;
      }
      return json(r, { message: "Authority or occurrence changed" }, 404);
    });
    await page.goto(href);
    await expect.poll(() => reads).toBe(1);
    if (change === "session")
      await page.evaluate(() =>
        dispatchEvent(
          new CustomEvent("test:session", {
            detail: { sessionId: "replacement" },
          }),
        ),
      );
    else
      await page.evaluate(
        (url) => {
          history.pushState({}, "", url);
          dispatchEvent(new PopStateEvent("popstate"));
        },
        href.replace("%3Adue", "%3Astart"),
      );
    await expect(page.getByRole("alert")).toContainText(
      "Authority or occurrence changed",
    );
    release();
    await settled;
    await expect(
      page.getByRole("heading", { name: boundTask.task.name, exact: true }),
    ).toHaveCount(0);
    expect(reads).toBe(2);
    expect(unexpected).toEqual([]);
  });
