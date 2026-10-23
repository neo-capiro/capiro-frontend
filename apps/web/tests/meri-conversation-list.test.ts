import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { MeriConversationList } from "../src/features/meri/conversations/MeriConversationList";
import { MeriCapabilitiesProvider } from "../src/shared/meri-resources/CapabilityContext";
import { resolveMeriCapabilities } from "../src/shared/meri-resources/capabilities";
import { MeriClientSelector } from "../src/features/meri/MeriClientSelector";

const synthetic = vi.hoisted(() => ({
  identity: {
    isSuccess: true,
    isFetching: false,
    error: null as unknown,
    data: {
      tenant: { id: "synthetic-tenant" },
      user: { id: "synthetic-actor" },
    },
  },
  selected: {
    state: "authorized-client",
    client: {
      id: "10000000-0000-4000-8000-000000000001",
      name: "Synthetic Client",
      status: "active",
    },
  },
  list: vi.fn<(props: unknown) => string>(() => "Admitted synthetic list"),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => synthetic.identity,
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => synthetic.selected,
}));
vi.mock("../src/shared/portfolio/api/clients", () => ({
  useClients: () => ({ isSuccess: true, data: [synthetic.selected.client] }),
}));
vi.mock("../src/shared/shell/LiveNewConversation", () => ({
  LiveNewConversation: () => null,
}));
vi.mock("../src/features/meri/conversations/ManagedConversationPanel", () => ({
  ManagedConversationPanel: synthetic.list,
}));

function render(enabled = true, served = true) {
  return renderToStaticMarkup(
    createElement(
      MeriCapabilitiesProvider,
      {
        value: resolveMeriCapabilities({ conversations: served }),
      },
      createElement(MeriConversationList, {
        enabled,
        firstChatBootstrapEnabled: false,
      }),
    ),
  );
}
beforeEach(() => {
  Object.assign(synthetic.identity, {
    isSuccess: true,
    isFetching: false,
    error: null,
  });
  synthetic.selected.state = "authorized-client";
  synthetic.selected.client.status = "active";
  synthetic.list.mockClear();
});

it("mounts owner-scoped discovery only for current identity and served capability", () => {
  expect(render()).toContain("Admitted synthetic list");
  expect(render(false)).not.toContain("Admitted synthetic list");
  expect(render(true, false)).not.toContain("Admitted synthetic list");
  synthetic.identity.isFetching = true;
  expect(render()).not.toContain("Admitted synthetic list");
  synthetic.identity.isFetching = false;
  synthetic.identity.error = new Error("Synthetic revoked identity");
  expect(render()).not.toContain("Admitted synthetic list");
  synthetic.identity.error = null;
  synthetic.selected.state = "unavailable";
  expect(render()).toContain("Admitted synthetic list");
  synthetic.selected.state = "authorized-client";
  synthetic.selected.client.status = "archived";
  // Core lists each owned chat only after its own current client wall; UI client choice does not grant or filter General ownership.
  expect(render()).toContain("Admitted synthetic list");
  expect(synthetic.list).toHaveBeenCalledTimes(3);
});

it("client changes on the list stay on discovery and carry no conversation or dispatch hint", () => {
  const html = renderToStaticMarkup(
    createElement(MeriClientSelector, {
      scope: { tenantId: "synthetic-tenant", userId: "synthetic-actor" },
      destination: "/meri/conversations",
    }),
  );
  expect(html).toContain(
    `href="/meri/conversations?clientId=${synthetic.selected.client.id}"`,
  );
  expect(html).not.toContain("conversationId=");
  expect(html).not.toContain(`href="/meri?clientId=`);
});
