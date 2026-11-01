import { test, expect } from "@playwright/test";
import { installFixtures, clientId } from "./fixtures";
import {
  conversationId,
  inboxPage,
  serveMeri,
} from "./discoverability-fixtures";

test("the inbox lists the actor's proposals newest first with the state Meri read and links each to its conversation", async ({
  page,
}) => {
  await installFixtures(page);
  const calls = await serveMeri(page);
  await page.goto("/approval-inbox.html");
  const table = page.getByRole("table", {
    name: /Proposals across your conversations/,
  });
  await expect(table).toBeVisible();
  const rows = table.locator("tbody tr");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("Create a task");
  await expect(rows.nth(0)).toContainText("Test Aerospace");
  await expect(rows.nth(0)).toContainText("Awaiting your decision");
  await expect(rows.nth(0).getByRole("link")).toHaveAttribute(
    "href",
    `/meri?clientId=${clientId}&conversationId=${conversationId}`,
  );
  await expect(rows.nth(1)).toContainText("Watch change");
  await expect(rows.nth(1)).toContainText("General");
  await expect(rows.nth(1)).toContainText("Completed");
  await expect(rows.nth(1).getByRole("link")).toHaveAttribute(
    "href",
    `/meri?scope=general&conversationId=${conversationId}`,
  );
  await expect(rows.nth(2)).toContainText("No longer visible");
  await expect(rows.nth(2)).toContainText("Withheld");
  await expect(page.getByRole("status")).toContainText(
    "1 awaiting your decision. Open a conversation to review and decide; nothing is approved from this list.",
  );
  await expect(
    page.getByRole("link", { name: "Memory review" }),
  ).toHaveAttribute("href", "/meri/memory");
  await expect(
    page.getByRole("link", { name: "Workspace updates" }),
  ).toHaveAttribute("href", "/meri/updates");
  await expect(page.getByRole("button")).toHaveCount(0);
  expect(
    calls
      .filter((call) => call.path === "/api/conversations/intents/inbox")
      .map((call) => call.body),
  ).toEqual([{ limit: 50 }]);
});

test("a page that is not the whole inbox offers older proposals and reads them by the server's cursor", async ({
  page,
}) => {
  await installFixtures(page);
  const first = {
    ...inboxPage,
    rows: [inboxPage.rows[0]],
    next: {
      conversationId,
      deliveryId: inboxPage.rows[0]!.deliveryId as string,
    },
    pending: { count: 1, complete: false },
  };
  const calls = await serveMeri(page, { inbox: first });
  await page.goto("/approval-inbox.html");
  await expect(page.getByRole("status")).toContainText(
    "1 awaiting your decision on this page; older proposals follow below.",
  );
  await page.unroute("**/api/conversations/**");
  await serveMeri(page, {
    inbox: {
      ...inboxPage,
      rows: inboxPage.rows.slice(1),
      pending: { count: 0, complete: true },
    },
  });
  await page.getByRole("button", { name: "Load older proposals" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(page.getByRole("button")).toHaveCount(0);
  expect(calls[0]?.body).toEqual({ limit: 50 });
});

test("an answer the contract refuses or a refused membership never renders a guessed inbox", async ({
  page,
}) => {
  await installFixtures(page);
  await serveMeri(page, {
    inbox: { ...inboxPage, pending: { count: 3, complete: true } },
  });
  await page.goto("/approval-inbox.html");
  await expect(page.getByRole("alert")).toContainText(
    "Your proposals could not be read right now.",
  );
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.unroute("**/api/conversations/**");
  await serveMeri(page, {
    inbox: { error: { code: "MEMBERSHIP_REVOKED" } },
    inboxStatus: 403,
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Approval access was denied.",
  );
});
