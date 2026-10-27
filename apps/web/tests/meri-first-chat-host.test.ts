import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MeriConversationHost } from "../src/features/meri/conversation/MeriConversationHost";

const mocks = vi.hoisted(() => ({
  search: "",
  clientStatus: "active",
  clientId: "33333333-3333-4333-8333-333333333333",
  selectedState: "authorized-client",
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
    state: mocks.selectedState,
    client: {
      id: mocks.clientId,
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
vi.mock("../src/features/meri/conversation/ConversationView", () => ({
  ConversationView: () => "Meri session pending",
}));

const account = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  actorId: "22222222-2222-4222-8222-222222222222",
};

afterEach(() => {
  mocks.search = "";
  mocks.clientStatus = "active";
  mocks.clientId = "33333333-3333-4333-8333-333333333333";
  mocks.selectedState = "authorized-client";
  vi.clearAllMocks();
});

it("with first-chat bootstrap selected, does not mount a Meri session before Core resolution", () => {
  const html = renderToStaticMarkup(
    createElement(MeriConversationHost, {
      enabled: true,
      account,
      firstChatBootstrapEnabled: true,
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

it.each([
  "33333333-3333-4333-8333-333333333333",
  "66666666-6666-4666-8666-666666666666",
])("lets each verified active client reach Core resolution: %s", (clientId) => {
  mocks.clientId = clientId;
  const html = renderToStaticMarkup(
    createElement(MeriConversationHost, {
      enabled: true,
      account,
      firstChatBootstrapEnabled: true,
    }),
  );
  expect(html).toContain("Preparing conversation");
  expect(mocks.session).not.toHaveBeenCalled();
});

it.each(["unavailable", "loading", "no-selection"])(
  "holds %s selection before Core or a session",
  (state) => {
    mocks.selectedState = state;
    const html = renderToStaticMarkup(
      createElement(MeriConversationHost, {
        enabled: true,
        account,
        firstChatBootstrapEnabled: true,
      }),
    );
    expect(html).toContain("Conversation connection unavailable");
    expect(mocks.coreRequest).not.toHaveBeenCalled();
    expect(mocks.session).not.toHaveBeenCalled();
  },
);

it("explicit General does not inherit the selected client", () => {
  mocks.search =
    "scope=general&conversationId=55555555-5555-4555-8555-555555555555";
  renderToStaticMarkup(
    createElement(MeriConversationHost, {
      enabled: true,
      account,
      firstChatBootstrapEnabled: true,
    }),
  );
  expect(mocks.session).toHaveBeenCalledWith(
    account,
    null,
    "55555555-5555-4555-8555-555555555555",
  );
});

it("an authenticated unscoped entry asks for General or a client without claiming account failure", () => {
  mocks.selectedState = "no-selection";
  const html = renderToStaticMarkup(
    createElement(MeriConversationHost, {
      enabled: true,
      account,
      firstChatBootstrapEnabled: true,
    }),
  );
  expect(html).toContain("Choose General or a permitted client above");
  expect(html).not.toContain("account could not be verified");
  expect(mocks.coreRequest).not.toHaveBeenCalled();
  expect(mocks.session).not.toHaveBeenCalled();
});

it("missing identity is distinguished from an unapplied scope without opening a session", () => {
  mocks.selectedState = "no-selection";
  const html = renderToStaticMarkup(
    createElement(MeriConversationHost, { enabled: true }),
  );
  expect(html).toContain("Your account could not be verified");
  expect(html).not.toContain("Choose General");
  expect(mocks.coreRequest).not.toHaveBeenCalled();
  expect(mocks.session).not.toHaveBeenCalled();
});

it.each([
  "scope=general&clientId=33333333-3333-4333-8333-333333333333",
  "scope=general&scope=general",
  "scope=client",
])("refuses ambiguous scope %s", (search) => {
  mocks.search = search;
  const html = renderToStaticMarkup(
    createElement(MeriConversationHost, {
      enabled: true,
      account,
      firstChatBootstrapEnabled: true,
    }),
  );
  expect(html).toContain("Conversation selection unavailable");
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
    }),
  );
  expect(html).toContain("Preparing conversation");
});
