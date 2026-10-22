import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { ConversationView } from "../src/features/meri/conversation/ConversationView";

const buttons = vi.hoisted(
  () => [] as Array<{ onClick: () => void; children: ReactNode }>,
);
vi.mock("@capiro/ui/button", () => ({
  Button: (props: { onClick: () => void; children: ReactNode }) => {
    buttons.push(props);
    return createElement("button", { onClick: props.onClick }, props.children);
  },
}));
vi.mock("../src/features/meri/conversation/ConversationFrame", () => ({
  ConversationFrame: (props: { children: ReactNode; composer: ReactNode }) =>
    createElement("main", null, props.children, props.composer),
  ConversationBody: (props: { status: ReactNode }) => props.status,
}));
vi.mock("../src/features/meri/MeriComposer", () => ({
  MeriComposer: ({ live }: { live: { sendBlocked: string } }) =>
    live.sendBlocked,
}));
beforeEach(() => {
  buttons.length = 0;
});
type Session = ComponentProps<typeof ConversationView>["session"];
function session(status: string, accessLost = false): Session {
  return {
    accessLost,
    connection: { state: { status }, retry: vi.fn(), reopen: vi.fn() },
    earlier: [],
    draft: "",
    continuation: {},
    history: { refresh: vi.fn() },
    setDraft: () => undefined,
    textarea: { current: null },
  } as unknown as Session;
}
const render = (value: Session) =>
  renderToStaticMarkup(
    createElement(ConversationView, { session: value, scope: "Client" }),
  );

it("access loss takes priority over a newer target and explicitly retries only the existing connection selectors", () => {
  const denied = {
    ...session("expired", true),
    latestTarget: { conversationId: "newer-conversation", runId: "newer-run" },
  } as Session;
  const html = render(denied);
  expect(html).toContain("Conversation access unavailable");
  expect(html).toContain("account, client and exact conversation");
  expect(html).toContain("Verify access to this conversation before sending.");
  expect(html).not.toContain("Conversation session expired");
  expect(html).not.toContain("A newer accepted turn is available");
  expect(buttons).toHaveLength(1);
  expect(buttons[0]!.children).toBe("Check access again");
  buttons[0]!.onClick();
  expect(denied.connection.retry).toHaveBeenCalledExactlyOnceWith();
  expect(denied.connection.reopen).not.toHaveBeenCalled();
});

it("ordinary expiry and reconnecting retain their normal recovery guidance", () => {
  const expired = render(session("expired"));
  expect(expired).toContain("Conversation session expired");
  expect(expired).not.toContain("Conversation access unavailable");
  expect(buttons[0]!.children).toBe("Reconnect");
  buttons.length = 0;
  const connecting = render(session("connecting"));
  expect(connecting).toContain("Connecting to Meri.");
  expect(connecting).not.toContain("Checking conversation access");
  expect(buttons).toHaveLength(0);
  const unavailable = render(session("unavailable"));
  expect(unavailable).toContain("Conversation connection unavailable");
  expect(buttons[0]!.children).toBe("Try again");
});
