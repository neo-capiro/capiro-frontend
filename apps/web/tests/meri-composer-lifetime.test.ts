import { afterEach, expect, it, vi } from "vitest";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SessionComposer } from "../src/features/meri/conversation/ConversationView";
import {
  createConversationComposer,
  useLiveComposer,
} from "../src/features/meri/conversation/conversation-composer";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";

const harness = vi.hoisted(() => ({
  submit: undefined as
    | ComponentProps<
        typeof import("@capiro/ui/prompt-input").PromptInput
      >["onSubmit"]
    | undefined,
  effects: [] as Array<() => void | (() => void)>,
}));
vi.mock("@capiro/ui/prompt-input", async (original) => {
  const actual = await original<typeof import("@capiro/ui/prompt-input")>();
  return {
    ...actual,
    PromptInput: (props: ComponentProps<typeof actual.PromptInput>) => {
      harness.submit = props.onSubmit;
      return createElement(actual.PromptInput, props);
    },
  };
});
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useLayoutEffect: (effect: () => void | (() => void)) => {
    harness.effects.push(effect);
  },
}));
afterEach(() => {
  harness.submit = undefined;
  harness.effects = [];
});

type Session = ComponentProps<typeof SessionComposer>["session"];
const context = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
  selectedClientId: "synthetic-client",
  conversationId: "synthetic-conversation",
  runId: "synthetic-run",
};
const port = () => ({ context }) as MeriConversationPort;
const controls = () => ({
  onSend: vi.fn(),
  onStop: vi.fn(),
  scope: "Synthetic client",
  attachUnavailable: "Attachments unavailable",
});
function session(current?: MeriConversationPort): Session {
  return {
    selectedId: context.conversationId,
    accessLost: false,
    connection: { state: { status: current ? "ready" : "connecting" } },
    ready: current
      ? { port: current, lifetimeKey: JSON.stringify(current.context) }
      : undefined,
    draft: "Typed during connection",
    setDraft: vi.fn(),
    textarea: { current: null },
  } as unknown as Session;
}
function render(
  channel: ReturnType<typeof createConversationComposer>,
  value: Session,
) {
  return renderToStaticMarkup(
    createElement(SessionComposer, {
      channel,
      session: value,
      scope: "Synthetic client",
    }),
  );
}
function explicitSend() {
  const preventDefault = vi.fn();
  harness.submit!(
    {
      text: "Ignored widget text; the current draft owns the request",
      files: [],
    },
    { preventDefault } as never,
  );
  expect(preventDefault).toHaveBeenCalledOnce();
}
const sendButton = (html: string) =>
  html.match(/<button[^>]*aria-label="Send message"[^>]*>/i)?.[0];

it("connecting and unpublished ready views preserve the draft and refuse even an explicit form submit", () => {
  const channel = createConversationComposer();
  for (const value of [session(), session(port())]) {
    const html = render(channel, value);
    expect(html).toContain("Typed during connection</textarea>");
    expect(html.match(/<textarea[^>]*>/i)?.[0]).not.toMatch(/readonly/i);
    expect(sendButton(html)).toMatch(/\sdisabled(?:=|\s|>)/i);
    expect(html).toContain("Connecting to Meri.");
    explicitSend();
    expect(value.setDraft).not.toHaveBeenCalled();
  }
  expect(channel.read()).toBeNull();
});

it("only the exact current port's committed controls allow an explicit send, never rendering alone", () => {
  const channel = createConversationComposer();
  const current = port();
  const handlers = controls();
  channel.publish({ port: current, controls: handlers, running: false });
  const html = render(channel, session(current));
  expect(sendButton(html)).not.toMatch(/\sdisabled(?:=|\s|>)/i);
  expect(html).toContain("Typed during connection</textarea>");
  expect(handlers.onSend).not.toHaveBeenCalled();
  explicitSend();
  expect(handlers.onSend).toHaveBeenCalledOnce();
  expect(handlers.onStop).not.toHaveBeenCalled();
});

it.each(["renewed", "expired", "revoked", "superseded"])(
  "%s session cannot use previously published controls",
  (state) => {
    const channel = createConversationComposer();
    const original = port();
    const handlers = controls();
    channel.publish({ port: original, controls: handlers, running: true });
    const value = session(state === "renewed" ? port() : original);
    if (state === "expired") {
      value.ready = undefined;
      value.connection.state = { status: "expired" };
    }
    if (state === "revoked") value.accessLost = true;
    if (state === "superseded")
      value.latestTarget = {
        tenantId: context.tenantId,
        actorId: context.actorId,
        conversationId: context.conversationId,
        runId: "new-run",
        attemptId: "synthetic-next-attempt",
        workerId: "synthetic-next-worker",
        writerFence: 2,
      };
    const html = render(channel, value);
    expect(sendButton(html)).toMatch(/\sdisabled(?:=|\s|>)/i);
    expect(html).not.toContain('aria-label="Stop run"');
    if (state === "revoked") expect(html).not.toContain(value.draft);
    else expect(html).toContain(value.draft);
    explicitSend();
    expect(handlers.onSend).not.toHaveBeenCalled();
    expect(handlers.onStop).not.toHaveBeenCalled();
  },
);

it("busy, storage and uncertain-delivery controls remain blocked, and an empty acknowledged draft never resends", () => {
  const channel = createConversationComposer();
  const current = port();
  const handlers = controls();
  for (const reason of [
    "Meri is still handling your last command.",
    "Draft retention unavailable",
    "Delivery of your last request is uncertain.",
  ]) {
    channel.publish({
      port: current,
      running: false,
      controls: { ...handlers, sendBlocked: reason },
    });
    const html = render(channel, session(current));
    expect(sendButton(html)).toMatch(/\sdisabled(?:=|\s|>)/i);
    expect(html).toContain(reason);
    explicitSend();
  }
  channel.publish({ port: current, running: false, controls: handlers });
  const empty = { ...session(current), draft: "" };
  expect(sendButton(render(channel, empty))).toMatch(/\sdisabled(?:=|\s|>)/i);
  explicitSend();
  expect(handlers.onSend).not.toHaveBeenCalled();
});

it("publishes only after commit and old cleanup cannot retire newer controls for the same port", () => {
  const channel = createConversationComposer();
  const current = port();
  const old = { port: current, running: false, controls: controls() };
  const next = { ...old, controls: controls() };
  const notified = vi.fn();
  const detach = channel.subscribe(notified);
  function Publisher() {
    useLiveComposer(channel, old);
    return null;
  }
  renderToStaticMarkup(createElement(Publisher));
  expect(channel.read()).toBeNull();
  expect(notified).not.toHaveBeenCalled();
  const cleanup = harness.effects[0]!();
  expect(channel.read()).toBe(old);
  const retire = channel.publish(next);
  if (typeof cleanup !== "function")
    throw new Error("Missing publisher cleanup");
  cleanup();
  expect(channel.read()).toBe(next);
  expect(notified).toHaveBeenCalledTimes(2);
  retire();
  expect(channel.read()).toBeNull();
  expect(sendButton(render(channel, session(current)))).toMatch(
    /\sdisabled(?:=|\s|>)/i,
  );
  explicitSend();
  expect(old.controls.onSend).not.toHaveBeenCalled();
  expect(next.controls.onSend).not.toHaveBeenCalled();
  detach();
  channel.publish(old);
  expect(notified).toHaveBeenCalledTimes(3);
});
