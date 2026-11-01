import { afterEach, beforeEach, expect, it, vi } from "vitest";
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
  error: vi.fn(),
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useContext: () => mocks.session,
  useState: () => [null, mocks.error],
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
const entries = new Map<string, string>();
const storage = {
  getItem: (key: string) => entries.get(key) ?? null,
  setItem: (key: string, value: string) => {
    entries.set(key, value);
  },
};
const dispatchEvent = vi.fn();
beforeEach(() =>
  vi.stubGlobal("window", { sessionStorage: storage, dispatchEvent }),
);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  entries.clear();
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
it.each([
  "researchPortfolioId=44444444-4444-4444-8444-444444444444",
  "scope=research_portfolio&conversationId=55555555-5555-4555-8555-555555555555",
])(
  "Research route never offers the ambient client/default New conversation: %s",
  (query) => {
    mocks.search = query;
    for (const selected of ["authorized-client", "no-selection"]) {
      mocks.state = selected;
      const control = button();
      expect(control.disabled).toBe(true);
      control.onClick?.();
      expect(mocks.push).not.toHaveBeenCalled();
      expect(dispatchEvent).not.toHaveBeenCalled();
    }
  },
);
