import { test, expect, type Page } from "@playwright/test";
import { installFixtures, json, prospect, prospectId } from "./fixtures";
import {
  actor,
  attachment,
  checksum,
  otherId,
} from "../prospect-resources-fixtures";
import type { ProspectAttachment } from "../../src/features/portfolio/files/prospect-files";

const ready: ProspectAttachment = {
  ...attachment,
  viewerMode: "all",
  prospectId,
  fileName: "Agency Brief.PDF",
  usable: true,
  previewUrl: "https://files.example.test/agency-preview?signature=synthetic",
  downloadUrl: "https://files.example.test/agency-download?signature=synthetic",
};
const pending: ProspectAttachment = {
  ...attachment,
  viewerMode: "all",
  id: otherId,
  prospectId,
  fileName: "Budget Notes.txt",
  usable: false,
  blockedReason: "Pending content checks",
  previewUrl: "https://files.example.test/pending-preview",
};
const files = (page: Page) =>
  page.getByRole("region", { name: "Prospect files", exact: true });
const crossPortRequests = new WeakMap<Page, string[]>();
test.afterEach(async ({ page }) => {
  expect(crossPortRequests.get(page) ?? []).toEqual([]);
});
async function openFiles(page: Page) {
  const port = new URL(test.info().project.use.baseURL!).port;
  const blocked: string[] = [];
  crossPortRequests.set(page, blocked);
  await page.route(
    (url) =>
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      url.port !== port,
    (route) => {
      blocked.push(route.request().url());
      return route.abort("blockedbyclient");
    },
  );
  await page.goto(`/portfolio/prospects/${prospectId}`);
}
function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
async function setup(
  page: Page,
  initial: ProspectAttachment[] = [ready, pending],
) {
  const unexpected = await installFixtures(page);
  await page.clock.setFixedTime(new Date("2026-10-12T12:00:00Z"));
  const state = {
    records: initial,
    member: { ...actor },
    status: 200,
    listGate: undefined as ReturnType<typeof deferred> | undefined,
    identityGate: undefined as ReturnType<typeof deferred> | undefined,
    reads: [] as string[],
    writes: [] as string[],
  };
  page.on("request", (request) => {
    if (request.url().includes("/api/backend/") && request.method() !== "GET")
      state.writes.push(request.url());
  });
  await page.route("**/api/backend/core/me", async (route) => {
    await state.identityGate?.promise;
    await json(route, {
      user: { id: state.member.userId, email: "synthetic@example.test" },
      tenant: { id: state.member.tenantId, name: "Synthetic firm" },
      role: "user_admin",
    });
  });
  await page.route(
    "**/api/backend/core/engagement/attachments?prospectId=*",
    async (route) => {
      state.reads.push(route.request().url());
      await state.listGate?.promise;
      await json(
        route,
        state.status === 200
          ? state.records
          : { error: "Current files unavailable" },
        state.status,
      );
    },
  );
  return { state, unexpected };
}

test("loaded file search filters case-insensitively, trims and clears without requests or changing readiness", async ({
  page,
}, testInfo) => {
  const { state, unexpected } = await setup(page);
  await openFiles(page);
  const area = files(page);
  await expect(area.getByText(ready.fileName, { exact: true })).toBeVisible();
  const search = area.getByRole("searchbox", { name: "Search files" });
  await expect(search).toBeVisible();
  const reads = state.reads.length;
  await search.fill("  aGeNcY  ");
  await expect(area.locator("li strong")).toHaveText([ready.fileName]);
  await expect(
    area.getByRole("link", { name: `Preview ${ready.fileName}` }),
  ).toHaveAttribute("href", ready.previewUrl!);
  await expect(
    area.getByRole("link", { name: `Download ${ready.fileName}` }),
  ).toHaveAttribute("href", ready.downloadUrl!);
  await area.getByRole("button", { name: "Clear file search" }).click();
  await expect(search).toHaveValue("");
  await expect(area.locator("li strong")).toHaveText([
    ready.fileName,
    pending.fileName,
  ]);
  await search.fill("notes");
  await expect(area.locator("li strong")).toHaveText([pending.fileName]);
  await expect(area.getByText(/Pending content checks/)).toBeVisible();
  await expect(
    area.getByRole("link", { name: /Preview|Download/ }),
  ).toHaveCount(0);
  await area.screenshot({ path: testInfo.outputPath("search-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(search).toBeVisible();
  await area.screenshot({ path: testInfo.outputPath("search-mobile.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(state.reads).toHaveLength(reads);
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

for (const empty of [false, true])
  test(`search distinguishes ${empty ? "a true empty list" : "no matching files"}`, async ({
    page,
  }) => {
    const { state } = await setup(page, empty ? [] : [ready, pending]);
    await openFiles(page);
    const area = files(page);
    const search = area.getByRole("searchbox", { name: "Search files" });
    await expect(search).toBeEnabled();
    await search.fill("unmatched filename");
    await expect(
      area.getByText(
        empty
          ? "No files are available for this prospect."
          : "No files match your search.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      area.getByText(
        empty
          ? "No files match your search."
          : "No files are available for this prospect.",
        { exact: true },
      ),
    ).toHaveCount(0);
    await expect(area.getByLabel("Upload prospect file")).toBeEnabled();
    await area.getByRole("button", { name: "Clear file search" }).click();
    await expect(area.locator("li strong")).toHaveCount(empty ? 0 : 2);
    expect(state.writes).toEqual([]);
  });

for (const status of [403, 503])
  test(`a ${status} current file read conceals filtered results until successful recovery`, async ({
    page,
  }) => {
    const { state } = await setup(page);
    await openFiles(page);
    const area = files(page);
    const search = area.getByRole("searchbox", { name: "Search files" });
    await search.fill("agency");
    await expect(area.locator("li strong")).toHaveText([ready.fileName]);
    state.status = status;
    state.listGate = deferred();
    await area.getByRole("button", { name: "Refresh files" }).click();
    await expect(search).toBeDisabled();
    await expect(area.locator("li")).toHaveCount(0);
    state.listGate.release();
    await expect(area.getByRole("alert")).toBeVisible();
    await expect(
      area.getByRole("link", { name: /Preview|Download/ }),
    ).toHaveCount(0);
    await expect(area.getByText(/No files (match|are available)/)).toHaveCount(
      0,
    );
    state.status = 200;
    state.records = [{ ...pending, fileName: "Agency revision.txt" }];
    state.listGate = deferred();
    await area.getByRole("button", { name: "Refresh files" }).click();
    await expect(search).toBeDisabled();
    await expect(area.locator("li")).toHaveCount(0);
    state.listGate.release();
    await expect(search).toBeEnabled();
    await expect(area.locator("li strong")).toHaveText(["Agency revision.txt"]);
    expect(state.writes).toEqual([]);
  });

for (const key of ["userId", "tenantId"] as const)
  test(`${key} replacement discards the prior file search and results`, async ({
    page,
  }) => {
    const { state } = await setup(page);
    await openFiles(page);
    const area = files(page);
    const search = area.getByRole("searchbox", { name: "Search files" });
    await search.fill("agency");
    await expect(area.locator("li strong")).toHaveText([ready.fileName]);
    state.member[key] = otherId;
    state.records = [
      {
        ...pending,
        tenantId: state.member.tenantId,
        fileName: "Replacement member file.txt",
      },
    ];
    state.identityGate = deferred();
    await page.clock.setFixedTime(new Date("2026-10-12T12:00:31Z"));
    await page.evaluate(() => dispatchEvent(new Event("offline")));
    await page.evaluate(() => dispatchEvent(new Event("online")));
    await expect(
      area.getByText(/require current prospect access/),
    ).toBeVisible();
    await expect(area.locator("li")).toHaveCount(0);
    state.identityGate.release();
    await expect(search).toBeEnabled();
    await expect(search).toHaveValue("");
    await expect(area.locator("li strong")).toHaveText([
      "Replacement member file.txt",
    ]);
    expect(state.writes).toEqual([]);
  });

test("prospect route replacement starts with a clear search and only the new current collection", async ({
  page,
}) => {
  const { state } = await setup(page);
  await openFiles(page);
  const area = files(page);
  await area.getByRole("searchbox", { name: "Search files" }).fill("agency");
  await page.route(
    `**/api/backend/core/business-development/prospects/${otherId}`,
    (route) =>
      json(route, {
        ...prospect,
        id: otherId,
        displayName: "Replacement Prospect",
      }),
  );
  await page.route(
    `**/api/backend/core/business-development/prospects/${otherId}/**`,
    (route) => json(route, []),
  );
  state.records = [{ ...pending, prospectId: otherId }];
  state.listGate = deferred();
  await page.evaluate((path) => {
    history.pushState({}, "", path);
    dispatchEvent(new PopStateEvent("popstate"));
  }, `/portfolio/prospects/${otherId}`);
  await expect(
    page.getByRole("heading", { name: "Replacement Prospect", exact: true }),
  ).toBeVisible();
  await expect(area.locator("li")).toHaveCount(0);
  state.listGate.release();
  const search = area.getByRole("searchbox", { name: "Search files" });
  await expect(search).toBeEnabled();
  await expect(search).toHaveValue("");
  await expect(area.locator("li strong")).toHaveText([pending.fileName]);
  expect(state.reads.at(-1)).toContain(`prospectId=${otherId}`);
  expect(state.writes).toEqual([]);
});

test("search cannot expose a mixed-lineage collection", async ({ page }) => {
  const { state } = await setup(page, [{ ...ready, prospectId: otherId }]);
  await openFiles(page);
  const area = files(page);
  await expect(area.getByRole("alert")).toBeVisible();
  await expect(
    area.getByRole("searchbox", { name: "Search files" }),
  ).toBeDisabled();
  await expect(area.locator("li")).toHaveCount(0);
  await expect(area.getByRole("link")).toHaveCount(0);
  await expect(area.getByText(/No files (match|are available)/)).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

test("filtering retains selected upload bytes and original upload readiness and open actions", async ({
  page,
}) => {
  const { state } = await setup(page);
  let storagePosts = 0;
  const uploaded: ProspectAttachment = {
    ...attachment,
    viewerMode: "all",
    prospectId,
    fileName: "test.txt",
    usable: false,
  };
  await page.route("**/engagement/attachments/upload-url", (route) => {
    const body = route.request().postDataJSON();
    return json(route, {
      url: "https://storage.example.test/upload",
      s3Key: uploaded.s3Key,
      uploadIntentId: otherId,
      requestId: body.requestId,
      expiresAt: "2099-10-12T12:00:00Z",
      fields: {
        key: uploaded.s3Key,
        "Content-Type": "text/plain",
        "x-amz-checksum-algorithm": "SHA256",
        "x-amz-checksum-sha256": Buffer.from(checksum, "hex").toString(
          "base64",
        ),
      },
    });
  });
  await page.route("https://storage.example.test/upload", (route) => {
    storagePosts++;
    return route.fulfill({ status: 204 });
  });
  await page.route("**/engagement/attachments/confirm", (route) => {
    state.records = [uploaded];
    return json(route, uploaded);
  });
  await openFiles(page);
  const area = files(page);
  await area.getByLabel("Upload prospect file").setInputFiles({
    name: "test.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("hello"),
  });
  const search = area.getByRole("searchbox", { name: "Search files" });
  await search.fill("agency");
  await expect(
    area.getByRole("link", { name: `Preview ${ready.fileName}` }),
  ).toHaveAttribute("href", ready.previewUrl!);
  await area.getByRole("button", { name: "Upload file", exact: true }).click();
  await expect(area.getByText(/test.txt uploaded/)).toBeVisible();
  await expect(area.getByText("No files match your search.")).toBeVisible();
  await area.getByRole("button", { name: "Clear file search" }).click();
  await expect(area.locator("li strong")).toHaveText([uploaded.fileName]);
  await expect(
    area.getByRole("link", { name: /Preview|Download/ }),
  ).toHaveCount(0);
  expect(storagePosts).toBe(1);
  expect(state.writes).toHaveLength(2);
});
