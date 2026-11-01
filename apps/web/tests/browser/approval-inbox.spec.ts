import { test, expect } from "@playwright/test";
import { installFixtures, clientId } from "./fixtures";
import {
  conversationId,
  cursorTo,
  inboxPage,
  serveMeri,
} from "./discoverability-fixtures";

const inboxCalls = (calls: { path: string; body: unknown }[]) =>
  calls
    .filter((call) => call.path === "/api/conversations/intents/inbox")
    .map((call) => call.body);

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
  expect(inboxCalls(calls)).toEqual([{ limit: 50 }]);
});

test("a page that is not the whole inbox offers older proposals and reads them by the server's cursor", async ({
  page,
}) => {
  await installFixtures(page);
  const first = {
    rows: [inboxPage.rows[0]!],
    next: cursorTo(inboxPage.rows[0]!),
    pending: { count: 1, complete: false },
  };
  const rest = {
    rows: inboxPage.rows.slice(1),
    next: null,
    pending: { count: 0, complete: true },
  };
  const calls = await serveMeri(page, { inbox: [first, rest] });
  await page.goto("/approval-inbox.html");
  await expect(page.getByRole("status")).toContainText(
    "1 awaiting your decision so far; older proposals follow below.",
  );
  await page.getByRole("button", { name: "Load older proposals" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(page.getByRole("status")).toContainText(
    "1 awaiting your decision. Open a conversation",
  );
  await expect(page.getByRole("button")).toHaveCount(0);
  expect(inboxCalls(calls)).toEqual([
    { limit: 50 },
    { limit: 50, after: first.next },
  ]);
});

test("an empty page with a cursor is never shown as empty: the inbox keeps reading until a proposal is found or the end is reached", async ({
  page,
}) => {
  await installFixtures(page);
  const cursor = cursorTo(inboxPage.rows[2]!);
  const later = cursorTo(inboxPage.rows[1]!);
  const emptyWithMore = {
    rows: [],
    next: cursor,
    pending: { count: 0, complete: false },
  };
  const calls = await serveMeri(page, {
    inbox: [{ ...emptyWithMore, next: later }, emptyWithMore, inboxPage],
  });
  await page.goto("/approval-inbox.html");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(
    page.getByText("No proposals have been prepared for you yet."),
  ).toHaveCount(0);
  expect(inboxCalls(calls)).toEqual([
    { limit: 50 },
    { limit: 50, after: later },
    { limit: 50, after: cursor },
  ]);
  await page.unroute("**/api/conversations/**");
  await serveMeri(page, {
    inbox: [
      emptyWithMore,
      { rows: [], next: null, pending: { count: 0, complete: true } },
    ],
  });
  await page.reload();
  await expect(page.getByRole("status")).toContainText(
    "No proposals have been prepared for you yet.",
  );
});

test("a failed or repeating automatic page never ends in the empty copy: the person gets the retry state", async ({
  page,
}) => {
  await installFixtures(page);
  const cursor = cursorTo(inboxPage.rows[2]!);
  const emptyWithMore = {
    rows: [],
    next: cursor,
    pending: { count: 0, complete: false },
  };
  const calls = await serveMeri(page, {
    inbox: [emptyWithMore, 503, inboxPage],
  });
  await page.goto("/approval-inbox.html");
  await expect(page.getByRole("status")).toContainText(
    "Your proposals could not all be read yet.",
  );
  await expect(
    page.getByText("No proposals have been prepared for you yet."),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Retry loading older proposals" })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  expect(inboxCalls(calls)).toEqual([
    { limit: 50 },
    { limit: 50, after: cursor },
    { limit: 50, after: cursor },
  ]);
  // A cursor the server keeps repeating stops the automatic reads after one follow-up.
  await page.unroute("**/api/conversations/**");
  const repeated = await serveMeri(page, { inbox: [emptyWithMore] });
  await page.reload();
  await expect(page.getByRole("status")).toContainText(
    "Your proposals could not all be read yet.",
  );
  await expect(
    page.getByRole("button", { name: "Retry loading older proposals" }),
  ).toBeVisible();
  expect(inboxCalls(repeated)).toEqual([
    { limit: 50 },
    { limit: 50, after: cursor },
  ]);
});

test("automatic paging stops after 20 empty pages even when every cursor is new, and leaves the retry state", async ({
  page,
}) => {
  await installFixtures(page);
  const pages = Array.from({ length: 25 }, (_, n) => ({
    rows: [],
    next: {
      conversationId,
      deliveryId: `sdk:${String(100 + n).padStart(64, "0")}`,
    },
    pending: { count: 0, complete: false },
  }));
  const calls = await serveMeri(page, { inbox: pages });
  await page.goto("/approval-inbox.html");
  await expect(page.getByRole("status")).toContainText(
    "Your proposals could not all be read yet.",
  );
  await expect(
    page.getByRole("button", { name: "Retry loading older proposals" }),
  ).toBeVisible();
  expect(inboxCalls(calls)).toHaveLength(21);
  expect(inboxCalls(calls)[20]).toEqual({ limit: 50, after: pages[19]!.next });
});

test("a failed read of older proposals keeps the rows already shown and offers a retry", async ({
  page,
}) => {
  await installFixtures(page);
  const first = {
    rows: [inboxPage.rows[0]!],
    next: cursorTo(inboxPage.rows[0]!),
    pending: { count: 1, complete: false },
  };
  const rest = {
    rows: inboxPage.rows.slice(1),
    next: null,
    pending: { count: 0, complete: true },
  };
  const calls = await serveMeri(page, { inbox: [first, 503, rest] });
  await page.goto("/approval-inbox.html");
  await page.getByRole("button", { name: "Load older proposals" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Older proposals could not be read right now; the ones above are unchanged.",
  );
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Retry loading older proposals" })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(inboxCalls(calls)).toEqual([
    { limit: 50 },
    { limit: 50, after: first.next },
    { limit: 50, after: first.next },
  ]);
});

test("an answer the contract refuses or a refused membership never renders a guessed inbox", async ({
  page,
}) => {
  await installFixtures(page);
  await serveMeri(page, {
    inbox: [{ ...inboxPage, pending: { count: 3, complete: true } }],
  });
  await page.goto("/approval-inbox.html");
  await expect(page.getByRole("alert")).toContainText(
    "Your proposals could not be read right now.",
  );
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.unroute("**/api/conversations/**");
  await serveMeri(page, { inbox: [403] });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Approval access was denied.",
  );
});
