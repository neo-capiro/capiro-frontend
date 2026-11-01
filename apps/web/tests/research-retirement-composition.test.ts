import { afterEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createMeriConversation } from "@capiro/meri-client/conversation";
import {
  conversationIntentJournal,
  conversationSelectionOwner,
} from "../src/shared/meri-conversations/query-journal";
import { clearMeriConversationRecovery } from "../src/shared/meri-conversations/conversation-recovery";
import { researchSelection } from "../src/shared/meri-conversations/research-context";
import {
  syncMeriTabIdentity,
  TabJournalUnavailable,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import {
  context,
  history,
  status,
} from "../test/browser/meri-conversation-fixtures";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach((dispose) => dispose()));
const capture = {
  kind: "research_portfolio" as const,
  researchPortfolioId: "00000000-0000-4000-8000-000000000005",
  researchPortfolioName: "Synthetic Research",
  researchPortfolioRevision: 1,
  scopeVersion: "a".repeat(64),
};
const research = researchSelection(context, context.conversationId, capture);
const bound = { ...context, selectedClientId: null, ...research };
function storage(): TabStorage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

it.each(["completed", "running"] as const)(
  "Research retirement retains capture and requires completed SDK history (%s)",
  async (state) => {
    const cache = new QueryClient(),
      store = storage();
    cleanup.push(() => cache.clear());
    syncMeriTabIdentity("synthetic-research-retirement", store);
    const selection = conversationSelectionOwner(
      cache,
      context,
      null,
      context.conversationId,
      store,
      research,
    );
    selection.record(bound);
    const other = conversationSelectionOwner(cache, context, null, "other");
    const request = history().request;
    const old = conversationIntentJournal(cache, bound, store);
    old.write({
      submit: {
        requestId: request.requestId,
        prompt: request.prompt,
        state: "unknown",
        workflow: "initial",
      },
    });
    clearMeriConversationRecovery(cache, { ...bound, clientId: null }, store);
    expect(cache.getQueryCache().getAll()).toHaveLength(1);
    expect(other.hints.conversationId).toBe("other");
    selection.record(bound);
    expect(cache.getQueryCache().getAll()).toHaveLength(1);
    expect(old.current()).toBe(false);
    const fresh = conversationIntentJournal(cache, bound, store);
    expect(fresh.recoveryBlocked).toBe(true);
    expect(fresh.read()).toEqual({});
    expect(() => old.write({})).toThrow(TabJournalUnavailable);

    const scopes: ReturnType<typeof history>["run"]["scopes"] = [
      {
        tenantId: bound.tenantId,
        kind: "private-user",
        resourceId: bound.actorId,
        policyRevision: "policy1",
      },
    ];
    const body = history([{ ...status(1, state), scopes }], { state });
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ ...body, run: { ...body.run, scopes } }),
    );
    const sdk = createMeriConversation({
      context: bound,
      credential: `action_session_${"s".repeat(43)}`,
      expiresAtMs: Date.now() + 60_000,
      signal: new AbortController().signal,
      isCurrent: () => true,
      onAccessLost: vi.fn(),
      fetchImpl: fetcher,
    });
    cleanup.push(() => sdk.dispose());
    await sdk.history({ after: 0, limit: 100 });
    expect(
      fresh.acknowledgeCompletedRetirement({ ...sdk, context: bound }),
    ).toBe(state === "completed");
    expect(fresh.recoveryBlocked).toBe(state !== "completed");
    expect(fresh.read().submit?.requestId).toBe(
      state === "completed" ? request.requestId : undefined,
    );
    expect(bound.scope).toEqual(capture);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls.at(0)?.[0])).toContain("/history");
  },
);
