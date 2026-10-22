import { expect, it } from "vitest";
import type { Page, Route } from "@playwright/test";
import type { ConversationListPage } from "../src/shared/meri-conversations/history-client";
import {
  conversation,
  installHistory,
} from "../test/browser/meri-history-fixtures";

it("synthetic discovery fixture serves the public default page and honors explicit limits and cursors", async () => {
  const conversations = Array.from({ length: 51 }, (_, index) => ({
    ...conversation,
    conversationId: `30000000-0000-4000-8000-${String(1000 - index).padStart(12, "0")}`,
  }));
  let list: ((route: Route) => unknown) | undefined;
  const page = {
    route: async (path: string, handler: (route: Route) => unknown) => {
      if (path === "**/api/conversations/list") list = handler;
    },
  } as unknown as Page;
  const { calls } = await installHistory(page, { conversations });
  expect(list).toBeDefined();
  const read = async (input: object) => {
    let response: Parameters<Route["fulfill"]>[0] | undefined;
    await list!({
      request: () => ({ postDataJSON: () => input }),
      fulfill: async (value: Parameters<Route["fulfill"]>[0]) => {
        response = value;
      },
    } as unknown as Route);
    expect(response?.status).toBe(200);
    expect(response?.contentType).toBe("application/json");
    return JSON.parse(response!.body as string) as ConversationListPage;
  };

  const first = await read({});
  expect(first.conversations).toEqual(conversations.slice(0, 50));
  expect(first.nextBefore).toEqual({
    createdAt: conversations[49]!.createdAt,
    conversationId: conversations[49]!.conversationId,
  });
  const last = await read({ before: first.nextBefore });
  expect(last.conversations).toEqual([conversations[50]]);
  expect(last.nextBefore).toBeNull();

  const limited = await read({ limit: 2 });
  expect(limited.conversations).toEqual(conversations.slice(0, 2));
  expect(limited.nextBefore).toEqual({
    createdAt: conversations[1]!.createdAt,
    conversationId: conversations[1]!.conversationId,
  });
  const following = await read({ limit: 2, before: limited.nextBefore });
  expect(following.conversations).toEqual(conversations.slice(2, 4));
  expect(following.nextBefore).toEqual({
    createdAt: conversations[3]!.createdAt,
    conversationId: conversations[3]!.conversationId,
  });
  expect(calls.list).toEqual([
    {},
    { before: first.nextBefore },
    { limit: 2 },
    { limit: 2, before: limited.nextBefore },
  ]);
});
