import { createHash } from "node:crypto";
import { test, expect, type Page, type Route } from "@playwright/test";
import {
  installFixtures,
  json,
  prospect,
  prospectId,
  clientId,
} from "./fixtures";
import type { ProspectFileCopyCommand } from "../../src/features/portfolio/files/upload-copy/contracts";
const id = (n: number) =>
  `90000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = { tenantId: id(1), userId: id(2) };
const timestamp = "2026-10-25T01:00:00.123Z";
const file = {
  id: id(10),
  tenantId: actor.tenantId,
  prospectId,
  clientId: null,
  meetingId: null,
  mailMessageId: null,
  fileName: "Synthetic confidential upload.txt",
  contentType: "text/plain",
  byteSize: 12,
  source: "manual",
  folder: null,
  metadataRevision: 3,
  viewerMode: "restricted",
  viewerUserIds: [],
  uploadedByUserId: actor.userId,
  createdAt: timestamp,
  lifecycleStatus: "ready",
  scanStatus: "clean",
  extractionStatus: null,
  indexedAt: null,
  usable: true,
  s3Key: "synthetic/upload",
  checksumSha256: "a".repeat(64),
  calculatedSha256: "a".repeat(64),
};
const current = {
  ...prospect,
  convertedAt: timestamp,
  linkedClientId: clientId,
  updatedAt: timestamp,
};
const copyPath = "**/api/backend/core/engagement/attachments/prospect-copies";
const identity = {
  user: { id: actor.userId, email: null, clerkUserId: "user_synthetic_copy" },
  tenant: { id: actor.tenantId, name: "Synthetic firm" },
  role: "user_admin",
};
function receipt(
  command: ProspectFileCopyCommand,
  status: "pending" | "completed" = "completed",
  available = true,
) {
  return {
    schemaVersion: 1,
    operation: "copy_prospect_upload",
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    requestId: command.requestId,
    prospectId,
    clientId,
    payloadDigest: createHash("sha256")
      .update(
        JSON.stringify([
          "prospect-file-copy",
          1,
          actor.tenantId,
          actor.userId,
          command,
        ]),
      )
      .digest("hex"),
    status,
    sourceId: command.sourceId,
    expectedRevision: command.expectedRevision,
    destinationId: id(40),
    createdAt: timestamp,
    completedAt: status === "completed" ? timestamp : null,
    available: status === "completed" && available,
    result:
      status === "completed"
        ? {
            id: id(40),
            fileName: file.fileName,
            folder: command.folder,
            revision: 0,
            lifecycleStatus: "ready",
            scanStatus: "clean",
          }
        : null,
  };
}
async function setup(page: Page, baseURL: string | undefined) {
  if (!baseURL) throw new Error("Isolated origin required");
  const origin = new URL(baseURL).origin;
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
  const unexpected = await installFixtures(page),
    errors: string[] = [],
    writes: { path: string; method: string; body: unknown }[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/api/") && request.method() !== "GET")
      writes.push({
        path: new URL(request.url()).pathname,
        method: request.method(),
        body: request.postDataJSON(),
      });
  });
  await page.route("**/api/backend/core/me", (route) => json(route, identity));
  await page.route(`**/business-development/prospects/${prospectId}`, (route) =>
    json(route, current),
  );
  await page.route("**/engagement/attachments?prospectId=*", (route) =>
    json(route, [file]),
  );
  await page.route("**/api/capiro/me.read*", (route) => json(route, identity));
  let create: (route: Route) => Promise<void> = (route) =>
    json(route, { message: "Unexpected copy" }, 500);
  let read: (route: Route) => Promise<void> = (route) =>
    json(route, { message: "Unavailable" }, 404);
  await page.route(copyPath, (route) => create(route));
  await page.route(`${copyPath}/*`, (route) => read(route));
  return {
    writes,
    unexpected,
    errors,
    onCreate: (handler: typeof create) => {
      create = handler;
    },
    onRead: (handler: typeof read) => {
      read = handler;
    },
    clean: () => {
      expect(unexpected).toEqual([]);
      expect(errors).toEqual([]);
      expect(
        writes.every(
          (row) =>
            row.path ===
              "/api/backend/core/engagement/attachments/prospect-copies" &&
            row.method === "POST",
        ),
      ).toBe(true);
    },
  };
}
async function review(page: Page) {
  await page.goto(`/portfolio/prospects/${prospectId}`);
  await page
    .getByLabel("Upload to copy", { exact: true })
    .selectOption(file.id);
  await page
    .getByRole("button", { name: "Review private client copy", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Review private client file copy",
    exact: true,
  });
  await expect(
    dialog.getByLabel("Destination folder (optional)"),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Copy reviewed upload privately" }),
  ).toBeDisabled();
  await dialog.getByLabel("Destination folder (optional)").fill("Private");
  await dialog
    .getByRole("checkbox", { name: /I reviewed this upload/ })
    .check();
  return dialog;
}
const recovery = (page: Page) =>
  page.getByRole("dialog", {
    name: "Recover private client file copy",
    exact: true,
  });
test("reviewed upload lost ACK survives reload; completed unavailable history never recreates the copy", async ({
  page,
  baseURL,
}) => {
  const f = await setup(page, baseURL);
  let saved: ProspectFileCopyCommand | undefined;
  f.onCreate(async (route) => {
    saved = route.request().postDataJSON();
    await route.abort("connectionreset");
  });
  f.onRead((route) => json(route, receipt(saved!, "completed", false)));
  const dialog = await review(page);
  expect(f.writes).toHaveLength(0);
  await dialog
    .getByRole("button", { name: "Copy reviewed upload privately" })
    .click();
  await expect(
    recovery(page).getByRole("button", { name: "Check original file copy" }),
  ).toBeEnabled();
  expect(f.writes).toHaveLength(1);
  await page.reload();
  await page
    .getByRole("button", {
      name: "Recover private client file copy",
      exact: true,
    })
    .click();
  await recovery(page)
    .getByRole("button", { name: "Check original file copy" })
    .click();
  await expect(recovery(page)).toContainText("will not recreate it");
  expect(f.writes).toHaveLength(1);
  await expect(
    recovery(page).getByRole("button", {
      name: "Retry the same reviewed file copy",
    }),
  ).toHaveCount(0);
  await recovery(page)
    .getByRole("button", { name: "Acknowledge copy result" })
    .click();
  await expect(recovery(page)).toHaveCount(0);
  expect(f.writes).toHaveLength(1);
  f.clean();
});
test("pending copy requires explicit same-command retry and displays honest scan status", async ({
  page,
  baseURL,
}) => {
  const f = await setup(page, baseURL);
  let saved: ProspectFileCopyCommand | undefined,
    posts = 0;
  f.onCreate((route) => {
    const body = route.request().postDataJSON();
    if (saved) expect(body).toEqual(saved);
    saved = body;
    return json(route, receipt(body, ++posts === 1 ? "pending" : "completed"));
  });
  f.onRead((route) => json(route, receipt(saved!, "pending")));
  const dialog = await review(page);
  await dialog
    .getByRole("button", { name: "Copy reviewed upload privately" })
    .click();
  await expect(recovery(page)).toContainText("original copy is pending");
  expect(posts).toBe(1);
  await recovery(page)
    .getByRole("button", { name: "Check original file copy" })
    .click();
  await expect(
    recovery(page).getByRole("button", {
      name: "Retry the same reviewed file copy",
    }),
  ).toBeEnabled();
  expect(posts).toBe(1);
  await recovery(page)
    .getByRole("button", { name: "Retry the same reviewed file copy" })
    .click();
  await expect(recovery(page)).toContainText("Scan: clean");
  expect(posts).toBe(2);
  f.clean();
});
test("late receipt404 hides installed private details and keeps encrypted recovery through reload", async ({
  page,
  baseURL,
}) => {
  const f = await setup(page, baseURL);
  let saved: ProspectFileCopyCommand | undefined;
  f.onCreate((route) => {
    saved = route.request().postDataJSON();
    return json(route, receipt(saved!, "pending"));
  });
  const dialog = await review(page);
  await dialog
    .getByRole("button", { name: "Copy reviewed upload privately" })
    .click();
  await expect(recovery(page)).toContainText(file.fileName);
  await recovery(page)
    .getByRole("button", { name: "Check original file copy" })
    .click();
  // Blocking recovery removes the private record and switches to the review title.
  const blocked = page.getByRole("dialog", {
    name: "Review private client file copy",
    exact: true,
  });
  await expect(blocked.getByRole("alert")).toBeVisible();
  await expect(blocked.getByText(file.fileName, { exact: true })).toHaveCount(
    0,
  );
  await expect(
    blocked.getByRole("button", {
      name: "Retry the same reviewed file copy",
    }),
  ).toHaveCount(0);
  await page.reload();
  f.onRead((route) => json(route, receipt(saved!, "completed", false)));
  await page
    .getByRole("button", {
      name: "Recover private client file copy",
      exact: true,
    })
    .click();
  await recovery(page)
    .getByRole("button", { name: "Check original file copy" })
    .click();
  await expect(recovery(page)).toContainText("will not recreate it");
  expect(f.writes).toHaveLength(1);
  f.clean();
});
