import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ManagedChatRow } from "../src/features/meri/conversations/ManagedChatRow";
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
// Motion rendering is separately qualified; these controls inspect management presentation/handlers.
vi.mock("@capiro/ui/motion", () => ({
  MotionSurface: (props: ComponentProps<"div">) => createElement("div", props),
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
    createElement(ManagedChatRow, {
      row: value,
      account,
      available,
      refresh: vi.fn(),
    }),
  );
}
const button = (html: string, label: string) =>
  html.match(new RegExp(`<button([^>]*)>${label}</button>`))?.[1];

it("a collapsed saved chat never invokes the access-disabled history owner and clears another reader", () => {
  const html = renderToStaticMarkup(
    createElement(SavedChatTranscript, {
      account,
      row: { ...row, status: "archived", hasTranscript: true },
    }),
  );
  expect(html).toContain("Read saved chat");
  expect(history).not.toHaveBeenCalled();
});

it("uses the saved immutable scope and escapes the user title in client and General reopen links", () => {
  expect(render()).toContain(
    `href="/meri?clientId=${row.clientId}&amp;conversationId=${row.conversationId}"`,
  );
  const general = { ...row, scopeKind: "general" as const, clientId: null };
  expect(render(general)).toContain(
    `href="/meri?scope=general&amp;conversationId=${row.conversationId}"`,
  );
  expect(render(general)).toContain("My &lt;chosen&gt; title");
  expect(conversationSearchHref(null)).toBe(
    "/meri/conversations?scope=general#chat-title-search",
  );
  expect(conversationSearchHref(row.clientId!)).toBe(
    `/meri/conversations?clientId=${row.clientId}#chat-title-search`,
  );
  expect(conversationSearchHref(undefined)).toBe(
    "/meri/conversations#chat-title-search",
  );
});

it("disables unsettled archive/trash while the existing handler still permits a user rename", async () => {
  const active = { ...row, canManage: false };
  expect(button(render(active), "Archive")).toContain("disabled");
  expect(button(render(active), "Move to Trash")).toContain("disabled");
  let change!: ReturnType<typeof useManagedChange>;
  function Probe() {
    change = useManagedChange({
      row: active,
      account,
      available: true,
      refresh: vi.fn(),
    });
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  const fetcher = vi.fn<typeof fetch>(async () => {
    throw Error("synthetic lost reply");
  });
  vi.stubGlobal("fetch", fetcher);
  change.change("archive", "");
  change.change("trash", "");
  expect(fetcher).not.toHaveBeenCalled();
  change.change("rename", "  Chosen new title  ");
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  const request = JSON.parse(
    new TextDecoder().decode(fetcher.mock.calls[0]![1]?.body as Uint8Array),
  );
  expect(request).toMatchObject({
    version: MANAGEMENT_VERSION,
    conversationId: row.conversationId,
    expectedRevision: row.revision,
    operation: "rename",
    title: "Chosen new title",
  });
  expect(change.journal?.read()).toEqual(request);
});

it("retains the same command and disables new actions after reload of an uncertain change", () => {
  const command = {
    version: MANAGEMENT_VERSION,
    requestId: id(5),
    conversationId: row.conversationId,
    expectedRevision: row.revision,
    operation: "archive" as const,
  };
  managementJournal({ ...account, ...row }, storage).write(command);
  const html = render();
  expect(button(html, "Archive")).toContain("disabled");
  expect(button(html, "Move to Trash")).toContain("disabled");
  expect(button(html, "Retry same change")).not.toContain("disabled");
  expect(button(render(row, false), "Retry same change")).toContain("disabled");
});

it("archived chats have no live-chat link, and Trash Restore expires at the actual deadline", () => {
  const archived = {
    ...row,
    status: "archived" as const,
    archivedAt: row.updatedAt,
  };
  expect(render(archived)).not.toContain('href="/meri?');
  expect(button(render(archived), "Restore")).not.toContain("disabled");
  const trashed = {
    ...row,
    status: "trashed" as const,
    trashedAt: row.updatedAt,
    restoreUntil: "2026-11-23T12:00:00.000Z",
  };
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-23T11:59:59.999Z"));
  expect(button(render(trashed), "Restore")).not.toContain("disabled");
  vi.setSystemTime(new Date(trashed.restoreUntil));
  expect(button(render(trashed), "Restore")).toContain("disabled");
  expect(render(trashed)).not.toContain("Move to Trash");
});
