import { createHash } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import {
  clientId,
  installFixtures,
  json,
  prospect,
  prospectId,
} from "./fixtures";

const commandPath = `**/business-development/prospects/${prospectId}/conversion-commands`;
const receiptPath = `${commandPath}/*`;
const currentPath = `**/business-development/prospects/${prospectId}`;
const matchesPath = "**/business-development/search/clients?**";

async function openReview(page: Page) {
  await page.goto(`/portfolio/prospects/${prospectId}`);
  await page
    .getByRole("button", { name: "Create client from prospect", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: `Create client from ${prospect.displayName}`,
  });
  await expect(
    dialog.getByRole("button", { name: "Create reviewed client" }),
  ).toBeDisabled();
  await expect(
    dialog.getByText("No matching clients were found."),
  ).toBeVisible();
  await dialog
    .getByRole("checkbox", { name: /I reviewed the possible matches/ })
    .check();
  return dialog;
}

test("lost new-client response retains the exact original conversion across reload and acknowledges only its receipt", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/backend/") && request.method() !== "GET")
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  let current = { ...prospect };
  let receipt: Record<string, unknown> | undefined;
  let reads = 0;
  await page.route(matchesPath, (route) => json(route, { results: [] }));
  await page.route(currentPath, (route) => json(route, current));
  await page.route(commandPath, async (route) => {
    const command = route.request().postDataJSON();
    expect(command).toEqual({
      schemaVersion: 1,
      requestId: expect.any(String),
      prospectId,
      expectedUpdatedAt: prospect.updatedAt,
      mode: "new_client",
      clientName: prospect.displayName,
      clientWebsite: "https://reviewed.example.test",
      clientDescription: "Reviewed synthetic intake",
    });
    current = {
      ...current,
      linkedClientId: clientId,
      convertedAt: "2026-10-24T12:00:00Z",
      updatedAt: "2026-10-24T12:00:00Z",
    };
    receipt = {
      schemaVersion: 1,
      requestId: command.requestId,
      prospectId,
      clientId,
      payloadDigest: createHash("sha256")
        .update(JSON.stringify(command))
        .digest("hex"),
      outcome: "created",
      expectedUpdatedAt: command.expectedUpdatedAt,
      prospectUpdatedAt: current.updatedAt,
      committedAt: current.convertedAt,
    };
    await route.abort("failed");
  });
  await page.route(receiptPath, (route) => {
    reads++;
    expect(route.request().method()).toBe("GET");
    expect(route.request().url().endsWith(String(receipt?.requestId))).toBe(
      true,
    );
    return json(route, receipt);
  });
  let dialog = await openReview(page);
  await dialog
    .getByLabel("Website", { exact: true })
    .fill("https://reviewed.example.test");
  await dialog
    .getByLabel("Description", { exact: true })
    .fill("Reviewed synthetic intake");
  await dialog
    .getByRole("checkbox", { name: /I reviewed the possible matches/ })
    .check();
  await dialog.getByRole("button", { name: "Create reviewed client" }).click();
  await expect(
    dialog.getByRole("button", { name: "Recover conversion receipt" }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Recover new-client conversion", exact: true })
    .click();
  dialog = page.getByRole("dialog", {
    name: "Recover new-client conversion",
    exact: true,
  });
  await expect(dialog.getByLabel("Description", { exact: true })).toHaveValue(
    "Reviewed synthetic intake",
  );
  await expect(
    dialog.getByLabel("Description", { exact: true }),
  ).toBeDisabled();
  expect(reads).toBe(0);
  await dialog
    .getByRole("button", { name: "Recover conversion receipt" })
    .click();
  await expect(
    dialog.getByRole("link", { name: "Open created client" }),
  ).toHaveAttribute("href", `/portfolio/${clientId}`);
  expect(reads).toBe(1);
  await dialog.getByRole("button", { name: "Acknowledge conversion" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("link", { name: /Open linked client/ }),
  ).toBeFocused();
  expect(reads).toBe(2);
  expect(writes).toEqual([
    `POST /api/backend/core/business-development/prospects/${prospectId}/conversion-commands`,
  ]);
  expect(unexpected).toEqual([]);
});

test("a foreign receipt and a generic refusal keep the original new-client command held after reload", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let posts = 0;
  let original: Record<string, unknown> = {};
  await page.route(matchesPath, (route) => json(route, { results: [] }));
  await page.route(commandPath, (route) => {
    posts++;
    original = route.request().postDataJSON();
    return json(route, { message: "Synthetic capacity changed" }, 402);
  });
  await page.route(receiptPath, (route) =>
    json(route, {
      schemaVersion: 1,
      requestId: original.requestId,
      prospectId,
      clientId,
      payloadDigest: "0".repeat(64),
      outcome: "created",
      expectedUpdatedAt: original.expectedUpdatedAt,
      prospectUpdatedAt: "2026-10-24T12:00:00Z",
      committedAt: "2026-10-24T12:00:00Z",
    }),
  );
  let dialog = await openReview(page);
  await dialog.getByRole("button", { name: "Create reviewed client" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Synthetic capacity changed",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Recover new-client conversion", exact: true })
    .click();
  dialog = page.getByRole("dialog", {
    name: "Recover new-client conversion",
    exact: true,
  });
  await dialog
    .getByRole("button", { name: "Recover conversion receipt" })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("does not match");
  await expect(
    dialog.getByRole("button", { name: "Acknowledge conversion" }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Create reviewed client" }),
  ).toHaveCount(0);
  await expect(dialog.getByLabel("Website", { exact: true })).toBeDisabled();
  expect(posts).toBe(1);
  expect(unexpected).toEqual([]);
});

for (const changed of ["matches", "capacity", "authority"] as const) {
  test(`new-client review rechecks ${changed} before reserving or sending a command`, async ({
    page,
  }) => {
    const unexpected = await installFixtures(page);
    let posts = 0;
    await page.route(matchesPath, (route) => json(route, { results: [] }));
    await page.route(commandPath, (route) => {
      posts++;
      return json(route, { message: "Unexpected command" }, 500);
    });
    const dialog = await openReview(page);
    if (changed === "matches")
      await page.route(matchesPath, (route) =>
        json(route, {
          results: [
            {
              id: clientId,
              name: "New possible match",
              canonicalEntityId: null,
            },
          ],
        }),
      );
    if (changed === "capacity")
      await page.route("**/billing/state", (route) =>
        json(route, {
          billingEnabled: true,
          status: "active",
          slots: 1,
          usedSlots: 1,
          trialEndsAt: null,
          onboardingFlowVersion: 1,
          locked: false,
        }),
      );
    if (changed === "authority")
      await page.route("**/core/me", (route) =>
        json(route, {
          user: { id: "user-test" },
          tenant: { id: "tenant-test" },
          role: "client_portal_user",
        }),
      );
    await dialog
      .getByRole("button", { name: "Create reviewed client" })
      .click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Recover conversion receipt" }),
    ).toHaveCount(0);
    expect(posts).toBe(0);
    expect(unexpected).toEqual([]);
  });
}
