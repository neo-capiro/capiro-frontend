import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MeriConversationHost } from "../src/features/meri/conversation/MeriConversationHost";

const mocks = vi.hoisted(() => ({
  search: "",
  clientStatus: "active",
  session: vi.fn(() => ({
    ready: undefined,
    latestTarget: undefined,
    connection: {},
  })),
  coreRequest: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => ({
    state: "authorized-client",
    client: {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Current client",
      status: mocks.clientStatus,
    },
  }),
}));
vi.mock("../src/shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => ({ request: mocks.coreRequest }),
}));
vi.mock("../src/features/meri/conversation/useConversationSession", () => ({
  useConversationSession: mocks.session,
}));
vi.mock("../src/features/meri/conversation/ConnectionPending", () => ({
  ConnectionPending: () => "Meri session pending",
}));

const account = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  actorId: "22222222-2222-4222-8222-222222222222",
};
const configuredClientId = "33333333-3333-4333-8333-333333333333";

afterEach(() => {
  mocks.search = "";
  mocks.clientStatus = "active";
  vi.clearAllMocks();
});

it("with first-chat bootstrap selected, does not mount a Meri session before Core resolution", () => {
  const html = renderToStaticMarkup(
    createElement(MeriConversationHost, {
      enabled: true,
      account,
      firstChatBootstrapEnabled: true,
      firstChatBootstrapClientId: configuredClientId,
    }),
  );
  expect(html).toContain("Preparing conversation");
  expect(mocks.session).not.toHaveBeenCalled();
});

it("preserves explicit conversation links without a Core create call", () => {
  const selectedId = "55555555-5555-4555-8555-555555555555";
  mocks.search = `conversationId=${selectedId}`;
  const html = renderToStaticMarkup(
    createElement(MeriConversationHost, {
      enabled: true,
      account,
      firstChatBootstrapEnabled: true,
      firstChatBootstrapClientId: configuredClientId,
    }),
  );
  expect(html).toContain("Meri session pending");
  expect(mocks.coreRequest).not.toHaveBeenCalled();
  expect(mocks.session).toHaveBeenCalledWith(
    account,
    "33333333-3333-4333-8333-333333333333",
    selectedId,
  );
});

it("holds an unconfigured client before Core and Meri session issuance", () => {
  const html = renderToStaticMarkup(
    createElement(MeriConversationHost, {
      enabled: true,
      account,
      firstChatBootstrapEnabled: true,
      firstChatBootstrapClientId: "66666666-6666-4666-8666-666666666666",
    }),
  );
  expect(html).toContain("This client is not configured");
  expect(mocks.coreRequest).not.toHaveBeenCalled();
  expect(mocks.session).not.toHaveBeenCalled();
});

it("keeps the accepted PR59 session path when first-chat bootstrap is off", () => {
  const html = renderToStaticMarkup(
    createElement(MeriConversationHost, {
      enabled: true,
      account,
      firstChatBootstrapEnabled: false,
    }),
  );
  expect(html).toContain("Meri session pending");
  expect(mocks.session).toHaveBeenCalledWith(
    account,
    "33333333-3333-4333-8333-333333333333",
    undefined,
  );
});

it("refuses an archived client before any Core bootstrap or Meri session", () => {
  mocks.clientStatus = "archived";
  for (const search of [
    "",
    "conversationId=55555555-5555-4555-8555-555555555555",
  ]) {
    mocks.search = search;
    for (const firstChatBootstrapEnabled of [true, false]) {
      const html = renderToStaticMarkup(
        createElement(MeriConversationHost, {
          enabled: true,
          account,
          firstChatBootstrapEnabled,
          firstChatBootstrapClientId: configuredClientId,
        }),
      );
      expect(html).toContain("Conversations unavailable for this client");
      expect(html).not.toContain("Preparing conversation");
      expect(html).not.toContain("Meri session pending");
    }
  }
  expect(mocks.coreRequest).not.toHaveBeenCalled();
  expect(mocks.session).not.toHaveBeenCalled();
});

it("only the exact Core archived literal is refused", () => {
  mocks.clientStatus = "Archived";
  const html = renderToStaticMarkup(
    createElement(MeriConversationHost, {
      enabled: true,
      account,
      firstChatBootstrapEnabled: true,
      firstChatBootstrapClientId: configuredClientId,
    }),
  );
  expect(html).toContain("Preparing conversation");
});
