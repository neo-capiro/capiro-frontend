import { test, expect, type BrowserContext } from "@playwright/test";
import { testIdentity } from "../fixtures";
import type { ImpersonationSession } from "../../../src/shared/capiro/operations/settings-admin/impersonation";

async function fixture(context: BrowserContext) {
  let session: ImpersonationSession | null = null;
  const starts: string[] = [],
    exits: string[] = [];
  let loseStart = false,
    denyRead = false,
    foreign = false;
  await context.route("**/api/capiro/*", async (route) => {
    const url = new URL(route.request().url());
    const operation = decodeURIComponent(url.pathname.split("/").at(-1)!);
    const input =
      route.request().method() === "GET"
        ? JSON.parse(url.searchParams.get("input") ?? "{}")
        : route.request().postDataJSON();
    let result: unknown;
    if (operation === "me.read")
      result = { ...testIdentity, role: "capiro_admin" };
    else if (operation.endsWith(".active")) result = { session };
    else if (operation.endsWith(".start")) {
      starts.push(input.body.requestId);
      session ??= {
        sessionId: input.body.requestId,
        tenantId: input.body.tenantId,
        tenantSlug: "synthetic-target",
        tenantName: "Synthetic Target",
        reason: input.body.reason,
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        endedAt: null,
        endedReason: null,
        status: "active",
      };
      result = { ...session, replayed: starts.length > 1 };
      if (loseStart) {
        loseStart = false;
        return route.abort();
      }
    } else if (operation.endsWith(".end")) {
      exits.push(input.body.sessionId);
      result = {
        ...session,
        sessionId: input.body.sessionId,
        status: "ended",
        endedAt: new Date().toISOString(),
        endedReason: "manual",
        replayed: false,
      };
      session = null;
    } else if (operation.endsWith(".workspace")) {
      if (denyRead)
        return route.fulfill({
          status: 403,
          json: { message: "Support access was revoked." },
        });
      result = {
        session: foreign
          ? { ...session, tenantId: testIdentity.tenant.id }
          : session,
        readOnly: true,
        clients: [
          {
            id: "30000000-0000-4000-8000-000000000001",
            name: "Visible synthetic client",
            status: "active",
            website: null,
            updatedAt: new Date().toISOString(),
          },
        ],
        nextCursor: null,
      };
    } else
      return route.fulfill({ status: 404, json: { message: "Unsupported" } });
    return route.fulfill({ json: result });
  });
  return {
    starts,
    exits,
    loseStart: () => {
      loseStart = true;
    },
    revoke: () => {
      denyRead = true;
    },
    foreign: () => {
      foreign = true;
    },
    expire: () => {
      if (session) session.expiresAt = new Date(Date.now() - 1).toISOString();
    },
  };
}
const path = "/impersonation/index.html";
test("entry, persistent banner and exact exit discard private drafts", async ({
  context,
  page,
}) => {
  const f = await fixture(context);
  await page.goto(path);
  await page.getByLabel("Private draft").fill("old private draft");
  await page.getByRole("button", { name: "Start support" }).click();
  await expect(
    page.getByRole("heading", { name: "Acting as Synthetic Target" }),
  ).toBeVisible();
  await expect(page.getByText("Visible synthetic client")).toBeVisible();
  await expect(page.getByLabel("Private draft")).toHaveCount(0);
  await page.getByRole("button", { name: "Exit impersonation" }).click();
  await expect(page.getByLabel("Private draft")).toHaveValue("");
  expect(f.exits).toEqual(f.starts);
});
test("another tab follows server selection and exit without retaining target data", async ({
  context,
  page,
}) => {
  await fixture(context);
  const second = await context.newPage();
  await page.goto(path);
  await second.goto(path);
  await page.getByRole("button", { name: "Start support" }).click();
  await expect(
    second.getByRole("heading", { name: "Acting as Synthetic Target" }),
  ).toBeVisible();
  await second.getByRole("button", { name: "Exit impersonation" }).click();
  await expect(
    page.getByRole("heading", { name: "Your own account" }),
  ).toBeVisible();
  await expect(page.getByText("Visible synthetic client")).toHaveCount(0);
});
test("an interrupted start recovers its original UUID after reload", async ({
  context,
  page,
}) => {
  const f = await fixture(context);
  f.loseStart();
  await page.goto(path);
  await page.getByRole("button", { name: "Start support" }).click();
  await expect(
    page.getByRole("button", { name: "Recover original start" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Recover original start" }).click();
  await expect(
    page.getByRole("button", { name: "Recover original start" }),
  ).toHaveCount(0);
  expect(f.starts).toHaveLength(2);
  expect(new Set(f.starts).size).toBe(1);
});
test("foreign response never displays client data and expiry keeps explicit exit available", async ({
  context,
  page,
}) => {
  const f = await fixture(context);
  f.foreign();
  await page.goto(path);
  await page.getByRole("button", { name: "Start support" }).click();
  await expect(
    page.getByText("The support response does not match", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Visible synthetic client")).toHaveCount(0);
  f.expire();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByText("This support session has expired", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Exit impersonation" }),
  ).toBeEnabled();
});
test("revoked support reads clear previously displayed data on refresh", async ({
  context,
  page,
}) => {
  const f = await fixture(context);
  await page.goto(path);
  await page.getByRole("button", { name: "Start support" }).click();
  await expect(page.getByText("Visible synthetic client")).toBeVisible();
  f.revoke();
  await page.getByRole("button", { name: "Refresh from first page" }).click();
  await expect(page.getByText("Visible synthetic client")).toHaveCount(0);
  await expect(page.getByText("Support access was revoked.")).toBeVisible();
});
