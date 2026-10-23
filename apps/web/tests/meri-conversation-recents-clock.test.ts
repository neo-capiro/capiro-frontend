import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { createContext, runInContext, runInNewContext } from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { conversationLabel } from "../src/shared/meri-conversations/conversation-navigation";
import { ConversationRecents } from "../src/shared/shell/ConversationRecents";
import {
  SessionContext,
  type SessionState,
} from "../src/shared/session/SessionContext";

const fixture = vi.hoisted(() => ({
  identity: true,
  selected: true,
  unavailable: false,
  loading: false,
  createdAt: "2026-10-13T00:00:00Z",
  discovery: vi.fn(),
}));
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => ({
    isSuccess: fixture.identity,
    isFetching: false,
    data: { tenant: { id: "tenant" }, user: { id: "actor" } },
  }),
}));
vi.mock("../src/shared/meri-conversations/useManagedConversations", () => ({
  useManagedConversations: (...args: unknown[]) => {
    fixture.discovery(...args);
    return {
      current: !fixture.unavailable && !fixture.loading,
      query: {
        isPending: fixture.loading,
        isFetching: false,
        hasNextPage: false,
        data: {
          pages: [
            {
              conversations: [
                {
                  conversationId: "conversation",
                  clientId: fixture.selected ? "client" : null,
                  scopeKind: fixture.selected ? "client" : "general",
                  title: "Synthetic saved title",
                },
              ],
            },
          ],
        },
      },
    };
  },
}));

const require = createRequire(import.meta.url);
const clockBundle = readFileSync(
  require.resolve("playwright-core/lib/coreBundle"),
  "utf8",
);
// Exercise the installed pinned clock's actual Intl adapter, without launching a browser.
const clockLiteral = clockBundle
  .split("\n")
  .find(
    (line) =>
      line.trim().startsWith("source = ") &&
      line.includes("packages/injected/src/clock.ts"),
  )!
  .trim()
  .slice("source = ".length)
  .replace(/;$/, "");
const clockSource = runInNewContext(clockLiteral, {}, { timeout: 1_000 });
const temporalSource = readFileSync(
  join(dirname(require.resolve("temporal-polyfill")), "global.js"),
  "utf8",
);
const NativeDate = Date;
const nativeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});
const orders = [
  "native",
  "clock",
  "Temporal",
  "clock before Temporal",
  "Temporal before clock",
] as const;

function globalsFor(order: (typeof orders)[number]) {
  const context = createContext({ module: { exports: {} } });
  runInContext(clockSource, context);
  const clock = () =>
    runInContext(
      "const testClock = {now: () => 1791849600000}; Date = createDate(testClock, Date); Intl = createIntl(testClock, Intl);",
      context,
    );
  if (order.startsWith("clock")) clock();
  if (order.includes("Temporal")) runInContext(temporalSource, context);
  if (order === "Temporal before clock") clock();
  return runInContext("({Date, Intl})", context) as {
    Date: typeof Date;
    Intl: typeof Intl;
  };
}

function render(session: SessionState = "signed-in", enabled = true) {
  return renderToStaticMarkup(
    createElement(
      SessionContext.Provider,
      { value: session },
      createElement(ConversationRecents, { enabled }),
    ),
  );
}

beforeEach(() => {
  Object.assign(fixture, {
    identity: true,
    selected: true,
    unavailable: false,
    loading: false,
    createdAt: "2026-10-13T00:00:00Z",
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it.each(orders)(
  "canonical date labels and titled recents preserve scope with %s",
  (order) => {
    const globals = globalsFor(order);
    vi.stubGlobal("Date", globals.Date);
    vi.stubGlobal("Intl", globals.Intl);
    expect(typeof new Intl.DateTimeFormat("en").format).toBe(
      order === "clock before Temporal" ? "undefined" : "function",
    );
    for (const createdAt of [
      "2026-10-13T00:00:00Z",
      "2028-02-29T23:59:00Z",
      "1970-01-01T00:00:00Z",
    ]) {
      fixture.createdAt = createdAt;
      const html = render();
      expect(conversationLabel(createdAt)).toContain(
        `${nativeFormatter.format(new NativeDate(createdAt))} UTC`,
      );
      expect(html).toContain("Synthetic saved title");
      expect(html).toContain(
        'href="/meri?clientId=client&amp;conversationId=conversation"',
      );
      expect(fixture.discovery).toHaveBeenLastCalledWith("", "active");
    }
  },
);

it("titles never expose recents before session and current owner verification", () => {
  expect(render("signed-out")).not.toContain("Synthetic saved title");
  expect(render("signed-in", false)).not.toContain("Synthetic saved title");
  fixture.identity = false;
  expect(render()).toContain("A verified account is required.");
  expect(fixture.discovery).not.toHaveBeenCalled();
});
it("owned General recents keep their explicit scope without a selected client", () => {
  fixture.selected = false;
  const html = render();
  expect(html).toContain(
    'href="/meri?scope=general&amp;conversationId=conversation"',
  );
  expect(html).toContain("Synthetic saved title");
});

it("loading or unavailable discovery does not expose a retained dated link", () => {
  fixture.loading = true;
  expect(render()).toContain("Loading recent conversations.");
  expect(render()).not.toContain("Synthetic saved title");
  fixture.loading = false;
  fixture.unavailable = true;
  expect(render()).toContain("Recent conversations unavailable.");
  expect(render()).not.toContain("Synthetic saved title");
});
