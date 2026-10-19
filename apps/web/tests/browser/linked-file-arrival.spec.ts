import { test, expect, type Page } from "@playwright/test";
import { client, clientId, file, installFixtures, json } from "./fixtures";
import { holdResponse } from "./capability-boundary-fixtures";

const target = {
  ...file,
  fileName: "Linked activity report.pdf",
  lifecycleStatus: "ready",
  scanStatus: "clean",
  extractionStatus: "extracted",
  usable: true,
  blockedReason: undefined,
  previewUrl: "https://files.example.test/original?signature=synthetic",
  downloadUrl: "https://files.example.test/download?signature=synthetic",
};
const other = {
  ...target,
  id: "60000000-0000-4000-8000-000000000002",
  fileName: "Another current report.pdf",
};
const secondClientId = "10000000-0000-4000-8000-000000000002";
const path = `/linked-file-arrival.html?file=${target.id}`;
const unavailable = "This file is unavailable in the current list.";

async function installArrival(page: Page) {
  const unexpected = await installFixtures(page);
  const external: string[] = [];
  const renderErrors: string[] = [];
  page.on("pageerror", (error) => renderErrors.push(error.message));
  page.on("console", (message) => {
    if (
      /Cannot update a component|Too many re-renders|Maximum update depth/.test(
        message.text(),
      )
    )
      renderErrors.push(message.text());
  });
  await page.context().route("https://files.example.test/**", (route) => {
    external.push(route.request().url());
    return route.fulfill({ status: 200, body: "synthetic" });
  });
  await page.route("**/core/engagement/attachments?**", (route) => {
    const requested = new URL(route.request().url()).searchParams.get(
      "clientId",
    );
    return json(route, requested === clientId ? [other, target] : []);
  });
  await page.route(`**/core/clients/${secondClientId}`, (route) =>
    json(route, {
      ...client,
      id: secondClientId,
      name: "Second synthetic client",
    }),
  );
  await page.route(`**/core/clients/${clientId}/activity**`, (route) =>
    json(route, [
      {
        id: `attachment:${target.id}`,
        title: "Uploaded activity report",
        occurredAt: "2026-10-10T12:00:00Z",
        kind: "file",
        body: null,
        origin: "derived",
        sourceType: "attachment",
        sourceId: target.id,
        dueAt: null,
        settledAt: null,
        pinned: false,
      },
    ]),
  );
  return { unexpected, external, renderErrors };
}

function change(page: Page, event: string) {
  return page.evaluate(
    (name) => window.dispatchEvent(new Event(`linked-file-${name}`)),
    event,
  );
}
async function settled(page: Page) {
  await expect(
    page.getByLabel("Synthetic file arrival requests pending"),
  ).toHaveText("0");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
async function noSideEffects(
  page: Page,
  observed: Awaited<ReturnType<typeof installArrival>>,
) {
  await settled(page);
  expect(observed.unexpected).toEqual([]);
  expect(observed.external).toEqual([]);
  expect(observed.renderErrors).toEqual([]);
  expect(page.context().pages()).toHaveLength(1);
}

test("the genuine activity link selects its exact current attachment without an external action", async ({
  page,
}) => {
  const observed = await installArrival(page);
  await page.goto("/linked-file-arrival.html?activity");
  const link = page.getByRole("link", { name: "Open file ↗", exact: true });
  await expect(link).toHaveAttribute(
    "href",
    `/portfolio/${clientId}/files?file=${target.id}`,
  );
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    `/portfolio/${clientId}/files?file=${target.id}`,
  );
  const preview = page.getByRole("dialog", {
    name: target.fileName,
    exact: true,
  });
  await expect(preview).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: other.fileName, exact: true }),
  ).toHaveCount(0);
  await expect(
    preview.getByRole("link", { name: "Download", exact: true }),
  ).toBeVisible();
  await expect(preview.locator("iframe")).toHaveCount(0);
  await noSideEffects(page, observed);
});

for (const viewport of [
  { width: 1440, height: 1040 },
  { width: 390, height: 844 },
]) {
  test(`a direct arrival preserves preview keyboard and geometry at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    const observed = await installArrival(page);
    await page.setViewportSize(viewport);
    await page.goto(path.replace("60000000", "%360000000"));
    const preview = page.getByRole("dialog", {
      name: target.fileName,
      exact: true,
    });
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute("aria-modal", "true");
    expect(
      await preview.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
    const box = await preview.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({
      path: testInfo.outputPath(`linked-file-${viewport.width}.png`),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(preview).toHaveCount(0);
    await change(page, "files");
    await noSideEffects(page, observed);
    await expect(preview).toHaveCount(0);
    await page
      .getByRole("button", { name: `pdf ${other.fileName}`, exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: other.fileName, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(
      page.getByRole("button", { name: `pdf ${other.fileName}`, exact: true }),
    ).toBeFocused();
    await noSideEffects(page, observed);
  });
}

test("a missing exact target reports current-list unavailability without choosing another file or replaying", async ({
  page,
}, testInfo) => {
  const observed = await installArrival(page);
  let include = false;
  await page.route("**/core/engagement/attachments?**", (route) =>
    json(route, include ? [other, target] : [other]),
  );
  await page.goto(path);
  await expect(page.getByRole("status")).toContainText(unavailable);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("linked-file-unavailable.png"),
    fullPage: true,
  });
  include = true;
  await change(page, "files");
  await noSideEffects(page, observed);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: `pdf ${target.fileName}`, exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: target.fileName, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(unavailable, { exact: true })).toHaveCount(0);
});

test("a pending exact arrival waits for the authorized current list", async ({
  page,
}) => {
  const observed = await installArrival(page);
  const held = await holdResponse(
    page,
    "**/core/engagement/attachments?**",
    "GET",
    [other, target],
  );
  try {
    await page.goto(path);
    await held.started;
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("status")).toContainText("Loading");
  } finally {
    held.release();
  }
  await held.settled;
  await expect(
    page.getByRole("dialog", { name: target.fileName, exact: true }),
  ).toBeVisible();
  await noSideEffects(page, observed);
});

test("a new arrival waits for an in-flight refresh instead of opening a retained cached record", async ({
  page,
}) => {
  const observed = await installArrival(page);
  await page.goto("/linked-file-arrival.html");
  await expect(
    page.getByRole("button", { name: `pdf ${target.fileName}`, exact: true }),
  ).toBeVisible();
  const held = await holdResponse(
    page,
    "**/core/engagement/attachments?**",
    "GET",
    [other],
  );
  try {
    await change(page, "files");
    await held.started;
    await page.evaluate((href) => {
      history.pushState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, path);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: `pdf ${target.fileName}`, exact: true }),
    ).toBeVisible();
  } finally {
    held.release();
  }
  await held.settled;
  await expect(page.getByRole("status")).toContainText(unavailable);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await noSideEffects(page, observed);
});

for (const value of [
  "",
  `${target.id}&file=${other.id}`,
  encodeURIComponent("https://files.example.test/untrusted"),
]) {
  test(`an ambiguous or nonmatching file parameter never selects a different attachment: ${value || "empty"}`, async ({
    page,
  }) => {
    const observed = await installArrival(page);
    await page.goto(`/linked-file-arrival.html?file=${value}`);
    await expect(
      page.getByRole("button", { name: `pdf ${target.fileName}`, exact: true }),
    ).toBeVisible();
    await noSideEffects(page, observed);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

for (const transition of ["actor", "tenant", "client", "revoke"] as const) {
  test(`a held arrival cannot transfer to a changed ${transition} and reopen for its replacement`, async ({
    page,
  }) => {
    const observed = await installArrival(page);
    const held = await holdResponse(
      page,
      "**/core/engagement/attachments?**",
      "GET",
      [target],
    );
    if (transition === "client")
      await page.route(
        `**/core/engagement/attachments?clientId=${secondClientId}`,
        (route) => json(route, [{ ...target, clientId: secondClientId }]),
      );
    try {
      await page.goto(path);
      await held.started;
      await change(page, transition);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      if (transition === "revoke") await change(page, "restore");
    } finally {
      held.release();
    }
    await held.settled;
    await noSideEffects(page, observed);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

test("a displayed arrival closes on reader replacement and stays closed when same-ID data returns", async ({
  page,
}) => {
  const observed = await installArrival(page);
  await page.goto(path);
  const preview = page.getByRole("dialog", {
    name: target.fileName,
    exact: true,
  });
  await expect(preview).toBeVisible();
  const held = await holdResponse(
    page,
    "**/core/engagement/attachments?**",
    "GET",
    [target],
  );
  try {
    await change(page, "actor");
    await held.started;
    await expect(preview).toHaveCount(0);
    await expect(page.getByText(target.fileName, { exact: true })).toHaveCount(
      0,
    );
  } finally {
    held.release();
  }
  await held.settled;
  await expect(
    page.getByRole("button", { name: `pdf ${target.fileName}`, exact: true }),
  ).toBeVisible();
  await expect(preview).toHaveCount(0);
  await noSideEffects(page, observed);
});

test("failed refresh consumes the arrival while preserving the canonical error and manual retry", async ({
  page,
}) => {
  const observed = await installArrival(page);
  let denied = false;
  await page.route("**/core/engagement/attachments?**", (route) =>
    denied
      ? json(route, { message: "Synthetic list refusal" }, 403)
      : json(route, [target]),
  );
  await page.goto(path);
  const preview = page.getByRole("dialog", {
    name: target.fileName,
    exact: true,
  });
  await expect(preview).toBeVisible();
  denied = true;
  await change(page, "files");
  await expect(page.getByRole("alert")).toContainText("permission");
  await expect(preview).toHaveCount(0);
  await expect(page.getByText(target.fileName, { exact: true })).toHaveCount(0);
  denied = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("button", { name: `pdf ${target.fileName}`, exact: true }),
  ).toBeVisible();
  await expect(preview).toHaveCount(0);
  await noSideEffects(page, observed);
});

test("an open arrival follows current native readiness without replay or automatic extraction", async ({
  page,
}) => {
  const observed = await installArrival(page);
  let quarantined = false;
  await page.route("**/core/engagement/attachments?**", (route) =>
    json(route, [
      quarantined ? { ...file, fileName: target.fileName } : target,
    ]),
  );
  await page.goto(path);
  const preview = page.getByRole("dialog", {
    name: target.fileName,
    exact: true,
  });
  await expect(preview).toBeVisible();
  await change(page, "files");
  await noSideEffects(page, observed);
  await expect(preview).toBeVisible();
  quarantined = true;
  await change(page, "files");
  await expect(preview).toContainText("scan_pending");
  await expect(
    preview.getByRole("link", { name: "Download", exact: true }),
  ).toHaveCount(0);
  await expect(
    preview.getByRole("button", { name: "Read extracted text", exact: true }),
  ).toBeDisabled();
  await noSideEffects(page, observed);
});
