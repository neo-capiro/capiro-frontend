import { expect, it, vi } from "vitest";
import { currentConversationIn } from "../src/shared/shell/useNewConversationNavigation";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const account = { tenantId: "tenant-a", actorId: "actor-a" };
const clientId = "11111111-1111-4111-8111-111111111111";
const conversationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const general = {
  ...account,
  scopeKind: "general" as const,
  clientId: null,
};
const client = { ...account, clientId };
const params = (query: string) => new URLSearchParams(query);

it("names the current conversation only when the address is the same scope", () => {
  expect(
    currentConversationIn(
      general,
      params(`scope=general&conversationId=${conversationId}`),
    ),
  ).toBe(conversationId);
  expect(
    currentConversationIn(
      client,
      params(`clientId=${clientId}&conversationId=${conversationId}`),
    ),
  ).toBe(conversationId);
  // A Meri page of the scope without a conversation yet.
  expect(currentConversationIn(client, params(`clientId=${clientId}`))).toBe(
    null,
  );
});

it("treats another scope, another client or another page as no current conversation", () => {
  expect(
    currentConversationIn(
      client,
      params(`scope=general&conversationId=${conversationId}`),
    ),
  ).toBe(null);
  expect(
    currentConversationIn(
      general,
      params(`clientId=${clientId}&conversationId=${conversationId}`),
    ),
  ).toBe(null);
  expect(
    currentConversationIn(
      client,
      params(
        `clientId=22222222-2222-4222-8222-222222222222&conversationId=${conversationId}`,
      ),
    ),
  ).toBe(null);
  expect(currentConversationIn(general, params(""))).toBe(null);
  expect(
    currentConversationIn(general, params(`conversationId=${conversationId}`)),
  ).toBe(null);
});
