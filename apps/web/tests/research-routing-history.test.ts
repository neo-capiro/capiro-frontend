import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SelectedConversationActions } from "../src/features/meri/conversations/SelectedConversationActions";
import {
  GENERAL_CLIENT_FILTER,
  STATUS_FILTER,
  historyRows,
  updatedLabel,
} from "../src/features/meri/conversations/ConversationHistoryList";
import { SavedChatTranscript } from "../src/features/meri/conversations/SavedChatTranscript";
import { useManagedChange } from "../src/features/meri/conversations/useManagedChange";
import {
  MANAGEMENT_VERSION,
  type ConversationSummary,
} from "../src/shared/meri-conversations/history-client";
import { managementJournal } from "../src/shared/meri-conversations/management-journal";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import { conversationSearchHref } from "../src/shared/meri-conversations/conversation-navigation";

const history = vi.hoisted(() => vi.fn(() => ({ query: {}, tail: {} })));
vi.mock("../src/shared/meri-conversations/history-queries", () => ({
  useConversationHistory: history,
}));

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const account = { tenantId: id(1), actorId: id(2) };
const row: ConversationSummary = {
  conversationId: id(3),
  title: "My <chosen> title",
  revision: "1",
  scopeKind: "client",
  clientId: id(4),
  status: "active",
  updatedAt: "2026-10-24T12:00:00.000Z",
  archivedAt: null,
  trashedAt: null,
  restoreUntil: null,
  hasTranscript: false,
  canManage: true,
};
let storage: TabStorage;
beforeEach(() => {
  history.mockClear();
  const data = new Map<string, string>();
  storage = {
    get length() {
      return data.size;
    },
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
  vi.stubGlobal("window", { sessionStorage: storage });
  syncMeriTabIdentity("verified-synthetic-account");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function render(value = row, available = true) {
  return renderToStaticMarkup(
    createElement(SelectedConversationActions, {
      row: value,
      account,
      available,
      current: available,
      refresh: vi.fn(),
    }),
  );
}
const button = (html: string, label: string) =>
  html.match(new RegExp(`<button([^>]*)>${label}</button>`))?.[1];

it("renders Research history labels and links without inferring General from null", () => {
  const research = {
    ...row,
    clientId: null,
    scopeKind: "research_portfolio" as const,
    canManage: false,
    scope: {
      kind: "research_portfolio" as const,
      researchPortfolioId: id(7),
      researchPortfolioName: "Original Research",
      researchPortfolioRevision: 4,
      scopeVersion: "a".repeat(64),
    },
  };
  const rows = historyRows([research], () => "client");
  expect(rows[0]?.client).toBe("Research · Original Research");
  const html = render(research);
  expect(html).toContain(
    `href="/meri?scope=research_portfolio&amp;conversationId=${row.conversationId}"`,
  );
  expect(html).not.toContain("scope=general");
  expect(button(html, "Archive")).toContain("disabled");
});
