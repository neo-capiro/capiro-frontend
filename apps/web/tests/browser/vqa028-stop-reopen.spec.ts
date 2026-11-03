import { expect, test, type Page } from "@playwright/test";

/**
 * VQA-028 mounted regression. A reopened run whose Stop was never confirmed must stop asking the
 * person to repeat it once that exact run's terminal state is admitted - without dropping the
 * request confirmation the same read proves, and without sending anything.
 */
type Inspect = {
  status: string;
  runState: string | null;
  journal: { submit?: { state?: string }; cancel?: string };
  cancel: string | null;
  ready: boolean;
  controlsHeld: boolean;
  calls: string[];
  writes: number;
  error: string | null;
  storageError: string | null;
  receipt: { state?: string } | null;
};

const start = async (page: Page, options: Record<string, unknown> = {}) => {
  await page.goto("/vqa028-stop-reopen.html");
  await page.waitForFunction(() => "vqa028" in window);
  await page.evaluate(
    (value) =>
      (
        window as unknown as { vqa028: { start: (o: unknown) => void } }
      ).vqa028.start(value),
    options,
  );
};
const inspect = (page: Page): Promise<Inspect> =>
  page.evaluate(() =>
    (
      window as unknown as { vqa028: { inspect: () => Inspect } }
    ).vqa028.inspect(),
  );
const commands = (state: Inspect) =>
  state.calls.filter((path) => /\/(cancel|submit)$/.test(path));
const observationCalls = (state: Inspect) =>
  state.calls.filter(
    (path) => path.includes("/events") || path.includes("/subscribe"),
  ).length;
/** Explicit person actions on the mounted page; the harness exposes only these. */
const stopCommand = (page: Page) =>
  page.evaluate(() => {
    void (
      window as unknown as { vqa028: { stop: () => Promise<void> } }
    ).vqa028.stop();
  });
const terminalEvent = (page: Page) =>
  page.evaluate(() => {
    (
      window as unknown as { vqa028: { terminalEvent: () => void } }
    ).vqa028.terminalEvent();
  });

/**
 * Both journal transitions, the visible card, readiness and the dispatch guarantee. A case that
 * starts from a live Stop states the one request it may have made itself.
 */
const confirmed = async (
  page: Page,
  dispatched: { cancel: number } = { cancel: 0 },
) => {
  await expect
    .poll(async () => (await inspect(page)).cancel ?? null)
    .toBe(null);
  await expect
    .poll(async () => (await inspect(page)).journal.submit?.state)
    .toBe("observed");
  await expect(page.getByTestId("ready")).toHaveText("true");
  await expect(page.getByTestId("held")).toHaveText("false");
  await expect(
    page.getByRole("button", { name: "Retry Stop", exact: true }),
  ).toHaveCount(0);
  const state = await inspect(page);
  expect(state.error).toBe(null);
  expect(state.storageError).toBe(null);
  expect(state.calls.filter((path) => path.endsWith("/cancel"))).toHaveLength(
    dispatched.cancel,
  );
  expect(state.calls.filter((path) => path.endsWith("/submit"))).toEqual([]);
  return state;
};

test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    (
      window as unknown as { vqa028?: { dispose: () => void } }
    ).vqa028?.dispose();
  });
});

for (const state of ["cancelled", "completed", "failed"]) {
  test(`cold ${state} run retires its stale Stop and confirms its request`, async ({
    page,
  }) => {
    await start(page, { state });
    const result = await confirmed(page);
    // One admitted read, one write per journal transition, and no command dispatched.
    expect(
      result.calls.filter((path) => path.endsWith("/history")),
    ).toHaveLength(1);
    expect(result.writes).toBe(2);
  });
}

test("StrictMode retires and confirms once, without duplicate reads or writes", async ({
  page,
}) => {
  await start(page, { strict: true });
  const result = await confirmed(page);
  expect(result.calls.filter((path) => path.endsWith("/history"))).toHaveLength(
    1,
  );
  expect(result.writes).toBe(2);
});

test("an unsettled run keeps its uncertainty and its explicit Retry Stop", async ({
  page,
}) => {
  await start(page, { state: "running" });
  await expect(page.getByTestId("state")).toHaveText("running");
  await expect(
    page.getByRole("button", { name: "Retry Stop", exact: true }),
  ).toBeVisible();
  const state = await inspect(page);
  // The read confirms the request; the Stop itself stays unresolved because the run has not settled.
  expect(state.journal.cancel).toBe("unknown");
  expect(state.journal.submit?.state).toBe("observed");
  expect(state.writes).toBe(1);
  expect(state.ready).toBe(false);
  expect(state.controlsHeld).toBe(true);
});

test("a write refusal keeps the uncertainty and never retries itself", async ({
  page,
}) => {
  await start(page, { writeFails: true });
  await expect.poll(async () => (await inspect(page)).error).not.toBe(null);
  const refused = await inspect(page);
  expect(refused.journal.cancel).toBe("unknown");
  expect(refused.ready).toBe(false);
  expect(refused.controlsHeld).toBe(true);
  await page.evaluate(() => {
    (window as unknown as { vqa028: { force: () => void } }).vqa028.force();
  });
  await page.waitForTimeout(200);
  const after = await inspect(page);
  expect(after.writes).toBe(refused.writes);
  expect(commands(after)).toEqual([]);
});

test("a read control did not answer keeps the record untouched", async ({
  page,
}) => {
  await start(page, { readFails: true });
  await expect
    .poll(async () => (await inspect(page)).status)
    .toBe("unavailable");
  const state = await inspect(page);
  expect(state.journal.cancel).toBe("unknown");
  expect(state.writes).toBe(0);
  expect(commands(state)).toEqual([]);
});

test("history for a run this context did not bind cannot retire the record", async ({
  page,
}) => {
  await start(page, { foreignRun: true });
  await expect
    .poll(async () => (await inspect(page)).status)
    .toBe("unavailable");
  const state = await inspect(page);
  expect(state.journal.cancel).toBe("unknown");
  expect(state.writes).toBe(0);
});

test("a lost Stop retires on the same run's terminal state and is never replayed", async ({
  page,
}) => {
  await start(page, { state: "running", noStoredCancel: true, cancel: "lost" });
  await expect(page.getByTestId("state")).toHaveText("running");
  await page.evaluate(() => {
    void (
      window as unknown as { vqa028: { stop: () => Promise<void> } }
    ).vqa028.stop();
  });
  await expect(
    page.getByRole("button", { name: "Retry Stop", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    void (
      window as unknown as {
        vqa028: { history: (state?: string) => Promise<void> };
      }
    ).vqa028.history("cancelled");
  });
  // The person's own Stop is the only request; the retirement never repeats it.
  const state = await confirmed(page, { cancel: 1 });
  expect(state.journal.cancel).toBeUndefined();
});

test("control's own receipt still says what Stop did", async ({ page }) => {
  await start(page, {
    state: "running",
    noStoredCancel: true,
    cancel: "completed",
  });
  await expect(page.getByTestId("state")).toHaveText("running");
  await page.evaluate(() => {
    void (
      window as unknown as { vqa028: { stop: () => Promise<void> } }
    ).vqa028.stop();
  });
  await page.evaluate(() => {
    void (
      window as unknown as {
        vqa028: { history: (state?: string) => Promise<void> };
      }
    ).vqa028.history("completed");
  });
  await expect(
    page.getByRole("heading", { name: "Run already completed" }),
  ).toBeVisible();
  const state = await inspect(page);
  expect(state.journal.cancel).toBe("observed");
  expect(state.receipt?.state).toBe("completed");
});

/**
 * R2: a lost Stop may not be retired by another command. The run's own observation stream then
 * admits the exact same-run terminal state, and that alone must end the obsolete local record.
 */
test("a lost Stop retires on the run's own terminal observation without a second command", async ({
  page,
}) => {
  await start(page, { state: "running", noStoredCancel: true, cancel: "lost" });
  await expect(page.getByTestId("state")).toHaveText("running");
  await stopCommand(page);
  await expect
    .poll(async () => (await inspect(page)).journal.cancel)
    .toBe("unknown");
  // The observation loop is already subscribed; nothing asks control for the state.
  await expect
    .poll(async () => observationCalls(await inspect(page)))
    .toBeGreaterThan(0);
  await terminalEvent(page);
  await expect(page.getByTestId("state")).toHaveText("cancelled");
  const state = await confirmed(page, { cancel: 1 });
  // One read, one Stop, no streamed replacement command.
  expect(state.calls.filter((path) => path.endsWith("/history"))).toHaveLength(
    1,
  );
  expect(state.calls.filter((path) => path.endsWith("/cancel"))).toHaveLength(
    1,
  );
  expect(state.calls.filter((path) => path.endsWith("/submit"))).toEqual([]);
});

test("a refused local write after that terminal admission is never retried by itself", async ({
  page,
}) => {
  await start(page, { state: "running", noStoredCancel: true, cancel: "lost" });
  await expect(page.getByTestId("state")).toHaveText("running");
  await stopCommand(page);
  await expect
    .poll(async () => (await inspect(page)).journal.cancel)
    .toBe("unknown");
  // This tab can no longer save: the retirement must stop at its own failure, not loop.
  await page.evaluate(() =>
    (
      window as unknown as { vqa028: { failWrites: (next: boolean) => void } }
    ).vqa028.failWrites(true),
  );
  await terminalEvent(page);
  await expect(page.getByTestId("state")).toHaveText("cancelled");
  await expect.poll(async () => (await inspect(page)).error).not.toBe(null);
  const refused = await inspect(page);
  expect(refused.journal.cancel).toBe("unknown");
  expect(refused.ready).toBe(false);
  expect(refused.controlsHeld).toBe(true);
  await page.evaluate(() => {
    (window as unknown as { vqa028: { force: () => void } }).vqa028.force();
  });
  await page.waitForTimeout(200);
  const after = await inspect(page);
  expect(after.writes).toBe(refused.writes);
  expect(after.calls.filter((path) => path.endsWith("/history"))).toHaveLength(
    1,
  );
  expect(after.calls.filter((path) => path.endsWith("/cancel"))).toHaveLength(
    1,
  );
  expect(after.calls.filter((path) => path.endsWith("/submit"))).toEqual([]);
});
