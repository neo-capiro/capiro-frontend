import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { createConversationComposer } from "../src/features/meri/conversation/conversation-composer";
import { MeriLiveConversation } from "../src/features/meri/conversation/MeriLiveConversation";
import { ConversationHistoryStatus } from "../src/features/meri/conversation/ConversationHistoryStatus";
import { createInitialDraftOwner } from "../src/features/meri/conversation/initial-draft";
import { turnFromEvents } from "../src/features/meri/conversation/conversation-view";
import type { useLiveRun } from "../src/features/meri/conversation/useLiveRun";

type ButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
};
const harness = vi.hoisted(() => ({
  run: undefined as ReturnType<typeof useLiveRun> | undefined,
  buttons: [] as ButtonProps[],
  composer: undefined as
    | { stopBlocked?: string | undefined; sendBlocked?: string | undefined }
    | undefined,
  lifecycleUnavailable: false,
}));
vi.mock("../src/features/meri/conversation/useLiveRun", () => ({
  useLiveRun: () => harness.run,
}));
vi.mock("../src/shared/meri-conversation-lifecycle/journal", () => ({
  lifecycleJournal: () => {
    if (harness.lifecycleUnavailable) throw Error("Synthetic storage failure");
    return {
      current: () => true,
      read: () => undefined,
      retain: vi.fn(),
      clear: vi.fn(),
    };
  },
}));
vi.mock("@capiro/ui/button", () => ({
  Button: (props: ButtonProps) => {
    harness.buttons.push(props);
    return createElement(
      "button",
      { disabled: props.disabled, onClick: props.onClick },
      props.children,
    );
  },
}));
vi.mock("../src/features/meri/conversation/ConversationFrame", () => ({
  ConversationBody: ({
    status,
    current,
  }: {
    status: ReactNode;
    current: ReactNode;
  }) => createElement("main", null, current, status),
}));
vi.mock("../src/features/meri/conversation/ConversationPanels", () => ({
  ConversationPanels: () => null,
}));
vi.mock("../src/features/meri/conversation/ConversationTurn", () => ({
  ConversationTurn: () => null,
}));

vi.mock(
  "../src/features/meri/conversation/conversation-composer",
  async (original) => ({
    ...(await original<
      typeof import("../src/features/meri/conversation/conversation-composer")
    >()),
    useLiveComposer: (
      _channel: unknown,
      view: { controls: { stopBlocked?: string | undefined } },
    ) => {
      harness.composer = view.controls;
    },
  }),
);

type LiveProps = ComponentProps<typeof MeriLiveConversation>;
type Session = ComponentProps<typeof ConversationHistoryStatus>["session"];
const context = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
  selectedClientId: "10000000-0000-4000-8000-000000000001",
  conversationId: "20000000-0000-4000-8000-000000000001",
  runId: "30000000-0000-4000-8000-000000000001",
};
const request = {
  requestId: "60000000-0000-4000-8000-000000000001",
  prompt: "Previously accepted input",
};
function liveProps(): LiveProps {
  return {
    port: { context } as LiveProps["port"],
    composer: createConversationComposer(),
    initialPrompt: undefined,
    earlier: [],
    scope: "Client",
    draft: "Next draft",
    onDraft: vi.fn(),
    initialDraft: createInitialDraftOwner(),
    textareaRef: {
      current: { focus: vi.fn() } as unknown as HTMLTextAreaElement,
    },
    onNextTurn: vi.fn(),
    onSettled: vi.fn(),
    onLifecycleTarget: vi.fn(),
    nextTurnVerified: true,
    savedCurrent: turnFromEvents(
      [],
      context,
      request.prompt,
      "completed",
      false,
    ),
  };
}
function resetRun() {
  harness.lifecycleUnavailable = false;
  harness.run = {
    snapshot: { observation: null, cancelReceipt: null },
    intent: {},
    busy: false,
    transcript: "loaded",
    observing: "idle",
    submitInitial: vi.fn(),
    submit: vi.fn(),
    cancel: vi.fn(),
    history: vi.fn(),
    recover: vi.fn(),
    reconnect: vi.fn(),
  } as unknown as ReturnType<typeof useLiveRun>;
  harness.buttons.length = 0;
  harness.composer = undefined;
}
beforeEach(resetRun);
const renderLive = (props: LiveProps) =>
  renderToStaticMarkup(createElement(MeriLiveConversation, props));
const button = (label: string) =>
  harness.buttons.find((item) => item.children === label);

it("verified terminal history offers Ready and focuses the composer without dispatching, including an observed historical submit", () => {
  const props = liveProps();
  harness.run!.intent = { submit: { ...request, state: "observed" } };
  const html = renderLive(props);
  expect(html).toContain('aria-label="Next message status"');
  expect(html).toContain("<h3>Ready</h3>");
  expect(html).toMatch(/data-tone="success">Complete<\/span>/);
  expect(html).toContain("You can send your next message.");
  const write = button("Write next message");
  expect(write).toBeDefined();
  expect(write?.disabled).not.toBe(true);
  write!.onClick();
  expect(props.textareaRef.current!.focus).toHaveBeenCalledOnce();
  expect(props.onNextTurn).not.toHaveBeenCalled();
  expect(harness.run!.submitInitial).not.toHaveBeenCalled();
  expect(harness.run!.submit).not.toHaveBeenCalled();
  expect(props.onDraft).not.toHaveBeenCalled();
});

it.each(["loading", "unavailable"] as const)(
  "acknowledged input with %s history offers readback without claiming another send",
  (state) => {
    const props = liveProps();
    props.savedCurrent = undefined;
    props.nextTurnVerified = false;
    harness.run!.snapshot = {
      ...harness.run!.snapshot,
      status: state,
      observation: null,
    };
    harness.run!.intent = { submit: { ...request, state: "observed" } };
    harness.run!.transcript = state;
    const html = renderLive(props);
    expect(html).toContain(request.prompt);
    expect(html).toContain(
      "Message accepted. Reload the transcript to check its current status.",
    );
    expect(html).not.toContain("Sending to Meri.");
    expect(html).not.toContain('aria-label="Next message status"');
    expect(button("Retry same request")).toBeUndefined();
    expect(harness.composer?.sendBlocked).toBe(
      "Reload the transcript to verify the current run.",
    );
    if (state === "unavailable") {
      button("Reload transcript")!.onClick();
      expect(harness.run!.history).toHaveBeenCalledOnce();
    }
    expect(harness.run!.submit).not.toHaveBeenCalled();
    expect(harness.run!.submitInitial).not.toHaveBeenCalled();
    expect(props.onNextTurn).not.toHaveBeenCalled();
  },
);

it.each(["pending", "unknown"] as const)(
  "%s input keeps its delivery state and send restriction without a transcript",
  (state) => {
    const props = liveProps();
    props.savedCurrent = undefined;
    harness.run!.intent = { submit: { ...request, state } };
    const html = renderLive(props);
    expect(html).not.toContain("Message accepted.");
    expect(html).toContain(
      state === "pending" ? "Sending to Meri." : "Delivery is uncertain.",
    );
    expect(harness.composer?.sendBlocked).toBe(
      state === "pending"
        ? "Your request is being sent."
        : "Delivery of your last request is uncertain. Retry it before sending another.",
    );
    if (state === "unknown") {
      button("Retry same request")!.onClick();
      expect(harness.run!.submit).toHaveBeenCalledExactlyOnceWith(
        request.prompt,
        true,
      );
    } else expect(button("Retry same request")).toBeUndefined();
    expect(props.onNextTurn).not.toHaveBeenCalled();
  },
);

it("acknowledged input does not settle an unknown Stop when history is unavailable", () => {
  const props = liveProps();
  props.savedCurrent = undefined;
  harness.run!.intent = {
    submit: { ...request, state: "observed" },
    cancel: "unknown",
  };
  harness.run!.transcript = "unavailable";
  const html = renderLive(props);
  expect(html).toContain("Stop request uncertain");
  expect(html).not.toContain("<h3>Stopped</h3>");
  button("Retry Stop")!.onClick();
  expect(harness.run!.cancel).toHaveBeenCalledOnce();
  expect(harness.run!.submit).not.toHaveBeenCalled();
  expect(props.onNextTurn).not.toHaveBeenCalled();
});

const readinessBlockers: Array<[string, (props: LiveProps) => void]> = [
  [
    "lifecycle journal storage failure",
    () => {
      harness.lifecycleUnavailable = true;
    },
  ],
  [
    "session storage failure",
    (props) => {
      props.storageError = "Draft retention unavailable";
    },
  ],
  [
    "draft storage failure",
    (props) => {
      props.initialDraft.fail();
    },
  ],
  [
    "run journal storage failure",
    () => {
      harness.run!.storageError = "Command retention unavailable";
    },
  ],
  [
    "missing verification",
    (props) => {
      delete props.nextTurnVerified;
    },
  ],
  [
    "unverified next turn",
    (props) => {
      props.nextTurnVerified = false;
    },
  ],
  [
    "unfinished turn",
    (props) => {
      props.savedCurrent = turnFromEvents(
        [],
        context,
        request.prompt,
        "running",
        false,
      );
    },
  ],
  [
    "no turn",
    (props) => {
      props.savedCurrent = undefined;
    },
  ],
  [
    "blocked availability",
    (props) => {
      props.nextTurnBlocked = "History must be checked";
    },
  ],
  [
    "pending draft ACK",
    (props) => {
      props.initialDraft.begin(context, request, props.draft);
    },
  ],
  [
    "pending cancel",
    () => {
      harness.run!.intent = { cancel: "pending" };
    },
  ],
  [
    "unknown cancel",
    () => {
      harness.run!.intent = { cancel: "unknown" };
    },
  ],
  [
    "pending submit",
    () => {
      harness.run!.intent = { submit: { ...request, state: "pending" } };
    },
  ],
  [
    "unknown submit",
    () => {
      harness.run!.intent = { submit: { ...request, state: "unknown" } };
    },
  ],
  [
    "busy command",
    () => {
      harness.run!.busy = true;
    },
  ],
];

it("Ready stays absent until verification, terminal state and all write uncertainty are resolved", () => {
  for (const [reason, configure] of readinessBlockers) {
    resetRun();
    const props = liveProps();
    configure(props);
    const html = renderLive(props);
    expect(html, reason).not.toContain('aria-label="Next message status"');
    expect(button("Write next message"), reason).toBeUndefined();
  }
});

it("saved running history cannot enable Stop until the SDK admits the exact current run", () => {
  const props = liveProps();
  props.savedCurrent = turnFromEvents(
    [],
    context,
    request.prompt,
    "running",
    false,
  );
  for (const status of ["idle", "loading", "unavailable", "ready"] as const) {
    harness.run!.snapshot = {
      ...harness.run!.snapshot,
      status,
      observation: null,
    };
    renderLive(props);
    expect(harness.composer?.stopBlocked).toBe(
      "Verify the current run before requesting Stop.",
    );
    expect(harness.run!.cancel).not.toHaveBeenCalled();
  }
  harness.run!.snapshot = {
    ...harness.run!.snapshot,
    status: "ready",
    observation: {
      after: 0,
      omittedPrefix: false,
      hasMore: false,
      events: [],
      runState: "running",
      prompt: request.prompt,
    },
  };
  renderLive(props);
  expect(harness.composer?.stopBlocked).toBeUndefined();
  expect(harness.run!.cancel).not.toHaveBeenCalled();
});

function historySession(notReady: boolean, busy = false): Session {
  return {
    history: {
      selected: true,
      unavailable: false,
      empty: false,
      query: {
        isPending: false,
        isRefetching: false,
        isFetching: false,
        hasNextPage: false,
      },
      tail: {},
      refresh: vi.fn(),
    },
    continuation: {
      notReady,
      failed: !notReady,
      busy,
      intent: { ...request, state: "unknown" },
      retry: vi.fn(),
    },
    recoveryNeeded: true,
    unknownReservation: false,
    readReservation: vi.fn(),
  } as unknown as Session;
}
const renderHistory = (session: Session) =>
  renderToStaticMarkup(createElement(ConversationHistoryStatus, { session }));

it("a not-ready turn refusal is a saved-message status with only explicit same-turn retry and busy protection", () => {
  for (const busy of [false, true]) {
    harness.buttons.length = 0;
    const session = historySession(true, busy);
    const html = renderHistory(session);
    expect(html).toContain(
      "Meri is still finishing up. Your message is saved; try again in a moment.",
    );
    expect(html).toContain('role="status"');
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain("A turn may already be in flight");
    expect(html).not.toContain("Turn recovery unavailable");
    const retry = button("Retry same turn");
    expect(retry).toBeDefined();
    expect(!!retry?.disabled).toBe(busy);
    expect(session.continuation.retry).not.toHaveBeenCalled();
    expect(session.readReservation).not.toHaveBeenCalled();
    if (!busy) {
      retry!.onClick();
      expect(session.continuation.retry).toHaveBeenCalledExactlyOnceWith();
      expect(session.readReservation).not.toHaveBeenCalled();
    }
  }
});

it("other unknown turn recovery keeps its prior uncertainty and error controls", () => {
  const session = historySession(false);
  const html = renderHistory(session);
  expect(html).toContain("A turn may already be in flight");
  expect(html).toContain('role="alert"');
  expect(html).toContain(
    "Turn recovery unavailable. No replacement turn was requested.",
  );
  expect(html).not.toContain("Your message is saved; try again in a moment.");
  expect(button("Retry same turn")).toBeUndefined();
  button("Recover same turn")!.onClick();
  expect(session.continuation.retry).toHaveBeenCalledExactlyOnceWith();
});

it("not-ready without a retained message checks the reserved turn without claiming a saved input", () => {
  const session = historySession(true);
  session.continuation.intent = undefined;
  session.recoveryNeeded = false;
  session.unknownReservation = true;
  const html = renderHistory(session);
  expect(html).toContain("The original message identity is unavailable");
  expect(html).not.toContain("Your message is saved; try again in a moment.");
  expect(button("Retry same turn")).toBeUndefined();
  const check = button("Check reserved turn");
  expect(check).toBeDefined();
  expect(session.readReservation).not.toHaveBeenCalled();
  check!.onClick();
  expect(session.readReservation).toHaveBeenCalledExactlyOnceWith();
  expect(session.continuation.retry).not.toHaveBeenCalled();
});
