import { expect, test, type Page, type Route } from "@playwright/test";
import { setupConversation } from "./meri-conversation-fixtures";

/**
 * Live acceptance (1 November 2026) measured 3 animation frames in 2 s on /meri/memory with 25
 * records. The same measurement on the live page showed an idle main thread (no long tasks, no
 * DOM mutations) and the same frame rate on every page, including a static site: the environment,
 * not the page. This guard keeps it that way: 25 records and 25 proposals arrive with exactly two
 * reads, render promptly, and the page then settles with no further mutations.
 */
const updatedAt = "2026-10-21T12:00:00.123456Z";
const id = (prefix: string, index: number) =>
  `${prefix}0000-0000-4000-8000-${String(index).padStart(12, "0")}`;
const items = Array.from({ length: 25 }, (_, index) => ({
  id: id("1000", index + 1),
  title: `user:11111111-1111-4111-8111-111111111111:synthetic-preference-${index + 1}`,
  value: `Synthetic memory value number ${index + 1}. It is a sentence of ordinary length.`,
  scope: "user_private",
  clientId: null,
  updatedAt,
}));
const candidates = Array.from({ length: 25 }, (_, index) => ({
  id: id("2000", index + 1),
  kind: index % 2 ? "correction" : "addition",
  key: `user:11111111-1111-4111-8111-111111111111:synthetic-candidate-${index + 1}`,
  value: `Synthetic candidate value number ${index + 1}.`,
  sourceType: "meri",
  createdAt: "2026-10-21T12:00:00.000Z",
}));

async function memoryFixture(page: Page) {
  const fixture = await setupConversation(page);
  await page.addInitScript(() =>
    sessionStorage.setItem("memory-owner-review-enabled", "true"),
  );
  const held: Route[] = [];
  const reads: string[] = [];
  await page.route("**/api/memory/owner/candidates?*", (route) => {
    reads.push(route.request().url());
    held.push(route);
  });
  await page.route("**/api/memory/owner/items?*", (route) => {
    reads.push(route.request().url());
    held.push(route);
  });
  const release = () =>
    Promise.all(
      held.splice(0).map((route) =>
        route.fulfill({
          json: route.request().url().includes("/candidates")
            ? { version: 1, candidates, nextCursor: null }
            : {
                schemaVersion: 1,
                ownerReadsVersion: 1,
                items,
                nextCursor: null,
              },
        }),
      ),
    );
  return { ...fixture, reads, release };
}

test("25 records and 25 proposals render from two reads and the page then settles", async ({
  page,
}) => {
  const fixture = await memoryFixture(page);
  await page.goto("/meri/memory");
  await expect(
    page.getByRole("heading", { name: "Institutional Memory", exact: true }),
  ).toBeVisible();
  await expect.poll(() => fixture.reads.length).toBe(2);
  await page.evaluate(() => {
    const w = window as unknown as { __longTasks: number[] };
    w.__longTasks = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) w.__longTasks.push(entry.duration);
    }).observe({ type: "longtask" });
  });
  const started = Date.now();
  await fixture.release();
  await expect(
    page
      .getByRole("group", { name: "Current personal memories" })
      .getByRole("article"),
  ).toHaveCount(25);
  await expect(
    page
      .getByRole("region", { name: "Pending personal memory proposals" })
      .getByRole("article"),
  ).toHaveCount(25);
  const rendered = Date.now() - started;
  const settled = await page.evaluate(
    () =>
      new Promise<{ mutations: number; frames: number; longTasks: number[] }>(
        (resolve) => {
          let mutations = 0;
          const observer = new MutationObserver((records) => {
            mutations += records.length;
          });
          observer.observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            characterData: true,
          });
          let frames = 0;
          const end = performance.now() + 1000;
          const tick = () => {
            frames++;
            if (performance.now() < end) requestAnimationFrame(tick);
            else {
              observer.disconnect();
              resolve({
                mutations,
                frames,
                longTasks: (window as unknown as { __longTasks: number[] })
                  .__longTasks,
              });
            }
          };
          requestAnimationFrame(tick);
        },
      ),
  );
  expect(fixture.reads).toHaveLength(2);
  expect(rendered).toBeLessThan(2000);
  expect(settled.longTasks.filter((duration) => duration > 100)).toEqual([]);
  expect(settled.mutations).toBe(0);
  expect(settled.frames).toBeGreaterThan(30);
  expect(fixture.unexpected).toEqual([]);
});
