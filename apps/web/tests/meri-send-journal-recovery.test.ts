import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import {
  createMeriConversation,
  ConversationUnavailable,
} from "@capiro/meri-client/conversation";
import { createInitialDraftOwner } from "../src/shared/meri-conversations/initial-draft";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import { RunStatus } from "../src/features/meri/conversation/RunStatus";
import type { useLiveRun } from "../src/features/meri/conversation/useLiveRun";

// Acceptance 2 Nov: a capture left on an answered run made Enter do nothing; after "Check again" released a message,
// the session client still held it and refused the next one locally ("Delivery is uncertain … could not finish");
// an uncertain request whose retry could only fail again had no way out.

const buttons = vi.hoisted(() => [] as Array<{ children: ReactNode }>);
vi.mock("@capiro/ui/button", () => ({
  Button: (props: { onClick: () => void; children: ReactNode }) => {
    buttons.push(props);
    return createElement("button", { onClick: props.onClick }, props.children);
  },
}));
afterEach(() => {
  buttons.length = 0;
});

const tenantId = "10000000-0000-4000-8000-000000000001";
const actorId = "10000000-0000-4000-8000-000000000002";
const conversationId = "20000000-0000-4000-8000-000000000003";
function memory(): TabStorage {
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
  syncMeriTabIdentity("synthetic-send-journal", storage);
  return storage;
}

it("a capture left on a finished run settles from the run's admitted request instead of swallowing later sends", () => {
  const storage = memory();
  const scope = { tenantId, actorId, clientId: null, conversationId };
  const context = {
    tenantId,
    actorId,
    selectedClientId: null,
    conversationId,
    runId: "30000000-0000-4000-8000-000000000005",
  };
  const request = {
    requestId: "40000000-0000-4000-8000-000000000006",
    prompt: "First question",
  };
  const delivered = createInitialDraftOwner(scope, storage);
  delivered.edit("First question");
  delivered.begin(context, request, "First question");
  expect(delivered.hasPending(context)).toBe(true);
  expect(delivered.settleTerminal(context, request.requestId)).toBe(true);
  expect(delivered.hasPending(context)).toBe(false);
  expect(delivered.draft()).toBe("");
  // Never admitted to this run: released, and the person's text stays.
  const other = createInitialDraftOwner(scope, storage);
  other.edit("Kept text");
  other.begin(context, { ...request, prompt: "Kept text" }, "Kept text");
  expect(
    other.settleTerminal(context, "40000000-0000-4000-8000-0000000000ff"),
  ).toBe(false);
  expect(other.hasPending(context)).toBe(false);
  expect(other.draft()).toBe("Kept text");
});

it("a released uncertain request leaves the session client too, so the next message is not refused locally", async () => {
  const paths: string[] = [];
  const client = createMeriConversation({
    context: {
      tenantId: "synthetic-tenant",
      actorId: "synthetic-actor",
      conversationId,
      runId: "30000000-0000-4000-8000-000000000007",
      selectedClientId: null,
    },
    credential: `action_session_${"s".repeat(43)}`,
    expiresAtMs: Date.now() + 60_000,
    signal: new AbortController().signal,
    isCurrent: () => true,
    onAccessLost: vi.fn(),
    fetchImpl: (async (input: RequestInfo | URL) => {
      paths.push(String(input));
      return new Response(
        JSON.stringify({ error: { code: "CONVERSATION_UNAVAILABLE" } }),
        { status: 503, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch,
  });
  const request = (n: number) => ({
    requestId: `40000000-0000-4000-8000-00000000001${n}`,
    prompt: "Hello",
  });
  const rejection = (promise: Promise<unknown>) =>
    promise.then(
      () => {
        throw new Error("expected a rejection");
      },
      (cause: ConversationUnavailable) => cause,
    );
  await rejection(client.submit(request(1)));
  expect(client.getSnapshot().submit).toBe("unknown");
  // Before: the retained request refused every later message of this run as "retained-submit-intent".
  expect((await rejection(client.submit(request(2)))).code).toBe(
    "retained-submit-intent",
  );
  client.releaseSubmit();
  expect(client.getSnapshot().submit).toBe("idle");
  paths.length = 0;
  await rejection(client.submit(request(3)));
  expect(paths).toEqual(["/api/conversations/input/admit"]);
});

it("an uncertain request whose retry was answered and still failed can be discarded", () => {
  const status = (error: string | undefined, failure?: string) =>
    renderToStaticMarkup(
      createElement(RunStatus, {
        run: {
          snapshot: { status: "ready", observation: null, cancelReceipt: null },
          intent: {
            submit: {
              requestId: "40000000-0000-4000-8000-000000000007",
              prompt: "Hello",
              state: "unknown",
            },
          },
          busy: false,
          error,
          failure,
          refusal: undefined,
          transcript: "loaded",
          observing: "idle",
        } as unknown as ReturnType<typeof useLiveRun>,
        active: false,
        onDiscardUncertain: vi.fn(),
      }),
    );
  expect(status(undefined)).not.toContain("Discard and write a new message");
  expect(status("REQUEST_REPLAY_REFUSED")).toContain(
    "Discard and write a new message",
  );
  // Control not answering keeps only the plain retry.
  expect(status("CONVERSATION_UNAVAILABLE", "unreachable")).not.toContain(
    "Discard and write a new message",
  );
});
