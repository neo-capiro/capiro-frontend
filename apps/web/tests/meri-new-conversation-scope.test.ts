import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Fragment, type ReactElement } from "react";
import { LiveNewConversation } from "../src/shared/shell/LiveNewConversation";
import {
  readFirstChatIntent,
  type FirstChatScope,
} from "../src/shared/meri-conversations/first-chat-intent";

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
const account = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  actorId: "22222222-2222-4222-8222-222222222222",
};
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
  for (let depth = 0; depth < 5; depth++) {
    if (element.type === "button")
      return element.props as {
        disabled: boolean;
        onClick?: () => void;
        title?: string;
      };
    if (element.type === Fragment)
      element = (
        element.props.children as ReactElement<Record<string, unknown>>[]
      )[0]!;
    else {
      expect(typeof element.type).toBe("function");
      element = (
        element.type as (
          props: Record<string, unknown>,
        ) => ReactElement<Record<string, unknown>>
      )(element.props);
    }
  }
  throw Error("New conversation button missing");
}

it.each([
  "33333333-3333-4333-8333-333333333333",
  "66666666-6666-4666-8666-666666666666",
])("starts an intent for the actual authorized client %s", (clientId) => {
  mocks.clientId = clientId;
  mocks.search = `clientId=${clientId}`;
  const b = button();
  expect(b.disabled).toBe(false);
  b.onClick!();
  expect(readFirstChatIntent({ ...account, clientId }, storage)).toMatchObject({
    state: "pending",
    scope: { ...account, clientId },
  });
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith(
    `/meri?clientId=${clientId}`,
  );
});
it("explicit General records null and never inherits the selected client", () => {
  mocks.search = "scope=general";
  mocks.status = "archived";
  const b = button();
  expect(b.disabled).toBe(false);
  b.onClick!();
  const scope: FirstChatScope = {
    ...account,
    scopeKind: "general",
    clientId: null,
  };
  expect(readFirstChatIntent(scope, storage)).toMatchObject({
    state: "pending",
    scope,
  });
  expect(
    readFirstChatIntent({ ...account, clientId: mocks.clientId }, storage),
  ).toBeNull();
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith("/meri?scope=general");
  b.onClick!();
  expect(mocks.push).toHaveBeenCalledOnce();
  expect(dispatchEvent).toHaveBeenCalledOnce();
  expect(mocks.error).toHaveBeenLastCalledWith(
    expect.stringContaining("unknown outcome"),
  );
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
  expect(entries.size).toBe(0);
  expect(mocks.push).not.toHaveBeenCalled();
});
it.each(["loading", "unavailable", "no-selection"])(
  "refuses %s client selection",
  (state) => {
    mocks.state = state;
    const b = button();
    expect(b.disabled).toBe(true);
    b.onClick?.();
    expect(entries.size).toBe(0);
  },
);
it("holds archived clients, refreshing accounts and signed-out sessions", () => {
  for (const condition of ["archived", "fetching", "signed-out"]) {
    mocks.status = condition === "archived" ? "archived" : "active";
    mocks.fetching = condition === "fetching";
    mocks.session = condition === "signed-out" ? "signed-out" : "signed-in";
    const b = button();
    expect(b.disabled).toBe(true);
    b.onClick?.();
    expect(entries.size).toBe(0);
  }
});
