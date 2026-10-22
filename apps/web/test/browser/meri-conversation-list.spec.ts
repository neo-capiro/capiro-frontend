import { test, expect } from "@playwright/test";
import {
  clientId,
  setupConversation,
  reply,
} from "./meri-conversation-fixtures";
import {
  conversation,
  installCurrentRun,
  installHistory,
  selectedUrl,
} from "./meri-history-fixtures";
import { client, json } from "../../tests/browser/fixtures";

const listUrl = `/meri/conversations?clientId=${clientId}`;
const secondClientId = "10000000-0000-4000-8000-000000000002";

test("loaded-page filtering pages through other clients and keyboard opening preserves transcript without dispatch", async ({
  page,
}) => {
  const f = await setupConversation(page);
  const others = Array.from(
    { length: 50 },
    (_, index): typeof conversation => ({
      ...conversation,
      conversationId: `30000000-0000-4000-8000-${String(1000 - index).padStart(12, "0")}`,
      scopes: [{ ...conversation.scopes[0]!, resourceId: secondClientId }],
    }),
  );
  const { native, calls } = await installHistory(page, {
    conversations: [...others, conversation],
  });
  await installCurrentRun(page, native);
  const mutations: string[] = [];
  page.on("request", (r) => {
    if (/\/conversations\/(submit|next-turn|input\/)/.test(r.url()))
      mutations.push(r.url());
  });
  await page.goto(listUrl);
  const list = page.getByRole("region", { name: "Saved conversations" });
  await expect(
    list.getByText("No conversations for this client in the loaded pages."),
  ).toBeVisible();
  await list
    .getByRole("button", { name: "Load earlier conversations" })
    .click();
  await expect(list.getByRole("option")).toHaveCount(1);
  await list.getByRole("combobox").fill("no synthetic match");
  await expect(
    list.getByText("No matching conversations in the loaded pages."),
  ).toBeVisible();
  await list.getByRole("combobox").fill(conversation.conversationId);
  await expect(list.getByRole("option")).toHaveCount(1);
  await page.screenshot({
    path: "test-results/m2-conversation-list-desktop.png",
    fullPage: true,
  });
  await list.getByRole("combobox").press("ArrowDown");
  await list.getByRole("combobox").press("Enter");
  await expect(page).toHaveURL(selectedUrl);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  expect(mutations).toEqual([]);
  expect(calls.list).toContainEqual({
    before: {
      createdAt: others[49]!.createdAt,
      conversationId: others[49]!.conversationId,
    },
    limit: 50,
  });
  expect(f.unexpected).toEqual([]);
});

for (const [status, code] of [
  [401, "UNAUTHENTICATED"],
  [403, "MEMBERSHIP_REVOKED"],
  [503, "CONVERSATION_UNAVAILABLE"],
] as const) {
  test(`a ${status} list failure hides cached options and never becomes an empty result`, async ({
    page,
  }) => {
    const f = await setupConversation(page);
    await installHistory(page);
    await page.goto(listUrl);
    const list = page.getByRole("region", { name: "Saved conversations" });
    await expect(list.getByRole("option")).toHaveCount(1);
    await page.route("**/api/conversations/list", (r) =>
      reply(r, { error: { code } }, status),
    );
    await list
      .getByRole("button", { name: "Reload conversation list" })
      .click();
    await expect(list.getByRole("alert")).toContainText(
      "could not be verified",
    );
    await expect(list.getByRole("option")).toHaveCount(0);
    await expect(list.getByRole("combobox")).toHaveCount(0);
    await expect(
      list.getByText(/No conversations|No matching conversations/),
    ).toHaveCount(0);
    await page.unroute("**/api/conversations/list");
    await installHistory(page);
    await list.getByRole("button", { name: "Retry conversation list" }).click();
    await expect(list.getByRole("option")).toHaveCount(1);
    expect(f.unexpected).toEqual([]);
  });
}

test("mixed-client discovery checks every owner before rendering any result", async ({
  page,
}) => {
  const f = await setupConversation(page);
  await installHistory(page, {
    conversations: [
      conversation,
      {
        ...conversation,
        conversationId: "30000000-0000-4000-8000-000000000099",
        owner: { ...conversation.owner, actorId: "synthetic-foreign-actor" },
        scopes: [{ ...conversation.scopes[0]!, resourceId: secondClientId }],
      },
    ],
  });
  await page.goto(listUrl);
  const list = page.getByRole("region", { name: "Saved conversations" });
  await expect(list.getByRole("alert")).toContainText("could not be verified");
  await expect(list.getByRole("option")).toHaveCount(0);
  expect(f.unexpected).toEqual([]);
});

test("client switching retires loaded results and filters without bootstrap or submit", async ({
  page,
}) => {
  const f = await setupConversation(page);
  await page.route("**/api/backend/core/clients", (r) =>
    json(r, [
      client,
      { ...client, id: secondClientId, name: "Second Synthetic Client" },
    ]),
  );
  await page.route(`**/api/backend/core/clients/${secondClientId}`, (r) =>
    json(r, { ...client, id: secondClientId, name: "Second Synthetic Client" }),
  );
  const second: typeof conversation = {
    ...conversation,
    conversationId: "30000000-0000-4000-8000-000000000099",
    scopes: [{ ...conversation.scopes[0]!, resourceId: secondClientId }],
  };
  await installHistory(page, { conversations: [second, conversation] });
  await page.goto(listUrl);
  const list = page.getByRole("region", { name: "Saved conversations" });
  await expect(list.getByRole("option")).toContainText(
    conversation.conversationId,
  );
  await list.getByRole("combobox").fill(conversation.conversationId);
  await page
    .locator("summary")
    .filter({ hasText: "Verified conversation client" })
    .click();
  await page
    .getByRole("link", { name: "Second Synthetic Client", exact: true })
    .click();
  await expect(page).toHaveURL(
    `/meri/conversations?clientId=${secondClientId}`,
  );
  await expect(list.getByRole("combobox")).toHaveValue("");
  await expect(list.getByRole("option")).toContainText(second.conversationId);
  await expect(list.getByRole("option")).not.toContainText(
    conversation.conversationId,
  );
  expect(f.hints).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(list.getByRole("option")).toBeVisible();
  await page.screenshot({
    path: "test-results/m2-conversation-list-phone.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(f.unexpected).toEqual([]);
});
