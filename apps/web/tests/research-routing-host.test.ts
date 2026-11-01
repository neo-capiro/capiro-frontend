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
  defaultOpening: vi.fn(() => "Default scope opening"),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
  useRouter: () => ({ replace: vi.fn() }),
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

vi.mock("../src/features/meri/conversation/DefaultScopeOpening", () => ({
  DefaultScopeOpening: mocks.defaultOpening,
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

vi.mock("../src/features/meri/conversation/ResearchConversationHost", () => ({
  ResearchConversationHost: (props: unknown) =>
    JSON.stringify({ research: props }),
}));
it("routes an existing portfolio launch away from ambient selected client without issuing a session", () => {
  mocks.search = "researchPortfolioId=44444444-4444-4444-8444-444444444444";
  const html = renderToStaticMarkup(
    createElement(MeriConversationHost, {
      enabled: true,
      account,
      firstChatBootstrapEnabled: true,
    }),
  );
  expect(html).toContain("44444444-4444-4444-8444-444444444444");
  expect(html).toContain("research");
  expect(mocks.session).not.toHaveBeenCalled();
  expect(mocks.coreRequest).not.toHaveBeenCalled();
});
it("routes Research history explicitly even with no selected client", () => {
  mocks.selectedState = "no-selection";
  mocks.search =
    "scope=research_portfolio&conversationId=55555555-5555-4555-8555-555555555555";
  const html = renderToStaticMarkup(
    createElement(MeriConversationHost, { enabled: true, account }),
  );
  expect(html).toContain("55555555-5555-4555-8555-555555555555");
  expect(html).toContain("research");
  expect(mocks.session).not.toHaveBeenCalled();
});
it.each([
  "scope=general&researchPortfolioId=44444444-4444-4444-8444-444444444444",
  "researchPortfolioId=bad",
  "scope=research_portfolio",
])("never opens General/client for invalid Research route %s", (query) => {
  mocks.search = query;
  const html = renderToStaticMarkup(
    createElement(MeriConversationHost, {
      enabled: true,
      account,
      firstChatBootstrapEnabled: true,
    }),
  );
  expect(html).toContain("Conversation selection unavailable");
  expect(mocks.session).not.toHaveBeenCalled();
  expect(mocks.coreRequest).not.toHaveBeenCalled();
});
it("account and feature denials do not open Research", () => {
  mocks.search =
    "scope=research_portfolio&conversationId=55555555-5555-4555-8555-555555555555";
  expect(
    renderToStaticMarkup(
      createElement(MeriConversationHost, { enabled: false, account }),
    ),
  ).toContain("Conversations unavailable");
  expect(
    renderToStaticMarkup(
      createElement(MeriConversationHost, { enabled: true }),
    ),
  ).toContain("Verify your account");
  expect(mocks.session).not.toHaveBeenCalled();
});

it.each([
  "researchPortfolioId=44444444-4444-4444-8444-444444444444",
  "scope=research_portfolio&conversationId=55555555-5555-4555-8555-555555555555",
  "researchPortfolioId=bad",
  "scope=general&researchPortfolioId=44444444-4444-4444-8444-444444444444",
  "scope=research_portfolio",
])(
  "never invokes the saved-default opener for explicit Research intent %s",
  (query) => {
    mocks.selectedState = "no-selection";
    mocks.search = query;
    renderToStaticMarkup(
      createElement(MeriConversationHost, {
        enabled: true,
        account,
        firstChatBootstrapEnabled: false,
      }),
    );
    expect(mocks.defaultOpening).not.toHaveBeenCalled();
    expect(mocks.session).not.toHaveBeenCalled();
    expect(mocks.coreRequest).not.toHaveBeenCalled();
  },
);

it("keeps saved-default opening for a bare Meri entry without a selected client", () => {
  mocks.selectedState = "no-selection";
  const html = renderToStaticMarkup(
    createElement(MeriConversationHost, { enabled: true, account }),
  );
  expect(html).toContain("Default scope opening");
  expect(mocks.defaultOpening).toHaveBeenCalledTimes(1);
  expect(mocks.session).not.toHaveBeenCalled();
});
