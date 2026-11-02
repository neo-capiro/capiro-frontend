import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { ConversationUnavailable } from "@capiro/meri-client/conversation";
import {
  receiveConversationInputRequest,
  receiveConversationInputResponse,
} from "@capiro/meri-contracts/conversation-input";
import {
  MONTHLY_CAP_REACHED,
  describeSendRefusal,
  sendRefusal,
} from "../src/features/meri/conversation/skill-refusal";
import { controlFailure } from "../src/features/meri/conversation/control-reachability";
import { sendRequest } from "../src/features/meri/conversation/run-commands";
import { RunStatus } from "../src/features/meri/conversation/RunStatus";
import { conversationIntentJournal } from "../src/shared/meri-conversations/query-journal";
import { createInitialDraftOwner } from "../src/shared/meri-conversations/initial-draft";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
import type { useLiveRun } from "../src/features/meri/conversation/useLiveRun";

const buttons = vi.hoisted(() => [] as Array<{ children: ReactNode }>);
vi.mock("@capiro/ui/button", () => ({
  Button: (props: { onClick: () => void; children: ReactNode }) => {
    buttons.push(props);
    return createElement("button", { onClick: props.onClick }, props.children);
  },
}));
beforeEach(() => {
  buttons.length = 0;
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const message =
  "Your workspace has reached its monthly Meri limit. An admin can raise it in Settings → Usage.";
const capReached = new ConversationUnavailable(MONTHLY_CAP_REACHED, 429);
const context = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
  selectedClientId: "10000000-0000-4000-8000-000000000001",
  conversationId: "20000000-0000-4000-8000-000000000002",
  runId: "30000000-0000-4000-8000-000000000003",
};
function memory() {
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
  vi.stubGlobal("window", { sessionStorage: storage });
  syncMeriTabIdentity("synthetic-native-session", storage);
  return storage;
}

it("the vendored receiver admits a 429 monthly cap refusal, and only that status makes it definitive", async () => {
  const bytes = (value: unknown) =>
    new TextEncoder().encode(JSON.stringify(value));
  const request = receiveConversationInputRequest(
    bytes({ requestId: "40000000-0000-4000-8000-000000000004", prompt: "Hi" }),
  );
  const expected = {
    tenantId: context.tenantId,
    actorId: context.actorId,
    conversationId: context.conversationId,
    runId: context.runId,
    clientId: context.selectedClientId,
  };
  expect(
    await receiveConversationInputResponse(
      429,
      bytes({ error: { code: MONTHLY_CAP_REACHED } }),
      request,
      expected,
    ),
  ).toEqual({ error: { code: MONTHLY_CAP_REACHED } });
  expect(capReached.definitive).toBe(true);
  expect(sendRefusal(capReached)).toEqual({ code: MONTHLY_CAP_REACHED });
  expect(controlFailure(capReached)).toBeUndefined();
  for (const status of [400, 502, 503, undefined]) {
    const other = new ConversationUnavailable(MONTHLY_CAP_REACHED, status);
    expect(other.definitive).toBe(false);
    expect(sendRefusal(other)).toBeUndefined();
  }
  // Any other 429 is still control not answering.
  expect(
    controlFailure(new ConversationUnavailable("invalid-error-response", 429)),
  ).toBe("unreachable");
  expect(describeSendRefusal({ code: MONTHLY_CAP_REACHED })).toBe(message);
});

it("a reached cap releases the retained request but keeps the draft, and shows the plain sentence with no Retry", async () => {
  vi.stubGlobal("crypto", {
    randomUUID: () => "40000000-0000-4000-8000-000000000004",
  });
  const storage = memory();
  const journal = conversationIntentJournal(
    new QueryClient(),
    context,
    storage,
  );
  const record = {
    read: journal.read,
    write: (value: Parameters<typeof journal.write>[0]) => {
      journal.write(value);
    },
  };
  const draft = createInitialDraftOwner(
    { ...context, clientId: context.selectedClientId },
    storage,
  );
  draft.edit("Summarize this week");
  const port = {
    context,
    getSnapshot: () => ({ status: "ready", submit: "idle", observation: null }),
    uploads: { sendArgument: () => [] },
    submitInitial: vi.fn(async () => {
      throw capReached;
    }),
    submit: vi.fn(),
  } as unknown as MeriConversationPort;
  await expect(
    sendRequest(port, record, "Summarize this week", false, true, (request) =>
      draft.begin(context, request, "Summarize this week"),
    ),
  ).rejects.toBe(capReached);
  // Nothing was dispatched: no unknown request is retained to retry.
  expect(journal.read()).toEqual({});
  draft.release(context);
  expect(draft.draft()).toBe("Summarize this week");

  const html = renderToStaticMarkup(
    createElement(RunStatus, {
      run: {
        snapshot: { status: "ready", observation: null, cancelReceipt: null },
        intent: {},
        busy: false,
        error: MONTHLY_CAP_REACHED,
        failure: controlFailure(capReached),
        refusal: sendRefusal(capReached),
        transcript: "loaded",
        observing: "idle",
      } as unknown as ReturnType<typeof useLiveRun>,
      active: false,
      onRetry: vi.fn(),
    }),
  );
  expect(html).toContain("Your workspace has reached its monthly Meri limit.");
  expect(html).toContain("An admin can raise it in Settings → Usage.");
  expect(html).not.toContain(MONTHLY_CAP_REACHED);
  expect(html).not.toMatch(/not reachable|Retry|could not finish/);
  expect(buttons).toHaveLength(0);
});
