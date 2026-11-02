import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { ConversationRecents } from "../src/shared/shell/ConversationRecents";
import { Sidebar } from "../src/shared/shell/Sidebar";
import { SessionContext } from "../src/shared/session/SessionContext";
import { MeriCapabilitiesProvider } from "../src/shared/meri-resources/CapabilityContext";
import { heldMeriCapabilities } from "../src/shared/meri-resources/capabilities";

const id = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const owner = { tenantId: "tenant", actorId: "actor" };
const scopes = [
  {
    kind: "client",
    tenantId: "tenant",
    resourceId: "client",
    policyRevision: "1",
  },
];
const named = {
  conversationId: id(1),
  owner,
  scopes,
  createdAt: "2026-10-28T07:20:00.000Z",
  policyRevision: "1",
};
const unnamed = { ...named, conversationId: id(2) };
const summary = {
  conversationId: id(1),
  title: "FY27 defense budget outlook",
  revision: "0",
  scopeKind: "client",
  clientId: "client",
  status: "active",
  updatedAt: "2026-10-28T07:21:00.000Z",
  archivedAt: null,
  trashedAt: null,
  restoreUntil: null,
  hasTranscript: true,
  canManage: true,
};

vi.mock("next/navigation", () => ({
  usePathname: () => "/meri",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(`conversationId=${id(1)}`),
}));
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => ({
    isSuccess: true,
    isFetching: false,
    data: { tenant: { id: "tenant" }, user: { id: "actor" } },
  }),
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => ({
    state: "authorized-client",
    client: { id: "client" },
  }),
}));
vi.mock("../src/shared/meri-conversations/history-queries", () => ({
  useRecentConversationTitles: () => [summary],
  useConversationDiscovery: () => ({
    query: { isPending: false, isRefetching: false, hasNextPage: false },
    conversations: [named, unnamed],
    unavailable: false,
  }),
}));

afterEach(() => vi.clearAllMocks());

const recents = () =>
  renderToStaticMarkup(
    createElement(
      SessionContext.Provider,
      { value: "signed-in" },
      createElement(ConversationRecents, { enabled: true }),
    ),
  );

it("names a recent chat by its owned summary and offers inline rename only for that row", () => {
  const html = recents();
  expect(html).toContain(">FY27 defense budget outlook</span>");
  expect(html).toMatch(
    /<button type="button" class="[^"]*recentRename[^"]*" title="Rename conversation" aria-label="Rename FY27 defense budget outlook"/,
  );
  // A conversation whose owned title has not loaded keeps its creation receipt and no rename control.
  expect(html).toContain("Conversation · ");
  expect(html.match(/aria-label="Rename /g)).toHaveLength(1);
  expect(html).not.toContain('aria-label="Conversation name"');
  expect(html).toContain(
    `href="/meri?clientId=client&amp;conversationId=${id(1)}"`,
  );
});

it("orders the sidebar as New conversation, Search, Library, Recent, then Preferences", () => {
  const html = renderToStaticMarkup(
    createElement(
      MeriCapabilitiesProvider,
      { value: heldMeriCapabilities },
      createElement(Sidebar, { section: "memory" }),
    ),
  );
  const at = (text: string) => {
    const index = html.indexOf(text);
    expect(index, text).toBeGreaterThanOrEqual(0);
    return index;
  };
  const order = [
    "New conversation",
    "Search conversations",
    ">Library</h2>",
    ">Data access",
    ">Recent</h2>",
    ">Preferences<",
  ].map(at);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  // The held Data access destination stays disabled with its reason, wherever the library sits.
  expect(html).toMatch(
    /<button[^>]*disabled=""[^>]*>[^<]*<[^>]*>[^<]*Data access/,
  );
  expect(html).toContain(heldMeriCapabilities.dataAccess.reason);
});
