import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createCapiroApi } from "../src/shared/capiro/http";
import { memoryReviewOperations } from "../src/shared/capiro/operations/memory-review";
import {
  MEMORY_NOTIFICATION_SCHEMA,
  receiveMemoryNotificationPage,
} from "../src/shared/meri-notifications/memory-contract";
import { NotificationsHost } from "../src/features/meri/notifications/NotificationsHost";
import type { UpdatesFeedSnapshot } from "../src/features/meri/notifications/updates-feed";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const reviewRequestId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const candidateId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

/**
 * Rendered-host regression for the bounded unread observation.
 *
 * Only the host's outer collaborators are substituted: the current-account read,
 * the two owner acknowledgement reads, the existing updates feed, the saved
 * preferences controller and the two owner client factories. The owner copy, the
 * bulk/per-row action wiring and `useMemoryNotificationActions` are the real code.
 *
 * jsdom and @testing-library are not resolvable here, so the host is mounted with
 * `renderToStaticMarkup` and effects do not run. These are controlled owner replies,
 * not a live or database check: no Core, network or 1,001-row scan is involved.
 */
const observed = vi.hoisted(() => ({
  identity: {
    data: {
      tenant: { id: "synthetic-tenant" },
      user: { id: "synthetic-user" },
    },
    loading: false,
    error: null as unknown,
  },
  unread: {
    data: { enabled: true, count: 0 } as
      | { enabled: boolean; count: number }
      | undefined,
    loading: false,
    error: null as unknown,
    reload: () => undefined,
  },
  pending: false,
  mutationError: null as unknown,
  snapshot: null as unknown,
}));

vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (operation: string) =>
    operation === "me.read" ? observed.identity : observed.unread,
  useCapiroMutation: () => ({
    pending: observed.pending,
    error: observed.mutationError,
    run: async () => ({ ok: true }),
  }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({}) }));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => ({ state: "no-selection" }),
}));
vi.mock("../src/shared/meri-runs/client", () => ({
  createRunsClient: () => ({}),
}));
vi.mock("../src/shared/meri-notifications/memory-client", () => ({
  createMemoryNotificationsClient: () => ({}),
}));
vi.mock("../src/shared/meri-user-preferences/journal", () => ({
  userPreferencesJournal: () => ({ current: {} }),
}));
vi.mock("../src/shared/meri-user-preferences/transport", () => ({
  userPreferencesTransport: () => ({}),
}));
vi.mock("../src/shared/meri-user-preferences/controller", () => ({
  UserPreferencesController: class {
    snapshot = () => ({
      status: "empty",
      message: "Load your personal Meri preferences.",
    });
    subscribe = () => () => undefined;
    attach = () => () => undefined;
    load = async () => undefined;
    save = async () => undefined;
    adoptCurrent = () => undefined;
  },
}));
vi.mock("../src/features/meri/notifications/useUpdatesFeed", () => ({
  useUpdatesFeed: () => ({
    snapshot: observed.snapshot,
    loadMore: async () => undefined,
    refresh: async () => undefined,
    release: () => undefined,
    scope: { kind: "general" },
  }),
}));

/** One required memory-review notice that the feed has observed as unread. */
function unreadNotice() {
  return {
    id,
    reviewRequestId,
    candidateId,
    clientId: null,
    eventType: "review_assigned",
    title: "Memory review assignment",
    readAt: null,
    createdAt: "2026-10-28T09:00:00.000Z",
  };
}

function observedFeed(items: Record<string, unknown>[]): UpdatesFeedSnapshot {
  return {
    notifications: {
      state: "observed",
      value: receiveMemoryNotificationPage({
        schemaVersion: MEMORY_NOTIFICATION_SCHEMA,
        enabled: true,
        items,
        nextCursor: null,
      }),
    },
    runs: { state: "observed", value: [] },
    refreshing: false,
    scopeVerified: true,
    moreError: "",
    reads: 1,
  };
}

/** Attribute names of the rendered control carrying this exact label. */
function controlAttributes(markup: string, label: string): Set<string> {
  const end = markup.indexOf(`>${label}</button>`);
  if (end < 0) throw new Error(`No "${label}" control was rendered`);
  const start = markup.lastIndexOf("<button", end);
  const tag = markup.slice(start, markup.indexOf(">", start));
  const matches = [...tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)];
  return new Set(matches.map((match) => String(match[1])));
}

function renderHost() {
  return renderToStaticMarkup(
    createElement(NotificationsHost, { unavailable: "" }),
  );
}

/** Claims a bounded observation of a limited scan can never support. */
const claimPatterns = [
  /mark all/i,
  /all read/i,
  /caught up/i,
  /nothing unread/i,
];

beforeEach(() => {
  observed.identity = {
    data: {
      tenant: { id: "synthetic-tenant" },
      user: { id: "synthetic-user" },
    },
    loading: false,
    error: null,
  };
  observed.unread = {
    data: { enabled: true, count: 0 },
    loading: false,
    error: null,
    reload: () => undefined,
  };
  observed.pending = false;
  observed.mutationError = null;
  observed.snapshot = observedFeed([]);
});

describe("canonical memory notification acknowledgements", () => {
  it("sends one acknowledgement and rejects an unconfirmed response without a retry", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ ok: false }));
    const api = createCapiroApi(memoryReviewOperations, { fetcher });
    await expect(
      api.request("memory.notifications.read", { params: { id } }),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      params: { id },
    });
  });
  it("accepts the actual unread count and acknowledgement receipts", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ enabled: true, count: 27 }))
      .mockResolvedValueOnce(Response.json({ ok: true, updated: 27 }));
    const api = createCapiroApi(memoryReviewOperations, { fetcher });
    expect(await api.request("memory.notifications.unread", {})).toEqual({
      enabled: true,
      count: 27,
    });
    expect(await api.request("memory.notifications.readAll", {})).toEqual({
      ok: true,
      updated: 27,
    });
  });
  it("does not accept caller-selected authority or a fabricated unread count", () => {
    expect(
      memoryReviewOperations["memory.notifications.read"].request.safeParse({
        params: { id },
        body: { tenantId: id },
      }).success,
    ).toBe(false);
    for (const count of [-1, 0.5, "4"])
      expect(
        memoryReviewOperations[
          "memory.notifications.unread"
        ].response.safeParse({ enabled: true, count }).success,
      ).toBe(false);
  });
  it("retires the authenticated API lifetime on an expired session", async () => {
    const expired = vi.fn(),
      fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ message: "Expired" }, { status: 401 }),
        );
    const api = createCapiroApi(memoryReviewOperations, {
      fetcher,
      onSessionExpired: expired,
    });
    await expect(
      api.request("memory.notifications.readAll", {}),
    ).rejects.toThrow();
    expect(expired).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("bounded unread observation in the notifications host", () => {
  it("presents the owner count as a limited recent observation, never a total", () => {
    observed.unread.data = { enabled: true, count: 1000 };
    const markup = renderHost();
    expect(markup).toContain(
      "Recent check found 1000 unread memory-review notifications.",
    );
    expect(markup).toContain("Older unread notifications may not be included.");
    expect(markup).toContain("Mark recent memory reviews read");
    for (const claim of claimPatterns) expect(markup).not.toMatch(claim);
    // Observed unread rows stay actionable through the bounded action.
    expect(
      controlAttributes(markup, "Mark recent memory reviews read").has(
        "disabled",
      ),
    ).toBe(false);
  });

  it("keeps a visible unread row and its own action when the bounded count is zero", () => {
    observed.unread.data = { enabled: true, count: 0 };
    observed.snapshot = observedFeed([unreadNotice()]);
    const markup = renderHost();
    expect(markup).toContain(
      "Recent check found 0 unread memory-review notifications.",
    );
    expect(markup).toContain("Older unread notifications may not be included.");
    // The filtered-prefix row is neither suppressed nor stripped of its owner link.
    expect(markup).toContain("Memory review assignment");
    expect(markup).toContain(`href="/meri/memory/review/${reviewRequestId}"`);
    expect(markup).toContain("not read");
    // A zero observation is scoped to the recent set, not an empty population.
    expect(markup).toContain("was unread before that check");
    for (const claim of claimPatterns) expect(markup).not.toMatch(claim);
    // The per-row acknowledgement is never gated on the sampled count.
    expect(controlAttributes(markup, "Mark read").has("disabled")).toBe(false);
    // The zero step on the bulk control is presentation-only; the row stays actionable.
    expect(
      controlAttributes(markup, "Mark recent memory reviews read").has(
        "disabled",
      ),
    ).toBe(true);
  });

  it("disables both acknowledgements while an owner write is pending", () => {
    observed.unread.data = { enabled: true, count: 3 };
    observed.pending = true;
    observed.snapshot = observedFeed([unreadNotice()]);
    const markup = renderHost();
    expect(controlAttributes(markup, "Mark read").has("disabled")).toBe(true);
    expect(
      controlAttributes(markup, "Mark recent memory reviews read").has(
        "disabled",
      ),
    ).toBe(true);
  });

  it("disables both acknowledgements when the owner reports notifications are not enabled", () => {
    observed.unread.data = { enabled: false, count: 0 };
    observed.snapshot = observedFeed([unreadNotice()]);
    const markup = renderHost();
    expect(markup).toContain("Memory-review notifications are not enabled.");
    expect(controlAttributes(markup, "Mark read").has("disabled")).toBe(true);
    expect(
      controlAttributes(markup, "Mark recent memory reviews read").has(
        "disabled",
      ),
    ).toBe(true);
  });
});
