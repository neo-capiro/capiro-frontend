import { test, expect, type Page } from "@playwright/test";
import { installFixtures, prospectId, json, prospect } from "./fixtures";
import {
  actor,
  attachment,
  checksum,
  otherId,
} from "../prospect-resources-fixtures";
const record = {
  ...attachment,
  prospectId,
  usable: false,
  blockedReason: "Pending content checks",
};
async function setup(page: Page) {
  const unexpected = await installFixtures(page);
  const writes: { url: string; body: unknown }[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/backend/") && request.method() !== "GET")
      writes.push({
        url: request.url(),
        body: request.postData() ? request.postDataJSON() : null,
      });
  });
  await page.route("**/api/backend/core/me", (route) =>
    json(route, {
      user: { id: actor.userId, email: "synthetic@example.test" },
      tenant: { id: actor.tenantId, name: "Synthetic firm" },
      role: "user_admin",
    }),
  );
  await page.route(
    "**/api/backend/core/engagement/attachments?prospectId=*",
    (route) => json(route, [record]),
  );
  return { writes, unexpected };
}
const files = (page: Page) =>
  page.getByRole("region", { name: "Prospect files", exact: true });
test("current prospect files retain readiness and do not expose unsupported actions", async ({
  page,
}) => {
  const { writes, unexpected } = await setup(page);
  await page.goto(`/portfolio/prospects/${prospectId}`);
  const area = files(page);
  await expect(area.getByText(record.fileName, { exact: true })).toBeVisible();
  await expect(area.getByText(/Pending content checks/)).toBeVisible();
  await expect(
    area.getByRole("link", { name: /Preview|Download/ }),
  ).toHaveCount(0);
  for (const name of [
    "Sharing unavailable",
    "Sending unavailable",
    "Text import unavailable",
  ])
    await expect(area.getByRole("button", { name })).toBeDisabled();
  await expect(
    page.getByRole("link", { name: "Open prospect Workspace" }),
  ).toHaveAttribute("href", `/modules/workspace?prospectId=${prospectId}`);
  expect(writes).toEqual([]);
  expect(unexpected).toEqual([]);
});
test("upload loss retains one exact intent and confirms without reuploading bytes", async ({
  page,
}) => {
  const { writes } = await setup(page);
  let storagePosts = 0,
    confirms = 0;
  await page.route("**/engagement/attachments/upload-url", (route) => {
    const body = route.request().postDataJSON();
    return json(route, {
      url: "https://storage.example.test/upload",
      s3Key: record.s3Key,
      uploadIntentId: otherId,
      requestId: body.requestId,
      expiresAt: "2099-10-12T12:00:00Z",
      fields: {
        key: record.s3Key,
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
  await page.route("**/engagement/attachments/confirm", (route) =>
    ++confirms === 1 ? route.abort("connectionreset") : json(route, record),
  );
  await page.goto(`/portfolio/prospects/${prospectId}`);
  const area = files(page);
  await expect(area.getByText(record.fileName, { exact: true })).toBeVisible();
  await area.getByLabel("Upload prospect file").setInputFiles({
    name: "test.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("hello"),
  });
  await area.getByRole("button", { name: "Upload file", exact: true }).click();
  await expect(
    area.getByRole("button", { name: "Recover original upload" }),
  ).toBeEnabled();
  await area.getByRole("button", { name: "Recover original upload" }).click();
  await expect(area.getByText(/test.txt uploaded/)).toBeVisible();
  expect(storagePosts).toBe(1);
  expect(confirms).toBe(2);
  expect(writes).toHaveLength(3);
  expect(writes[0]!.body).toEqual({
    prospectId,
    fileName: "test.txt",
    contentType: "text/plain",
    checksumSha256: checksum,
    requestId: expect.any(String),
    contentLength: 5,
  });
  expect(writes[1]!.body).toEqual(writes[2]!.body);
});
test("wrong lineage suppresses file links and upload without broadening the request", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.route(
    "**/api/backend/core/engagement/attachments?prospectId=*",
    (route) =>
      json(route, [
        {
          ...record,
          prospectId: otherId,
          usable: true,
          downloadUrl: "https://example.test/file",
        },
      ]),
  );
  await page.goto(`/portfolio/prospects/${prospectId}`);
  const area = files(page);
  await expect(area.getByRole("alert")).toBeVisible();
  await expect(area.getByRole("link")).toHaveCount(0);
  await expect(
    area.getByRole("button", { name: "Upload file", exact: true }),
  ).toBeDisabled();
  expect(writes).toEqual([]);
});
test("deletion requires confirmation and current list, with no uncertain automatic retry", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.route(`**/engagement/attachments/${record.id}`, (route) =>
    route.abort("connectionreset"),
  );
  await page.goto(`/portfolio/prospects/${prospectId}`);
  const area = files(page);
  await area.getByRole("button", { name: `Delete ${record.fileName}` }).click();
  expect(writes).toEqual([]);
  await page
    .getByRole("dialog", { name: "Delete prospect file?" })
    .getByRole("button", { name: "Confirm delete" })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Confirm delete" }),
  ).toBeDisabled();
  expect(writes).toHaveLength(1);
  await page.keyboard.press("Escape");
  await expect(
    area.getByRole("button", { name: `Delete ${record.fileName}` }),
  ).toBeDisabled();
  await area.getByRole("button", { name: "Refresh files" }).click();
  await expect(
    area.getByRole("button", { name: `Delete ${record.fileName}` }),
  ).toBeEnabled();
  expect(writes).toHaveLength(1);
});
test("dismissed prospect retains historical files but cannot upload, including on mobile", async ({
  page,
}) => {
  await setup(page);
  await page.route(`**/business-development/prospects/${prospectId}`, (route) =>
    json(route, { ...prospect, status: "dismissed" }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/portfolio/prospects/${prospectId}`);
  const area = files(page);
  await expect(area.getByText(record.fileName, { exact: true })).toBeVisible();
  await expect(area.getByLabel("Upload prospect file")).toHaveCount(0);
  await expect(
    area.getByRole("button", { name: "Upload file", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await area.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "work/prospect-files-mobile.png",
    fullPage: false,
  });
});
