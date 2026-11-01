import { afterEach, expect, it, vi } from "vitest";
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { LiveNewConversation } from "../src/shared/shell/LiveNewConversation";

const mocks = vi.hoisted(() => ({
  session: "signed-in",
  search: "",
  clientId: "33333333-3333-4333-8333-333333333333",
  state: "authorized-client",
  status: "active",
  fetching: false,
  push: vi.fn(),
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useContext: () => mocks.session,
  useId: () => "synthetic-availability-reason",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => ({
    isSuccess: true,
    isFetching: mocks.fetching,
    error: null,
    data: {
      tenant: { id: "11111111-1111-4111-8111-111111111111" },
      user: { id: "22222222-2222-4222-8222-222222222222" },
    },
  }),
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => ({
    state: mocks.state,
    client: { id: mocks.clientId, status: mocks.status },
  }),
}));
// The asynchronous fallback is exercised with actual hooks in the browser suite.
vi.mock("../src/shared/shell/DefaultConversationStart", () => ({
  DefaultConversationStart: ({
    children,
  }: {
    children: (value: { disabled: boolean; title: string }) => ReactNode;
  }) => children({ disabled: false, title: "Use your saved default client" }),
}));
afterEach(() => {
  vi.clearAllMocks();
  mocks.session = "signed-in";
  mocks.search = "";
  mocks.clientId = "33333333-3333-4333-8333-333333333333";
  mocks.state = "authorized-client";
  mocks.status = "active";
  mocks.fetching = false;
});

// Exercise the actual element/click closure with controlled hook inputs. This is
// a local interaction control, not browser reconciliation or live authorization.
function button() {
  let element = LiveNewConversation({
    assetSet: "home",
    conversationEnabled: true,
    firstChatBootstrapEnabled: true,
  }) as ReactElement<Record<string, unknown>>;
  for (let depth = 0; depth < 8; depth++) {
    if (element.type === "button")
      return element.props as {
        disabled: boolean;
        onClick?: () => void;
        title?: string;
      };
    if (typeof element.type === "function") {
      element = (
        element.type as (
          props: Record<string, unknown>,
        ) => ReactElement<Record<string, unknown>>
      )(element.props);
    } else {
      const child = Children.toArray(element.props.children as ReactNode).find(
        isValidElement,
      );
      expect(child).toBeDefined();
      element = child as ReactElement<Record<string, unknown>>;
    }
  }
  throw Error("New conversation button missing");
}

it.each([
  "33333333-3333-4333-8333-333333333333",
  "66666666-6666-4666-8666-666666666666",
])(
  "opens the actual authorized client %s without a conversation id",
  (clientId) => {
    mocks.clientId = clientId;
    mocks.search = `clientId=${clientId}`;
    const b = button();
    expect(b.disabled).toBe(false);
    b.onClick!();
    expect(mocks.push).toHaveBeenCalledExactlyOnceWith(
      `/meri?clientId=${clientId}`,
    );
  },
);
it("explicit General records null and never inherits the selected client", () => {
  mocks.search = "scope=general";
  mocks.status = "archived";
  const b = button();
  expect(b.disabled).toBe(false);
  b.onClick!();
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith("/meri?scope=general");
  // A second click is the same navigation; the host reopens or starts the conversation.
  b.onClick!();
  expect(mocks.push).toHaveBeenCalledTimes(2);
  expect(mocks.push).toHaveBeenLastCalledWith("/meri?scope=general");
});
it.each([
  "scope=general&clientId=33333333-3333-4333-8333-333333333333",
  "scope=general&scope=general",
  "scope=client",
  "clientId=a&clientId=b",
])("refuses ambiguous scope %s", (search) => {
  mocks.search = search;
  const b = button();
  expect(b.disabled).toBe(true);
  b.onClick?.();
  expect(mocks.push).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
});
it.each(["loading", "unavailable"])("refuses %s client selection", (state) => {
  mocks.state = state;
  const b = button();
  expect(b.disabled).toBe(true);
  b.onClick?.();
  expect(mocks.push).not.toHaveBeenCalled();
});
it("offers the saved-default path only when no scope is selected", () => {
  mocks.state = "no-selection";
  expect(button()).toMatchObject({
    disabled: false,
    title: "Use your saved default client",
  });
  expect(mocks.push).not.toHaveBeenCalled();
  mocks.search = "clientId=unavailable";
  expect(button().disabled).toBe(true);
});
it("holds archived clients, refreshing accounts and signed-out sessions", () => {
  for (const condition of ["archived", "fetching", "signed-out"]) {
    mocks.status = condition === "archived" ? "archived" : "active";
    mocks.fetching = condition === "fetching";
    mocks.session = condition === "signed-out" ? "signed-out" : "signed-in";
    const b = button();
    expect(b.disabled).toBe(true);
    b.onClick?.();
    expect(mocks.push).not.toHaveBeenCalled();
  }
});
