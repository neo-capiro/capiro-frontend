import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import {
  ConversationHistoryList,
  titleReadFailure,
} from "../src/features/meri/conversations/ConversationHistoryList";
import { ConversationHistoryUnavailable } from "../src/shared/meri-conversations/history-client";

const refused = new ConversationHistoryUnavailable(403, "ACCESS_DENIED");
const signedOut = new ConversationHistoryUnavailable(401, "UNAUTHENTICATED");
const membershipChanged = new ConversationHistoryUnavailable(
  409,
  "MEMBERSHIP_CHANGED",
);
const routeAbsent = new ConversationHistoryUnavailable(404, "NOT_FOUND");
const storeCorrupt = new ConversationHistoryUnavailable(
  500,
  "CONVERSATION_STORE_CORRUPT",
);
const productUnavailable = new ConversationHistoryUnavailable(
  502,
  "PRODUCT_UNAVAILABLE",
);
const transportLost = new TypeError("Failed to fetch");

/** The failing read is described once; the page never asserts a missing feature for it. */
it.each([
  ["ACCESS_DENIED", refused],
  ["UNAUTHENTICATED", signedOut],
  ["MEMBERSHIP_CHANGED", membershipChanged],
])("states the closed %s refusal as the person's access", (_code, error) => {
  expect(titleReadFailure(error)).toBe(
    "You cannot open your saved chat titles with your current access.",
  );
});

it.each([
  ["NOT_FOUND", routeAbsent],
  ["CONVERSATION_STORE_CORRUPT", storeCorrupt],
  ["PRODUCT_UNAVAILABLE", productUnavailable],
  ["transport", transportLost],
])("states a %s read failure without claiming absence", (_case, error) => {
  expect(titleReadFailure(error)).toBe(
    "Saved chat titles could not be loaded. This does not mean your conversations are gone.",
  );
});

it("never turns a failed read into an environment limit", () => {
  for (const error of [
    refused,
    signedOut,
    membershipChanged,
    routeAbsent,
    storeCorrupt,
    productUnavailable,
    transportLost,
    null,
  ])
    expect(titleReadFailure(error)).not.toMatch(/environment/i);
});

const summaries = vi.hoisted(() => ({
  error: undefined as unknown,
  refetch: () => undefined,
}));
vi.mock("../src/shared/meri-conversations/useManagedConversations", () => ({
  useManagedConversations: () => ({
    query: {
      error: summaries.error,
      data: undefined,
      isFetching: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      hasNextPage: false,
      fetchNextPage: () => undefined,
      refetch: summaries.refetch,
    },
    scope: { tenantId: "synthetic-tenant", actorId: "synthetic-actor" },
    current: false,
    // No admitted page in this fixture: nothing to retain and nothing to show.
    retained: false,
    shown: false,
    summaries: [],
  }),
}));
vi.mock("../src/shared/portfolio/api/clients", () => ({
  useClients: () => ({ data: [] }),
}));

function render() {
  return renderToStaticMarkup(createElement(ConversationHistoryList, {}));
}

it("renders the access refusal as an alert with the manual retry kept", () => {
  summaries.error = refused;
  const html = render();
  expect(html).toContain(
    "You cannot open your saved chat titles with your current access.",
  );
  expect(html).toContain('role="alert"');
  expect(html).toContain(">Retry</button>");
  expect(html).not.toMatch(/environment/i);
});

it("renders an unavailable read as a failure while keeping the retry available", () => {
  summaries.error = productUnavailable;
  const html = render();
  expect(html).toContain(
    "Saved chat titles could not be loaded. This does not mean your conversations are gone.",
  );
  expect(html).toContain(">Retry</button>");
  expect(html).not.toMatch(/environment/i);
});
