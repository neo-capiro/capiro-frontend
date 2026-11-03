import { test, expect, type Page } from "@playwright/test";

// VQA-006 successor fixture. It exercises the production readiness composition over a canonical
// synthetic history: a settled repeat message must reopen ready, and any stored row the retained
// message did not submit must keep the intent, the warning and the disabled composer. The original
// VQA-006/9977 cause is UNESTABLISHED; these cases are proposed regression coverage, not a repair.

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
  controlStoresUploads: (
    uploads: { uploadId: string; sha256: string }[] | undefined,
  ) => void;
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

const first = "c0060000-0000-4000-8000-000000000011";
const second = "c0060000-0000-4000-8000-000000000012";

test("a completed repeat request survives a real remount without reconciliation", async ({
  page,
}) => {
  await page.goto("/vqa006-reopen-ready.html");
  await expect.poll(async () => (await observed(page)).source).toBe(first);
  expect(await call(page, "startNext")).toBe(true);
  await expect
    .poll(async () => (await observed(page)).intent !== null)
    .toBe(true);
  await call(page, "admit");
  // The page re-reads the transcript when its run settles; that read settles the request.
  await call(page, "refresh");
  await expect.poll(async () => (await observed(page)).intent).toBe(null);
  await call(page, "away");
  await call(page, "reopen", second);
  await expect.poll(async () => (await observed(page)).source).toBe(second);
  const state = await observed(page);
  expect(state.recovery).toBe(false);
  expect(state.unknown).toBe(false);
  expect(state.nextBlocked).toBe(null);
});

test("a message completed while the page was away reopens ready", async ({
  page,
}) => {
  await page.goto("/vqa006-reopen-ready.html");
  await expect.poll(async () => (await observed(page)).source).toBe(first);
  expect(await call(page, "startNext")).toBe(true);
  await expect
    .poll(async () => (await observed(page)).intent !== null)
    .toBe(true);
  // The tab goes away before control admits the request or the page re-reads anything.
  await call(page, "away");
  await call(page, "admit");
  await call(page, "reopen", second);
  await expect.poll(async () => (await observed(page)).source).toBe(second);
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
  await expect.poll(async () => (await observed(page)).source).toBe(first);
  expect(await call(page, "startNext")).toBe(true);
  await expect
    .poll(async () => (await observed(page)).intent !== null)
    .toBe(true);
  // No admission: control answered RESERVED and the person left before anything was confirmed.
  await call(page, "away");
  await call(page, "reopen", second);
  await expect.poll(async () => (await observed(page)).recovery).toBe(true);
  const state = await observed(page);
  expect(state.nextBlocked).not.toBe(null);
  expect(state.source).toBe(null);
  // Nothing is re-sent, re-reserved or checked automatically by reopening.
  expect(state.reserveCalls).toBe(1);
});

test("a stored window the message never submitted keeps the intent and the warning", async ({
  page,
}) => {
  await page.goto("/vqa006-reopen-ready.html");
  await expect.poll(async () => (await observed(page)).source).toBe(first);
  // A stored row the retained message never submitted: the public submit/history correlation
  // refuses to pair them, so this row may never settle that intent.
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
  // The completed read may not delete the retained request for an input it does not match.
  await expect.poll(async () => (await observed(page)).canAck).toBe(false);
  await expect.poll(async () => (await observed(page)).intent).not.toBe(null);
  await call(page, "away");
  await call(page, "reopen", second);
  await expect.poll(async () => (await observed(page)).recovery).toBe(true);
  const reopened = await observed(page);
  expect(reopened.nextBlocked).not.toBe(null);
  // Durable: a second ordinary reopen still finds the same unresolved request.
  await call(page, "away");
  await call(page, "reopen", second);
  await expect.poll(async () => (await observed(page)).recovery).toBe(true);
  const twice = await observed(page);
  expect(reopened.intent).not.toBe(null);
  expect(twice.intent).not.toBe(null);
  expect(twice.reserveCalls).toBe(1);
});

test("a selection the person made stays protected when control stored another", async ({
  page,
}) => {
  await page.goto("/vqa006-reopen-ready.html");
  await expect.poll(async () => (await observed(page)).source).toBe(first);
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
  await call(page, "reopen", second);
  await expect.poll(async () => (await observed(page)).recovery).toBe(true);
  const state = await observed(page);
  expect(state.nextBlocked).not.toBe(null);
});

test("a stored upload the message never submitted keeps the intent and the warning", async ({
  page,
}) => {
  await page.goto("/vqa006-reopen-ready.html");
  await expect.poll(async () => (await observed(page)).source).toBe(first);
  await call(page, "controlStoresUploads", [
    {
      uploadId: "c0060000-0000-4000-8000-0000000000c1",
      sha256: "c".repeat(64),
    },
  ]);
  expect(await call(page, "startNext")).toBe(true);
  await expect
    .poll(async () => (await observed(page)).intent !== null)
    .toBe(true);
  await call(page, "admit");
  await call(page, "refresh");
  await expect.poll(async () => (await observed(page)).canAck).toBe(false);
  await expect.poll(async () => (await observed(page)).intent).not.toBe(null);
  await call(page, "away");
  await call(page, "reopen", second);
  await expect.poll(async () => (await observed(page)).recovery).toBe(true);
  expect((await observed(page)).nextBlocked).not.toBe(null);
});

test("reopening the same settled turn twice stays ready and reserves nothing", async ({
  page,
}) => {
  await page.goto("/vqa006-reopen-ready.html");
  await expect.poll(async () => (await observed(page)).source).toBe(first);
  expect(await call(page, "startNext")).toBe(true);
  await expect
    .poll(async () => (await observed(page)).intent !== null)
    .toBe(true);
  await call(page, "admit");
  await call(page, "refresh");
  await expect.poll(async () => (await observed(page)).intent).toBe(null);
  await call(page, "away");
  await call(page, "reopen", second);
  await expect.poll(async () => (await observed(page)).source).toBe(second);
  await call(page, "away");
  await call(page, "reopen", second);
  await expect.poll(async () => (await observed(page)).source).toBe(second);
  const state = await observed(page);
  expect(state.nextBlocked).toBe(null);
  expect(state.recovery).toBe(false);
  expect(state.reserveCalls).toBe(1);
});
