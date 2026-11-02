import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { UnverifiedAccessNotice } from "../src/features/meri/conversation/ConnectionPending";
import { reconnectState } from "../src/features/meri/conversation/control-reachability";

const buttons = vi.hoisted(
  () => [] as Array<{ onClick: () => void; children: ReactNode }>,
);
vi.mock("@capiro/ui/button", () => ({
  Button: (props: { onClick: () => void; children: ReactNode }) => {
    buttons.push(props);
    return createElement("button", { onClick: props.onClick }, props.children);
  },
}));
beforeEach(() => {
  buttons.length = 0;
});
type Session = ComponentProps<typeof UnverifiedAccessNotice>["session"];
const session = (unreachable: boolean): Session =>
  ({
    accessLost: false,
    connection: {
      state: { status: "unavailable" },
      unreachable,
      unverified: true,
      retry: vi.fn(),
    },
    history: { refresh: vi.fn() },
  }) as unknown as Session;
/** Static markup escapes the notice's apostrophe. */
const text = (html: string) => html.replace(/&#x27;/g, "'");

it("a renewal control did not answer keeps the transcript notice, reconnects automatically and offers an immediate retry", () => {
  const s = session(true);
  const html = text(
    renderToStaticMarkup(createElement(UnverifiedAccessNotice, { session: s })),
  );
  expect(html).toContain("Capiro is not reachable right now.");
  expect(html).toContain("Everything above is unchanged");
  expect(html).toContain("we'll reconnect automatically");
  expect(html).not.toContain("could not confirm your access");
  expect(buttons).toHaveLength(1);
  expect(buttons[0]!.children).toBe("Retry now");
  buttons[0]!.onClick();
  expect(s.connection.retry).toHaveBeenCalledExactlyOnceWith();
  expect(s.history.refresh).toHaveBeenCalledExactlyOnceWith();
});

it("an unanswered access check keeps the manual check alone", () => {
  const html = renderToStaticMarkup(
    createElement(UnverifiedAccessNotice, { session: session(false) }),
  );
  expect(html).toContain("could not confirm your access");
  expect(html).not.toContain("reconnect automatically");
  expect(buttons[0]!.children).toBe("Check access again");
});

it("the reconnect schedule retries only while control did not answer and no attempt is in flight", () => {
  expect(reconnectState(true, "unavailable")).toBe("failing");
  expect(reconnectState(true, "connecting")).toBe("failing");
  expect(reconnectState(false, "connecting")).toBe("busy");
  expect(reconnectState(false, "idle")).toBe("busy");
  expect(reconnectState(false, "unavailable")).toBe("ok");
  expect(reconnectState(false, "ready")).toBe("ok");
});
