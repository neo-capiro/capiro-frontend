import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { installFixtures, json, prospectId } from "./fixtures";
import { actor, attachment, checksum } from "../prospect-resources-fixtures";
test("uncertain prospect confirmation cannot become a fresh key and second byte upload after reload", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.route("**/api/backend/core/me", (route) =>
    json(route, {
      user: { id: actor.userId, email: "actor@example.test" },
      tenant: { id: actor.tenantId, name: "Synthetic firm" },
      role: "user_admin",
    }),
  );
  const records = new Map<string, typeof attachment>(),
    intents = new Map<string, string>(),
    posts: unknown[] = [];
  let bytePosts = 0,
    confirmPosts = 0;
  await page.route(
    "**/api/backend/core/engagement/attachments?prospectId=*",
    (route) =>
      json(
        route,
        [...records.values()].map((record) => ({
          ...record,
          usable: false,
          blockedReason: "Pending content checks",
        })),
      ),
  );
  await page.route("**/engagement/attachments/upload-url", (route) => {
    const body = route.request().postDataJSON();
    posts.push(body);
    if (!intents.has(body.requestId))
      intents.set(
        body.requestId,
        `tenants/synthetic/engagement/${body.requestId}/test.txt`,
      );
    const s3Key = intents.get(body.requestId)!;
    return json(route, {
      url: "https://storage.example.test/upload",
      s3Key,
      uploadIntentId: randomUUID(),
      requestId: body.requestId,
      expiresAt: "2099-10-12T12:00:00Z",
      fields: {
        key: s3Key,
        "Content-Type": "text/plain",
        "x-amz-checksum-algorithm": "SHA256",
        "x-amz-checksum-sha256": Buffer.from(checksum, "hex").toString(
          "base64",
        ),
      },
    });
  });
  await page.route("https://storage.example.test/upload", (route) => {
    bytePosts++;
    return route.fulfill({ status: 204 });
  });
  await page.route("**/engagement/attachments/confirm", (route) => {
    const body = route.request().postDataJSON();
    if (!records.has(body.s3Key))
      records.set(body.s3Key, {
        ...attachment,
        prospectId,
        id: randomUUID(),
        s3Key: body.s3Key,
      });
    return ++confirmPosts === 1
      ? json(
          route,
          { message: "Synthetic reply lost AFTER attachment commit" },
          503,
        )
      : json(route, records.get(body.s3Key));
  });
  const area = page.getByRole("region", {
    name: "Prospect files",
    exact: true,
  });
  const choose = () =>
    area.getByLabel("Upload prospect file").setInputFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello"),
    });
  await page.goto(`/portfolio/prospects/${prospectId}`);
  await choose();
  await area.getByRole("button", { name: "Upload file", exact: true }).click();
  await expect(
    area.getByRole("button", { name: "Recover original upload", exact: true }),
  ).toBeEnabled();
  expect(records.size).toBe(1);
  expect(bytePosts).toBe(1);
  await page.reload();
  await expect(
    area.getByRole("button", { name: "Recover original upload", exact: true }),
  ).toBeEnabled();
  expect(confirmPosts).toBe(1);
  expect(bytePosts).toBe(1);
  expect(posts).toHaveLength(1);
  await area
    .getByRole("button", { name: "Recover original upload", exact: true })
    .click();
  await expect(area.getByText(/test.txt uploaded/)).toBeVisible();
  expect(unexpected).toEqual([]);
  expect(
    records.size,
    "the uncertain original attachment requires original confirmation, not a replacement key",
  ).toBe(1);
  expect(bytePosts).toBe(1);
  expect(confirmPosts).toBe(2);
  expect(posts).toHaveLength(1);
});
