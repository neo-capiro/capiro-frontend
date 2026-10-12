import { test, expect, type Page } from "@playwright/test";
import { installFixtures, json, prospect, clientId } from "./fixtures";

const listPath = "/portfolio/prospects";
const catalog = {
  version: "portfolio-3.1",
  createStage: "identified",
  legacyMapping: "pending",
  allowLegacyTransitions: false,
  stages: [
    "identified",
    "initiated",
    "engaged",
    "proposal",
    "negotiation",
    "closed_won",
    "closed_lost",
  ].map((value) => ({ value, label: value })),
};

async function setup(page: Page) {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
  const unexpected = await installFixtures(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.setFixedTime(new Date("2026-10-12T12:00:00Z"));
  await page.route("**/business-development/prospect-stages", (route) =>
    json(route, catalog),
  );
  let status = 200;
  let record = { ...prospect };
  let reads = 0;
  let held: Promise<void> | undefined;
  let release!: () => void;
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/backend/") && request.method() !== "GET")
      writes.push(request.method());
  });
  await page.route(
    "**/api/backend/core/business-development/prospects?*",
    async (route) => {
      reads++;
      if (held) await held;
      return status === 200
        ? json(route, {
            prospects: [record],
            counts: {
              visible: 1,
              total: 1,
              active: 1,
              dismissed: 0,
              byStage: { proposal: 1 },
            },
          })
        : json(
            route,
            { message: "Synthetic current prospect read failed" },
            status,
          );
    },
  );
  return {
    unexpected,
    errors,
    writes,
    reads: () => reads,
    fail: (code: number) => {
      status = code;
    },
    recover: () => {
      status = 200;
      record = {
        ...prospect,
        displayName: "Recovered prospect",
        nextAction: "Current next action",
      };
      held = new Promise<void>((resolve) => {
        release = resolve;
      });
      return () => {
        held = undefined;
        release();
      };
    },
  };
}

async function replaceRoute(page: Page, path: string) {
  await page.evaluate((next) => {
    history.pushState({}, "", next);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

async function expectUnavailable(page: Page, status: number) {
  await expect(
    page.getByRole("alert").filter({
      hasText:
        status === 403
          ? "You do not have permission"
          : "Synthetic current prospect read failed",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Test Prospect|Recovered prospect/ }),
  ).toHaveCount(0);
  await expect(page.getByText("Review proposal", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("heading", { name: "Prospects", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Stage totals")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Pipeline", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "+ Add prospect", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function recover(page: Page, control: Awaited<ReturnType<typeof setup>>) {
  const release = control.recover();
  const reads = control.reads();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(control.reads).toBeGreaterThan(reads);
  await expect(
    page.getByRole("link", { name: /Test Prospect|Recovered prospect/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Pipeline", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "+ Add prospect", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  release();
  await expect(
    page.getByRole("link", { name: /Recovered prospect/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pipeline", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "+ Add prospect", exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(control.writes).toEqual([]);
  expect(control.unexpected).toEqual([]);
  expect(control.errors).toEqual([]);
}

for (const status of [403, 503]) {
  test(`a ${status} current read on remount withholds cached records until a successful retry`, async ({
    page,
  }, info) => {
    const control = await setup(page);
    await page.goto(listPath);
    await page.getByRole("link", { name: /Test Prospect/ }).click();
    await expect(
      page.getByRole("heading", { name: "Test Prospect", exact: true }),
    ).toBeVisible();
    control.fail(status);
    await page.clock.setFixedTime(new Date("2026-10-12T12:00:31Z"));
    await page.getByRole("link", { name: "← Prospects", exact: true }).click();
    await expectUnavailable(page, status);
    await page.screenshot({
      path: info.outputPath(`current-read-${status}.png`),
    });
    await recover(page, control);
  });

  test(`a ${status} failed cached filter read cannot expose its earlier list or pipeline`, async ({
    page,
  }) => {
    const control = await setup(page);
    await page.goto(listPath);
    await expect(
      page.getByRole("link", { name: /Test Prospect/ }),
    ).toBeVisible();
    await page.getByLabel("Search prospects").fill("Synthetic");
    await expect.poll(control.reads).toBe(2);
    await expect(
      page.getByRole("link", { name: /Test Prospect/ }),
    ).toBeVisible();
    control.fail(status);
    await page.clock.setFixedTime(new Date("2026-10-12T12:00:31Z"));
    await page.getByLabel("Search prospects").fill("");
    await expectUnavailable(page, status);
    await recover(page, control);
  });

  test(`returning from a ${status} filtered failure requires a new read even when the earlier filter cache is fresh`, async ({
    page,
  }) => {
    const control = await setup(page);
    await page.goto(listPath);
    await expect(
      page.getByRole("link", { name: /Test Prospect/ }),
    ).toBeVisible();
    control.fail(status);
    await page.getByLabel("Search prospects").fill("Denied filter");
    await expectUnavailable(page, status);
    const release = control.recover();
    const reads = control.reads();
    await page.getByLabel("Search prospects").fill("");
    await expect(page.getByRole("link", { name: /Test Prospect/ })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Pipeline", exact: true }),
    ).toBeDisabled();
    await expect.poll(control.reads).toBeGreaterThan(reads);
    release();
    await expect(
      page.getByRole("link", { name: /Recovered prospect/ }),
    ).toBeVisible();
    expect(control.writes).toEqual([]);
    expect(control.errors).toEqual([]);
  });

  for (const overlay of ["pipeline", "create"] as const)
    test(`a ${status} current read failure discards the open ${overlay} editor`, async ({
      page,
    }) => {
      const control = await setup(page);
      await page.goto(listPath);
      await expect(
        page.getByRole("link", { name: /Test Prospect/ }),
      ).toBeVisible();
      if (overlay === "pipeline") {
        await page
          .getByRole("button", { name: "Pipeline", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Change stage", exact: true })
          .click();
        await page.getByLabel("New stage").selectOption("closed_won");
      } else {
        await page
          .getByRole("button", { name: "+ Add prospect", exact: true })
          .click();
        await page.getByLabel("Company name").fill("Discard this stale editor");
      }
      control.fail(status);
      await page.clock.setFixedTime(new Date("2026-10-12T12:00:31Z"));
      await page.evaluate(() => dispatchEvent(new Event("offline")));
      await page.evaluate(() => dispatchEvent(new Event("online")));
      await expectUnavailable(page, status);
      await expect(page).not.toHaveURL(/[?&](pipeline|new)=/);
      await recover(page, control);
      if (overlay === "pipeline") {
        await page
          .getByRole("button", { name: "Pipeline", exact: true })
          .click();
        await expect(
          page.getByRole("dialog", { name: "Change prospect stage" }),
        ).toHaveCount(0);
        await page
          .getByRole("button", { name: "Change stage", exact: true })
          .click();
        await expect(page.getByLabel("New stage")).toHaveValue("proposal");
      } else {
        await page
          .getByRole("button", { name: "+ Add prospect", exact: true })
          .click();
        await expect(page.getByLabel("Company name")).toHaveValue("");
      }
      expect(control.writes).toEqual([]);
    });
}

test("client route replacement discards a failed Prospects editor and requires a current successful read on return", async ({
  page,
}) => {
  const control = await setup(page);
  await page.goto(`${listPath}?new=1`);
  await page.getByLabel("Company name").fill("Former view private input");
  await replaceRoute(page, `/portfolio/${clientId}/relationships`);
  await expect(page.getByRole("dialog", { name: "Add prospect" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("link", {
      name: "Test Aerospace",
      exact: true,
    }),
  ).toBeVisible();
  control.fail(403);
  await page.clock.setFixedTime(new Date("2026-10-12T12:00:31Z"));
  await replaceRoute(page, `${listPath}?new=1`);
  await expectUnavailable(page, 403);
  await recover(page, control);
  await page
    .getByRole("button", { name: "+ Add prospect", exact: true })
    .click();
  await expect(page.getByLabel("Company name")).toHaveValue("");
});

test("a successful background reread preserves an active creation draft", async ({
  page,
}) => {
  const control = await setup(page);
  await page.goto(`${listPath}?new=1`);
  await page.getByLabel("Company name").fill("Keep this current draft");
  const release = control.recover();
  await page.clock.setFixedTime(new Date("2026-10-12T12:00:31Z"));
  await page.evaluate(() => dispatchEvent(new Event("offline")));
  await page.evaluate(() => dispatchEvent(new Event("online")));
  await expect.poll(control.reads).toBe(2);
  await expect(page.getByLabel("Company name")).toHaveValue(
    "Keep this current draft",
  );
  release();
  await page
    .getByRole("dialog", { name: "Add prospect" })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: /Recovered prospect/ }),
  ).toBeVisible();
  expect(control.writes).toEqual([]);
  expect(control.errors).toEqual([]);
});
