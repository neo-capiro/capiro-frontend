import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ConversationHistoryList } from "../src/features/meri/conversations/ConversationHistoryList";
import { ConversationHistoryUnavailable } from "../src/shared/meri-conversations/history-client";
import type { ConversationSummary } from "../src/shared/meri-conversations/history-client";

const ID = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const row = (n: number): ConversationSummary => ({
  conversationId: ID(n),
  title: `Synthetic chat ${n}`,
  status: "active",
  revision: "1",
  scopeKind: "general",
  clientId: null,
  updatedAt: "2026-11-03T05:00:00.000Z",
  archivedAt: null,
  trashedAt: null,
  restoreUntil: null,
  hasTranscript: false,
  canManage: true,
});

type View = {
  query: Record<string, unknown>;
  scope: { tenantId: string; actorId: string } | undefined;
  current: boolean;
  retained: boolean;
  shown: boolean;
  summaries: ConversationSummary[];
};

const state = vi.hoisted(() => ({ view: {} as View }));

vi.mock("../src/shared/meri-conversations/useManagedConversations", () => ({
  useManagedConversations: () => state.view,
}));
vi.mock("../src/shared/portfolio/api/clients", () => ({
  useClients: () => ({ data: [] }),
}));

const storage = () => {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
};
beforeEach(() => {
  vi.stubGlobal("window", { sessionStorage: storage() });
});
afterEach(() => vi.unstubAllGlobals());

function plan(
  {
    query: queryOverrides,
    ...overrides
  }: Partial<View> & { query?: Record<string, unknown> },
  initialClient?: string,
) {
  state.view = {
    ...overrides,
    query: {
      error: undefined,
      data: { pages: [{ conversations: [row(1), row(2)] }] },
      isFetching: false,
      isFetchingNextPage: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      hasNextPage: true,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
      ...queryOverrides,
    },
    scope: overrides.scope ?? { tenantId: ID(900), actorId: ID(901) },
    current: overrides.current ?? true,
    retained: overrides.retained ?? false,
    shown: overrides.shown ?? true,
    summaries: overrides.summaries ?? [row(1), row(2)],
  };
  return renderToStaticMarkup(
    createElement(ConversationHistoryList, { initialClient }),
  );
}

const button = (html: string, label: string) =>
  html.match(new RegExp(`<button([^>]*)>${label}</button>`))?.[1];

it("keeps the admitted rows, says only the next page failed, and offers that page again", () => {
  const html = plan({
    current: false,
    retained: true,
    query: { error: new ConversationHistoryUnavailable(408, "DEADLINE") },
  });
  expect(html).toContain("Synthetic chat 1");
  expect(html).toContain("Synthetic chat 2");
  expect(html).toContain(
    "Part of your saved chat titles could not be loaded. The conversations already listed are unchanged.",
  );
  expect(button(html, "Try the next page again")).toBeDefined();
  // The full-read failure copy, its Retry and a second paging control never appear together.
  expect(html).not.toContain("Saved chat titles could not be loaded.");
  expect(html).not.toContain(">Retry</button>");
  expect(html).not.toContain(">Load more</button>");
  expect(html).not.toContain("environment");
  // The table is really shown, not hidden behind the display fence.
  expect(html).not.toContain("<div hidden");
});

it("keeps write authority conservative: retained rows do not enable a rename", () => {
  const html = plan({
    current: false,
    retained: true,
    query: { error: new ConversationHistoryUnavailable(408, "DEADLINE") },
  });
  expect(button(html, "Rename")).toContain("disabled");
  expect(button(html, "Archive")).toContain("disabled");
});

it("removes the rows and states the access refusal when access is refused", () => {
  const html = plan({
    current: false,
    retained: false,
    shown: false,
    summaries: [],
    query: {
      error: new ConversationHistoryUnavailable(
        403,
        "CONVERSATION_ACCESS_DENIED",
      ),
    },
  });
  expect(html).toContain(
    "You cannot open your saved chat titles with your current access.",
  );
  expect(button(html, "Retry")).toBeDefined();
  expect(html).not.toContain("Synthetic chat 1");
  expect(html).not.toContain("Part of your saved chat titles");
  expect(html).not.toContain(">Load more</button>");
});

it("states a non-retained failure as a failed read", () => {
  const html = plan({
    current: false,
    retained: false,
    shown: false,
    summaries: [],
    query: {
      error: new ConversationHistoryUnavailable(502, "PRODUCT_UNAVAILABLE"),
    },
  });
  expect(html).toContain(
    "Saved chat titles could not be loaded. This does not mean your conversations are gone.",
  );
  expect(html).not.toContain("Synthetic chat 1");
});

it("keeps the admitted rows visible while a continuation is simply in flight", () => {
  const html = plan({
    current: false,
    retained: false,
    shown: true,
    query: { isFetching: true, isFetchingNextPage: true },
  });
  expect(html).toContain("Synthetic chat 1");
  expect(html).not.toContain("Part of your saved chat titles");
  expect(html).not.toContain("<div hidden");
  expect(button(html, "Load more")).toContain("disabled");
});

it("still hides admitted rows during a revalidation that is not a page continuation", () => {
  const html = plan({
    current: false,
    retained: false,
    shown: false,
    query: { isFetching: true },
  });
  expect(html).toContain("Synthetic chat 1");
  expect(html).toContain("<div hidden");
  expect(html).not.toContain(">Load more</button>");
});

it("keeps the empty state when an admitted read returns nothing", () => {
  // A terminal empty read differs from a sparse page with a continuation.
  const html = plan({
    summaries: [],
    query: { data: { pages: [] }, hasNextPage: false },
  });
  expect(html).toContain("No conversations yet");
  expect(html).toContain("Start a conversation");
});

it("keeps an empty visible page continuable without rendering a blank history region", () => {
  const html = plan(
    { summaries: [{ ...row(1), scopeKind: "client", clientId: ID(5) }] },
    "General",
  );
  expect(html).toContain("More conversations may be on a later page.");
  expect(button(html, "Load more")).toBeDefined();
  expect(html).not.toContain("No matching conversations");
  expect(html).not.toContain('aria-label="Conversation history"');
});
