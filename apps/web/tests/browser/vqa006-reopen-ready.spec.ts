import { expect, test, type Page } from "@playwright/test";

type Observed = {
  nextBlocked: string | null;
  unknown: boolean;
  recovery: boolean;
  source: string | null;
  intent: { state: string; source: string; target: string | null } | null;
  reserveCalls: number;
  canAck: boolean | null;
};

/** The typed probe the synthetic page publishes; the driver reads no product internals. */
type Review = {
  observed: Observed;
  startNext: () => Promise<boolean>;
  refresh: () => void;
  admit: () => void;
  away: () => void;
  reopen: (runId: string) => void;
  controlStores: (windowRequest: object | null) => void;
  composer: (selection: object | undefined) => void;
};

const observed = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          __vqa006: Review;
        }
      ).__vqa006.observed,
  );

const call = (page: Page, name: keyof Review, arg?: unknown) =>
  page.evaluate(
    ({ name, arg }) => {
      const published = (window as unknown as { __vqa006: Review }).__vqa006;
      return (published[name] as unknown as (value?: unknown) => unknown)(arg);
    },
    { name, arg },
  );

test("a completed repeat request survives a real remount without reconciliation", async ({
  page,
}) => {
  await page.goto("/vqa006-reopen-ready.html");
  await expect
    .poll(async () => (await observed(page)).source)
    .toBe("c0060000-0000-4000-8000-000000000011");
  expect(await call(page, "startNext")).toBe(true);
  await expect
    .poll(async () => (await observed(page)).intent !== null)
    .toBe(true);
  await call(page, "admit");
  // The page re-reads the transcript when its run settles; that read is what settles the request.
  await call(page, "refresh");
  await expect.poll(async () => (await observed(page)).intent).toBe(null);
  await call(page, "away");
  await call(page, "reopen", "c0060000-0000-4000-8000-000000000012");
  await expect
    .poll(async () => (await observed(page)).source)
    .toBe("c0060000-0000-4000-8000-000000000012");
  const state = await observed(page);
  expect(state.recovery).toBe(false);
  expect(state.unknown).toBe(false);
  expect(state.nextBlocked).toBe(null);
});

test("a message completed while the page was away reopens ready", async ({
  page,
}) => {
  await page.goto("/vqa006-reopen-ready.html");
  await expect
    .poll(async () => (await observed(page)).source)
    .toBe("c0060000-0000-4000-8000-000000000011");
  expect(await call(page, "startNext")).toBe(true);
  await expect
    .poll(async () => (await observed(page)).intent !== null)
    .toBe(true);
  // The tab goes away before control admits the request or the page re-reads anything.
  await call(page, "away");
  await call(page, "admit");
  await call(page, "reopen", "c0060000-0000-4000-8000-000000000012");
  await expect
    .poll(async () => (await observed(page)).source)
    .toBe("c0060000-0000-4000-8000-000000000012");
  await expect.poll(async () => (await observed(page)).intent).toBe(null);
  const state = await observed(page);
  expect(state.recovery).toBe(false);
  expect(state.unknown).toBe(false);
  expect(state.nextBlocked).toBe(null);
});

test("a request control never admitted keeps the conversation protected", async ({
  page,
}) => {
  await page.goto("/vqa006-reopen-ready.html");
  await expect
    .poll(async () => (await observed(page)).source)
    .toBe("c0060000-0000-4000-8000-000000000011");
  expect(await call(page, "startNext")).toBe(true);
  await expect
    .poll(async () => (await observed(page)).intent !== null)
    .toBe(true);
  // No admission: control answered RESERVED and the person left before anything was confirmed.
  await call(page, "away");
  await call(page, "reopen", "c0060000-0000-4000-8000-000000000012");
  await expect.poll(async () => (await observed(page)).recovery).toBe(true);
  const state = await observed(page);
  expect(state.nextBlocked).not.toBe(null);
  expect(state.source).toBe(null);
  // Nothing is re-sent, re-reserved or checked automatically by reopening.
  expect(state.reserveCalls).toBe(1);
});

test("a completed successor that inherited control defaults still reopens ready", async ({
  page,
}) => {
  await page.goto("/vqa006-reopen-ready.html");
  await expect
    .poll(async () => (await observed(page)).source)
    .toBe("c0060000-0000-4000-8000-000000000011");
  // Control preserves the source request's default window content into the successor's request.
  await call(page, "controlStores", {
    basis: "calendar-month",
    offset: 0,
    timezone: "UTC",
  });
  expect(await call(page, "startNext")).toBe(true);
  await expect
    .poll(async () => (await observed(page)).intent !== null)
    .toBe(true);
  await call(page, "admit");
  await call(page, "refresh");
  await call(page, "away");
  await call(page, "reopen", "c0060000-0000-4000-8000-000000000012");
  await expect
    .poll(async () => (await observed(page)).source)
    .toBe("c0060000-0000-4000-8000-000000000012");
  const state = await observed(page);
  expect(state.recovery).toBe(false);
  expect(state.nextBlocked).toBe(null);
});

test("a selection the person made stays protected when control stored another", async ({
  page,
}) => {
  await page.goto("/vqa006-reopen-ready.html");
  await expect
    .poll(async () => (await observed(page)).source)
    .toBe("c0060000-0000-4000-8000-000000000011");
  await call(page, "composer", {
    windowRequest: {
      basis: "calendar-week",
      offset: 0,
      timezone: "UTC",
      weekStartsOn: "monday",
    },
  });
  await call(page, "controlStores", {
    basis: "calendar-month",
    offset: 0,
    timezone: "UTC",
  });
  expect(await call(page, "startNext")).toBe(true);
  await expect
    .poll(async () => (await observed(page)).intent !== null)
    .toBe(true);
  await call(page, "admit");
  await call(page, "refresh");
  await call(page, "away");
  await call(page, "reopen", "c0060000-0000-4000-8000-000000000012");
  await expect.poll(async () => (await observed(page)).recovery).toBe(true);
  const state = await observed(page);
  expect(state.nextBlocked).not.toBe(null);
});

test("reopening the same settled turn twice stays ready and reserves nothing", async ({
  page,
}) => {
  await page.goto("/vqa006-reopen-ready.html");
  await expect
    .poll(async () => (await observed(page)).source)
    .toBe("c0060000-0000-4000-8000-000000000011");
  await call(page, "controlStores", {
    basis: "calendar-month",
    offset: 0,
    timezone: "UTC",
  });
  expect(await call(page, "startNext")).toBe(true);
  await expect
    .poll(async () => (await observed(page)).intent !== null)
    .toBe(true);
  await call(page, "admit");
  await call(page, "refresh");
  await expect.poll(async () => (await observed(page)).intent).toBe(null);
  await call(page, "away");
  await call(page, "reopen", "c0060000-0000-4000-8000-000000000012");
  await expect
    .poll(async () => (await observed(page)).source)
    .toBe("c0060000-0000-4000-8000-000000000012");
  await call(page, "away");
  await call(page, "reopen", "c0060000-0000-4000-8000-000000000012");
  await expect
    .poll(async () => (await observed(page)).source)
    .toBe("c0060000-0000-4000-8000-000000000012");
  const state = await observed(page);
  expect(state.nextBlocked).toBe(null);
  expect(state.recovery).toBe(false);
  expect(state.reserveCalls).toBe(1);
});
