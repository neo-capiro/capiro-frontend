import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { setup } from "./next-modules-fixtures";
const revision = "a".repeat(64);
const cursor = "54000000-0000-4000-8000-000000000002";
const sheet = {
  id: null,
  userId: "test-user",
  weekOn: "2026-10-05",
  throughOn: "2026-10-11",
  reviewerId: null,
  status: "draft",
  version: 0,
  revision,
  notes: "",
  totalMinutes: 0,
  billableMinutes: 0,
  days: [],
  items: [],
  nextCursor: null,
  matched: 0,
  actions: [],
  history: [],
  canLogTime: true,
};
const emptyPage = {
  fromOn: "2026-10-05",
  throughOn: "2026-10-05",
  revision,
  matched: 0,
  totalMinutes: 0,
  billableMinutes: 0,
  unavailableEntries: false,
  items: [],
  nextCursor: null,
};
async function openExport(page: Parameters<typeof setup>[0]) {
  await setup(page, { "planner.timesheet": sheet });
  await page.goto("/modules/planner?view=timesheets");
  await page
    .getByRole("button", { name: "Export time entries", exact: true })
    .click();
  return page.getByRole("dialog", { name: "Export time entries", exact: true });
}
async function burst(
  dialog: ReturnType<Parameters<typeof setup>[0]["getByRole"]>,
) {
  await dialog.locator("form").evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
    (form as HTMLFormElement).requestSubmit();
    (form as HTMLFormElement).requestSubmit();
  });
}
test("one native export attempt preserves pagination revision and downloads complete escaped CSV", async ({
  page,
}, info) => {
  const dialog = await openExport(page);
  let reads = 0,
    release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = {
    id: "54000000-0000-4000-8000-000000000001",
    kind: "time",
    text: 'Synthetic "quoted" note',
    createdAt: "2026-10-05T16:00:00Z",
    actorId: "test-user",
    minutes: 60,
    time: {
      workedOn: "2026-10-05",
      timeZone: "America/New_York",
      billable: false,
      projectId: null,
      category: "",
    },
    taskName: "=SUM(1,2)",
    projectName: null,
    canEdit: true,
    submitterName: "Synthetic user",
    taskStatus: "Open",
  };
  await page.route("**/api/capiro/planner.time.export?*", async (route) => {
    reads++;
    const query = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    ).query;
    expect(query).toMatchObject({
      scope: "personal",
      userId: "test-user",
      fromOn: "2026-10-05",
      throughOn: "2026-10-05",
    });
    if (reads === 1) {
      expect(query.cursor).toBeUndefined();
      await held;
    } else expect(query).toMatchObject({ cursor, revision });
    await route.fulfill({
      json: {
        ...emptyPage,
        matched: 2,
        totalMinutes: 90,
        items: [
          {
            ...first,
            ...(reads === 2
              ? {
                  id: cursor,
                  minutes: 30,
                  text: "Synthetic second page",
                  taskName: "Second task",
                }
              : {}),
          },
        ],
        nextCursor: reads === 1 ? cursor : null,
      },
    });
  });
  const downloads: string[] = [];
  page.on("download", (download) =>
    downloads.push(download.suggestedFilename()),
  );
  await burst(dialog);
  const downloading = page.waitForEvent("download");
  try {
    await expect.poll(() => reads).toBe(1);
    for (const label of ["Scope", "From", "Through"])
      await expect(dialog.getByLabel(label, { exact: true })).toBeDisabled();
  } finally {
    release();
  }
  const download = await downloading;
  const path = info.outputPath("complete-synthetic-time.csv");
  await download.saveAs(path);
  const csv = await readFile(path, "utf8");
  expect(csv).toContain(
    '"Worked on","Submitter","Task","Project","Minutes","Billable","Description"',
  );
  expect(csv).toContain('"\'=SUM(1,2)"');
  expect(csv).toContain('"Synthetic ""quoted"" note"');
  expect(csv).toContain('"Synthetic second page"');
  expect(downloads).toEqual(["capiro-time-2026-10-05-2026-10-05.csv"]);
  expect(reads).toBe(2);
  await expect(dialog).toHaveCount(0);
});
for (const dismissal of ["Cancel", "Escape", "Close dialog"] as const) {
  test(`${dismissal} retires held export; old settlement cannot download or release reopened export`, async ({
    page,
  }) => {
    const dialog = await openExport(page);
    let reads = 0,
      releaseOld!: () => void,
      releaseNew!: () => void,
      settleOld!: () => void;
    const oldHeld = new Promise<void>((resolve) => {
      releaseOld = resolve;
    });
    const newHeld = new Promise<void>((resolve) => {
      releaseNew = resolve;
    });
    const oldSettled = new Promise<void>((resolve) => {
      settleOld = resolve;
    });
    const downloads: string[] = [];
    page.on("download", (download) =>
      downloads.push(download.suggestedFilename()),
    );
    await page.route("**/api/capiro/planner.time.export?*", async (route) => {
      const index = ++reads;
      await (index === 1 ? oldHeld : newHeld);
      try {
        await route.fulfill({ json: emptyPage });
      } catch (cause) {
        if (!route.request().failure()) throw cause;
      } finally {
        if (index === 1) settleOld();
      }
    });
    await burst(dialog);
    try {
      await expect.poll(() => reads).toBe(1);
      const aborted = page.waitForEvent("requestfailed", {
        predicate: (request) => request.url().includes("/planner.time.export?"),
      });
      if (dismissal === "Escape") await page.keyboard.press("Escape");
      else
        await dialog
          .getByRole("button", { name: dismissal, exact: true })
          .click();
      await aborted;
      await expect(dialog).toHaveCount(0);
      await page
        .getByRole("button", { name: "Export time entries", exact: true })
        .click();
      const replacement = page.getByRole("dialog", {
        name: "Export time entries",
        exact: true,
      });
      await replacement
        .getByRole("button", { name: "Download CSV", exact: true })
        .click();
      await expect.poll(() => reads).toBe(2);
      releaseOld();
      await oldSettled;
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      expect(downloads).toEqual([]);
      await expect(
        replacement.getByLabel("From", { exact: true }),
      ).toBeDisabled();
      await expect(
        replacement.getByRole("button", { name: "Exporting…", exact: true }),
      ).toBeDisabled();
      const downloaded = page.waitForEvent("download");
      releaseNew();
      await downloaded;
      expect(downloads).toHaveLength(1);
      await expect(replacement).toHaveCount(0);
    } finally {
      releaseOld();
      releaseNew();
    }
  });
}
test("failed export exposes error and explicit retry produces a real CSV", async ({
  page,
}) => {
  const dialog = await openExport(page);
  let reads = 0;
  await page.route("**/api/capiro/planner.time.export?*", async (route) => {
    reads++;
    await route.fulfill(
      reads === 1
        ? { status: 503, json: { message: "Synthetic export unavailable" } }
        : { json: emptyPage },
    );
  });
  await dialog
    .getByRole("button", { name: "Download CSV", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Synthetic export unavailable",
  );
  await expect(dialog.getByLabel("From", { exact: true })).toBeEnabled();
  const downloaded = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Download CSV", exact: true })
    .click();
  await downloaded;
  await expect(dialog).toHaveCount(0);
  expect(reads).toBe(2);
});
test("timesheet week replacement retires export before any CSV output", async ({
  page,
}) => {
  const dialog = await openExport(page);
  let release!: () => void, settled!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const completed = new Promise<void>((resolve) => {
    settled = resolve;
  });
  let dispatched!: () => void;
  const entered = new Promise<void>((resolve) => {
    dispatched = resolve;
  });
  const downloads: string[] = [];
  page.on("download", (download) =>
    downloads.push(download.suggestedFilename()),
  );
  await page.route("**/api/capiro/planner.time.export?*", async (route) => {
    dispatched();
    await held;
    try {
      await route.fulfill({ json: emptyPage });
    } catch (cause) {
      if (!route.request().failure()) throw cause;
    } finally {
      settled();
    }
  });
  await dialog
    .getByRole("button", { name: "Download CSV", exact: true })
    .click();
  await entered;
  const aborted = page.waitForEvent("requestfailed", {
    predicate: (request) => request.url().includes("/planner.time.export?"),
  });
  await page
    .getByLabel("Week containing", { exact: true })
    .evaluate((input) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(input, "2026-10-12");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  try {
    await aborted;
  } finally {
    release();
  }
  await completed;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(downloads).toEqual([]);
  await expect(
    dialog.getByRole("button", { name: "Download CSV", exact: true }),
  ).toBeEnabled();
});
