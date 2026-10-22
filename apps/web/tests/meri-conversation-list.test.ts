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
vi.mock("../src/features/meri/conversations/ConversationList", () => ({
  ConversationList: synthetic.list,
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

it("mounts discovery only for current identity, verified active client and served capability", () => {
  expect(render()).toContain("Admitted synthetic list");
  expect(synthetic.list.mock.calls[0]![0]).toMatchObject({
    account: { tenantId: "synthetic-tenant", actorId: "synthetic-actor" },
    clientId: synthetic.selected.client.id,
  });
  expect(render(false)).not.toContain("Admitted synthetic list");
  expect(render(true, false)).not.toContain("Admitted synthetic list");
  synthetic.identity.isFetching = true;
  expect(render()).not.toContain("Admitted synthetic list");
  synthetic.identity.isFetching = false;
  synthetic.identity.error = new Error("Synthetic revoked identity");
  expect(render()).not.toContain("Admitted synthetic list");
  synthetic.identity.error = null;
  synthetic.selected.state = "unavailable";
  expect(render()).not.toContain("Admitted synthetic list");
  synthetic.selected.state = "authorized-client";
  synthetic.selected.client.status = "archived";
  expect(render()).toContain("This client is archived");
  expect(synthetic.list).toHaveBeenCalledTimes(1);
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
