import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import {
  createMeriConversation,
  ConversationUnavailable,
} from "@capiro/meri-client/conversation";
import {
  ORIGINAL_INPUT_CLOSED,
  describeSendRefusal,
  sendRefusal,
} from "../src/features/meri/conversation/skill-refusal";
import { controlFailure } from "../src/features/meri/conversation/control-reachability";
import { RunStatus } from "../src/features/meri/conversation/RunStatus";
import type { useLiveRun } from "../src/features/meri/conversation/useLiveRun";

// 2 Nov preview (control :105, ~14:23Z): "Continue accepted request" after a reload re-admitted a first message whose
// original-input allocation had expired. Control answered 502 CONVERSATION_UNAVAILABLE and the composer said Capiro
// was not reachable, with a Retry that could only fail again. Contracts 0.1.52 answer 409 INITIAL_INPUT_EXPIRED.

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

const context = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
  conversationId: "20000000-0000-4000-8000-000000000002",
  runId: "30000000-0000-4000-8000-000000000003",
  selectedClientId: "10000000-0000-4000-8000-000000000001",
};
const request = (id: string) => ({
  requestId: `40000000-0000-4000-8000-00000000000${id}`,
  prompt: "Summarize the attached PDF",
});
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** One synthetic session whose answers are scripted per path; no real service is involved. */
function conversation(answer: (path: string) => Response) {
  const paths: string[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    paths.push(path);
    return answer(path);
  }) as unknown as typeof fetch;
  const onAccessLost = vi.fn();
  const client = createMeriConversation({
    context,
    credential: `action_session_${"s".repeat(43)}`,
    expiresAtMs: Date.now() + 60_000,
    signal: new AbortController().signal,
    isCurrent: () => true,
    onAccessLost,
    fetchImpl,
  });
  return { client, paths, onAccessLost };
}
const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (cause) {
    return cause as ConversationUnavailable;
  }
  throw new Error("expected a rejection");
};

it("an expired original input on admit is a definitive 409 refusal: released, never unreachable", async () => {
  const { client, paths, onAccessLost } = conversation(() =>
    json(409, { error: { code: "INITIAL_INPUT_EXPIRED" } }),
  );
  const cause = await rejection(client.submit(request("1")));
  expect(cause.code).toBe("INITIAL_INPUT_EXPIRED");
  expect(cause.status).toBe(409);
  expect(cause.definitive).toBe(true);
  expect(controlFailure(cause)).toBeUndefined();
  expect(sendRefusal(cause)).toEqual({ code: ORIGINAL_INPUT_CLOSED });
  expect(paths).toEqual(["/api/conversations/input/admit"]);
  expect(onAccessLost).not.toHaveBeenCalled();
  // Nothing is retained: the next message is an ordinary new request, not a second retained one.
  expect(client.getSnapshot().submit).toBe("idle");
  const next = await rejection(client.submit(request("2")));
  expect(next.code).not.toBe("retained-submit-intent");
  // The older 502 answer is still control not answering.
  expect(
    new ConversationUnavailable("INITIAL_INPUT_EXPIRED", 502).definitive,
  ).toBe(false);
});

it("allocate's NOT_DISPATCHED answer for an expired or foreign original input closes the conversation to that first message", async () => {
  for (const [status, code] of [
    [409, "INITIAL_INPUT_EXPIRED"],
    [408, "INITIAL_INPUT_EXPIRED"],
    [409, "INITIAL_INPUT_CONFLICT"],
  ] as const) {
    const { client, paths } = conversation(() =>
      json(status, { error: { code, outcome: "NOT_DISPATCHED" } }),
    );
    const cause = await rejection(client.submitInitial(request("3")));
    expect(cause.code, code).toBe(code);
    expect(cause.definitive, `${status} ${code}`).toBe(true);
    expect(sendRefusal(cause)).toEqual({ code: ORIGINAL_INPUT_CLOSED });
    expect(paths).toEqual(["/api/conversations/input/allocate"]);
    expect(client.getSnapshot().submit).toBe("idle");
  }
  // An uncertain allocate answer keeps the request retained for its exact retry.
  const { client } = conversation(() =>
    json(503, {
      error: { code: "INITIAL_INPUT_UNAVAILABLE", outcome: "UNKNOWN" },
    }),
  );
  const cause = await rejection(client.submitInitial(request("4")));
  expect(cause.definitive).toBe(false);
  expect(client.getSnapshot().submit).toBe("unknown");
});

it("the composer says it plainly, with no Retry and no raw code, and offers a new conversation", async () => {
  const refusal = sendRefusal(
    new ConversationUnavailable("INITIAL_INPUT_EXPIRED", 409),
  )!;
  expect(describeSendRefusal(refusal)).toBe(
    "Meri could not start this message in time, and it was not sent. Your text is back in the box.",
  );
  const html = renderToStaticMarkup(
    createElement(RunStatus, {
      run: {
        snapshot: { status: "ready", observation: null, cancelReceipt: null },
        intent: {},
        busy: false,
        error: "INITIAL_INPUT_EXPIRED",
        failure: undefined,
        refusal,
        transcript: "loaded",
        observing: "idle",
      } as unknown as ReturnType<typeof useLiveRun>,
      active: false,
      onRetry: vi.fn(),
    }),
  );
  expect(html).toContain("Meri could not start this message in time");
  expect(html).not.toMatch(
    /INITIAL_INPUT|not reachable|Retry|could not finish/,
  );
  expect(buttons).toHaveLength(0);
});

// Review of #520/#571: an original-input refusal answered to a retry cannot prove "not sent". An earlier attempt may
// have been accepted and dispatched (a lost acknowledgement, then the allocation expired or a deploy changed the run
// versions), so the request stays retained and uncertain: never "not sent", never moved to a new conversation.
it("a retry after an uncertain first send stays uncertain across expiry and across a deploy", async () => {
  for (const code of ["INITIAL_INPUT_EXPIRED", "INITIAL_INPUT_CONFLICT"]) {
    let answer = json(503, {
      error: { code: "INITIAL_INPUT_UNAVAILABLE", outcome: "UNKNOWN" },
    });
    const { client, paths } = conversation(() => answer);
    await rejection(client.submitInitial(request("8")));
    expect(client.getSnapshot().submit).toBe("unknown");
    answer = json(409, { error: { code, outcome: "NOT_DISPATCHED" } });
    const cause = await rejection(client.retrySubmit());
    expect(cause.code).toBe(code);
    expect(cause.definitive, code).toBe(false);
    expect(sendRefusal(cause)).toBeUndefined();
    expect(client.getSnapshot().submit, code).toBe("unknown");
    expect(paths).toEqual([
      "/api/conversations/input/allocate",
      "/api/conversations/input/allocate",
    ]);
  }
});

it("Continue accepted request answered with an original-input refusal keeps the request uncertain", async () => {
  const { QueryClient } = await import("@tanstack/react-query");
  const { conversationIntentJournal } =
    await import("../src/shared/meri-conversations/query-journal");
  const { syncMeriTabIdentity } =
    await import("../src/shared/meri-conversations/tab-journal");
  const { recoverRequest } =
    await import("../src/features/meri/conversation/run-commands");
  const values = new Map<string, string>();
  const storage = {
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  syncMeriTabIdentity("synthetic-original-input", storage);
  for (const status of [409, 408]) {
    const journal = conversationIntentJournal(
      new QueryClient(),
      {
        ...context,
        runId: `30000000-0000-4000-8000-00000000010${status % 10}`,
      },
      storage,
    );
    const record = { read: journal.read, write: journal.write };
    const port = {
      context,
      getSnapshot: () => ({
        status: "ready",
        submit: "idle",
        observation: { runState: "queued" },
      }),
      uploads: { sendArgument: () => [], offer: vi.fn() },
      submit: vi.fn(async () => {
        throw new ConversationUnavailable("INITIAL_INPUT_EXPIRED", status);
      }),
      submitInitial: vi.fn(),
    } as never;
    const stored = {
      requestId: "40000000-0000-4000-8000-000000000009",
      prompt: "Summarize the attached PDF",
      skill: null,
      window: null,
      windowRequest: null,
    } as never;
    const cause = (await recoverRequest(port, record, stored).catch(
      (error: unknown) => error,
    )) as ConversationUnavailable;
    expect(cause.definitive).toBe(false);
    expect(sendRefusal(cause)).toBeUndefined();
    expect(journal.read().submit).toMatchObject({
      requestId: "40000000-0000-4000-8000-000000000009",
      state: "unknown",
    });
  }
});
