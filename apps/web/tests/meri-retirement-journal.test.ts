import { afterEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createMeriConversation } from "@capiro/meri-client/conversation";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
import {
  conversationIntentJournal,
  type ConversationIntent,
} from "../src/shared/meri-conversations/query-journal";
import { clearMeriConversationRecovery } from "../src/shared/meri-conversations/conversation-recovery";
import {
  syncMeriTabIdentity,
  TabJournalUnavailable,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import { feedbackRecovery } from "../src/shared/meri-feedback/recovery";
import { feedbackRequest } from "./meri-feedback-fixtures";
import {
  context,
  history,
  status,
} from "../test/browser/meri-conversation-fixtures";

const scope = { ...context, clientId: context.selectedClientId };
const request = {
  requestId: history().request.requestId,
  prompt: history().request.prompt,
};
const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach((dispose) => dispose()));
function fixture(
  state: NonNullable<ConversationIntent["submit"]>["state"] = "unknown",
  cancel?: ConversationIntent["cancel"],
) {
  const values = new Map<string, string>();
  const storage: TabStorage = {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
  syncMeriTabIdentity("synthetic-retirement", storage);
  const cache = new QueryClient();
  cleanup.push(() => cache.clear());
  const old = conversationIntentJournal(cache, context, storage);
  old.write({
    submit: { ...request, state, workflow: "initial" },
    ...(cancel ? { cancel } : {}),
  });
  const key = [...values.keys()].find((key) => key.includes('"request"'))!;
  return {
    storage,
    cache,
    values,
    key,
    old,
    retire: () => clearMeriConversationRecovery(cache, scope, storage),
    fresh: () => conversationIntentJournal(cache, context, storage),
  };
}
async function completedPort() {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json(history([status(1, "completed")], { state: "completed" })),
  );
  const sdk = createMeriConversation({
    context,
    credential: `action_session_${"s".repeat(43)}`,
    expiresAtMs: Date.now() + 60_000,
    signal: new AbortController().signal,
    isCurrent: () => true,
    onAccessLost: vi.fn(),
    fetchImpl: fetcher,
  });
  cleanup.push(() => sdk.dispose());
  await sdk.history({ after: 0, limit: 100 });
  return { ...sdk, context, fetcher } as MeriConversationPort & {
    fetcher: typeof fetcher;
  };
}

it.each(["pending", "unknown", "observed"] as const)(
  "a retired %s request needs completed history and never becomes unsent",
  async (state) => {
    const f = fixture(state);
    f.retire();
    const raw = f.storage.getItem(f.key)!;
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      scope: JSON.stringify([
        context.tenantId,
        context.actorId,
        context.selectedClientId,
        context.conversationId,
      ]),
      key: f.key,
      requestId: request.requestId,
      retired: true,
    });
    expect(raw).not.toContain(request.prompt);
    f.retire(); // Repeated revocation preserves the intentional marker, never reconstructs text.
    const fresh = f.fresh(),
      port = await completedPort();
    expect(fresh.recoveryBlocked).toBe(true);
    expect(fresh.read()).toEqual({});
    expect(() => fresh.write({})).toThrow(TabJournalUnavailable);
    expect(fresh.acknowledgeCompletedRetirement(port)).toBe(true);
    expect(fresh.current()).toBe(true);
    expect(fresh.read().submit).toEqual({ ...request, state: "observed" });
    expect(fresh.acknowledgeCompletedRetirement(port)).toBe(false);
    expect(f.old.current()).toBe(false);
    expect(() => f.old.write({})).toThrow(TabJournalUnavailable);
    expect(port.fetcher).toHaveBeenCalledTimes(1);
  },
);

it.each([
  "tenantId",
  "actorId",
  "selectedClientId",
  "conversationId",
  "runId",
] as const)("foreign %s history cannot resolve this journal", async (field) => {
  const f = fixture();
  f.retire();
  const fresh = f.fresh(),
    port = await completedPort();
  expect(
    fresh.acknowledgeCompletedRetirement({
      ...port,
      context: { ...context, [field]: "foreign-synthetic" },
    }),
  ).toBe(false);
  expect(fresh.recoveryBlocked).toBe(true);
});

it.each([
  "queued",
  "running",
  "paused",
  "waiting-for-approval",
  "failed",
  "cancelled",
] as const)("%s observation does not settle retirement", async (runState) => {
  const f = fixture();
  f.retire();
  const fresh = f.fresh(),
    port = await completedPort(),
    snapshot = port.getSnapshot();
  expect(
    fresh.acknowledgeCompletedRetirement({
      ...port,
      getSnapshot: () => ({
        ...snapshot,
        observation: { ...snapshot.observation!, runState },
      }),
    }),
  ).toBe(false);
  expect(fresh.current()).toBe(false);
});

it.each(["idle", "loading", "unavailable", "disposed"] as const)(
  "%s port cannot acknowledge retirement",
  async (state) => {
    const f = fixture();
    f.retire();
    const fresh = f.fresh(),
      port = await completedPort(),
      snapshot = port.getSnapshot();
    expect(
      fresh.acknowledgeCompletedRetirement({
        ...port,
        getSnapshot: () => ({ ...snapshot, status: state }),
      }),
    ).toBe(false);
  },
);

it.each(["pending", "unknown"] as const)(
  "unresolved %s submit/cancel and original cancellation stay blocked",
  async (state) => {
    const port = await completedPort(),
      snapshot = port.getSnapshot();
    for (const operation of ["submit", "cancel"] as const) {
      const f = fixture();
      f.retire();
      const fresh = f.fresh();
      expect(
        fresh.acknowledgeCompletedRetirement({
          ...port,
          getSnapshot: () => ({ ...snapshot, [operation]: state }),
        }),
      ).toBe(false);
    }
    const cancelled = fixture("observed", state);
    cancelled.retire();
    expect(cancelled.storage.getItem(cancelled.key)).toBe("null");
    expect(cancelled.fresh().acknowledgeCompletedRetirement(port)).toBe(false);
  },
);

it.each(["observation", "acceptedRequest"] as const)(
  "missing %s cannot resolve retirement",
  async (field) => {
    const f = fixture();
    f.retire();
    const fresh = f.fresh(),
      port = await completedPort(),
      snapshot = port.getSnapshot();
    expect(
      fresh.acknowledgeCompletedRetirement({
        ...port,
        getSnapshot: () => ({ ...snapshot, [field]: null }),
      }),
    ).toBe(false);
  },
);

it.each(["legacy-null", "json", "version", "extra", "scope", "key", "payload"])(
  "invalid %s record remains closed before and after revocation",
  async (kind) => {
    const f = fixture();
    const original = JSON.parse(f.storage.getItem(f.key)!);
    const broken =
      kind === "legacy-null"
        ? "null"
        : kind === "json"
          ? "{"
          : JSON.stringify({
              ...original,
              ...(kind === "version" ? { version: 2 } : {}),
              ...(kind === "extra" ? { extra: true } : {}),
              ...(kind === "scope" ? { scope: "foreign" } : {}),
              ...(kind === "key" ? { key: "foreign" } : {}),
              ...(kind === "payload"
                ? {
                    value: {
                      submit: {
                        ...request,
                        state: "unknown",
                        unexpected: true,
                      },
                    },
                  }
                : {}),
            });
    f.storage.setItem(f.key, broken);
    expect(f.fresh().recoveryBlocked).toBe(true);
    f.retire();
    const fresh = f.fresh();
    expect(fresh.acknowledgeCompletedRetirement(await completedPort())).toBe(
      false,
    );
    expect(fresh.recoveryBlocked).toBe(true);
    expect(f.storage.getItem(f.key)).toBe("null");
  },
);

it.each(["scope", "identity", "cache"])(
  "retiring the %s again fences a late completed response",
  async (kind) => {
    const f = fixture();
    f.retire();
    const fresh = f.fresh(),
      port = await completedPort();
    if (kind === "scope") f.retire();
    if (kind === "identity")
      syncMeriTabIdentity("synthetic-replacement", f.storage);
    if (kind === "cache") f.cache.clear();
    expect(fresh.acknowledgeCompletedRetirement(port)).toBe(false);
    expect(fresh.current()).toBe(false);
  },
);

it("completed request readback leaves feedback uncertainty closed", async () => {
  const f = fixture();
  const feedback = feedbackRecovery(context, context.runId, f.storage);
  feedback.write({
    ...feedbackRequest,
    target: { ...feedbackRequest.target, runId: context.runId },
  });
  f.retire();
  const fresh = f.fresh();
  expect(fresh.acknowledgeCompletedRetirement(await completedPort())).toBe(
    true,
  );
  expect(feedback.current()).toBe(false);
  expect(() =>
    feedbackRecovery(context, context.runId, f.storage).read(),
  ).toThrow(TabJournalUnavailable);
});

it("a failed verified storage write cannot unblock retirement", async () => {
  const f = fixture();
  f.retire();
  const fresh = f.fresh(),
    port = await completedPort();
  f.storage.setItem = () => {
    throw new Error("Synthetic storage failure");
  };
  expect(() => fresh.acknowledgeCompletedRetirement(port)).toThrow(
    TabJournalUnavailable,
  );
  expect(fresh.recoveryBlocked).toBe(true);
  expect(fresh.current()).toBe(false);
});

it.each(["version", "requestId", "scope", "key", "retired", "extra", "value"])(
  "a changed retirement marker (%s) cannot be acknowledged",
  async (field) => {
    const f = fixture();
    f.retire();
    const marker = JSON.parse(f.storage.getItem(f.key)!);
    f.storage.setItem(
      f.key,
      JSON.stringify({ ...marker, [field]: "changed-synthetic" }),
    );
    const fresh = f.fresh();
    expect(fresh.acknowledgeCompletedRetirement(await completedPort())).toBe(
      false,
    );
    expect(fresh.recoveryBlocked).toBe(true);
  },
);

it("same-identity reload still requires positive history for the original request id", async () => {
  const f = fixture();
  f.retire();
  f.cache.clear();
  syncMeriTabIdentity("synthetic-retirement", f.storage);
  const cache = new QueryClient();
  cleanup.push(() => cache.clear());
  const fresh = conversationIntentJournal(cache, context, f.storage);
  expect(fresh.recoveryBlocked).toBe(true);
  const port = await completedPort(),
    snapshot = port.getSnapshot();
  expect(
    fresh.acknowledgeCompletedRetirement({
      ...port,
      getSnapshot: () => ({
        ...snapshot,
        acceptedRequest: {
          ...snapshot.acceptedRequest!,
          requestId: "b0000000-0000-4000-8000-00000000000b",
        },
      }),
    }),
  ).toBe(false);
  expect(fresh.acknowledgeCompletedRetirement(port)).toBe(true);
  expect(fresh.read().submit).toEqual({ ...request, state: "observed" });
});
