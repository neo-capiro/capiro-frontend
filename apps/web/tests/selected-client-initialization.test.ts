import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import {
  QueryClient,
  type QueryObserver,
  type QueryObserverOptions,
} from "@tanstack/react-query";
import {
  createApiClient,
  type ApiClient,
} from "../src/shared/portfolio/api/http";
import { clientReadKey } from "../src/shared/portfolio/api/client-read";
import { currentReadActor } from "../src/shared/portfolio/auth/current-actor";
import {
  SelectedClientProvider,
  type SelectedClient,
} from "../src/shared/session/SelectedClient";

// Execute the real provider and canonical readers with actual QueryObservers.
// Only React scheduling is replaced; each render explicitly observes cache changes.
const host = vi.hoisted(() => ({
  cache: undefined as QueryClient | undefined,
  api: undefined as ApiClient | undefined,
  cursor: 0,
  slots: [] as Array<{ observer: QueryObserver; release: () => void }>,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useMemo: (read: () => unknown) => read(),
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) =>
    snapshot(),
}));
vi.mock("@tanstack/react-query", async (original) => {
  const actual = await original<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => host.cache,
    useQuery: (options: QueryObserverOptions) => {
      if (!host.cache) throw new Error("Missing synthetic cache");
      const index = host.cursor++;
      let slot = host.slots[index];
      if (!slot) {
        const observer = new actual.QueryObserver(host.cache, options);
        slot = { observer, release: observer.subscribe(() => undefined) };
        host.slots[index] = slot;
      } else slot.observer.setOptions(options);
      return slot.observer.getCurrentResult();
    },
  };
});
vi.mock("../src/shared/portfolio/api/provider", () => ({
  useApi: () => host.api,
}));
const clientId = "10000000-0000-4000-8000-000000000001";
const identity = {
  user: { id: "synthetic-owner", email: "owner@example.test" },
  tenant: { id: "synthetic-tenant", name: "Synthetic tenant" },
  role: "user_admin",
};
const client = {
  id: clientId,
  tenantId: identity.tenant.id,
  name: "Synthetic selected client",
  profileStatus: "active",
  status: "active",
};
let requests: string[];
let reply: (path: string) => Promise<Response>;
function cache() {
  if (!host.cache) throw new Error("Missing synthetic cache");
  return host.cache;
}
function render(requestedId: string | undefined = clientId): SelectedClient {
  host.cursor = 0;
  const tree = SelectedClientProvider({
    requestedId,
    children: createElement("button", null, "Setup"),
  });
  return tree.props.value;
}
async function settle() {
  for (let turn = 0; turn < 8; turn++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    render();
  }
}
function seed() {
  cache().setQueryData(["identity"], identity);
  const actor = currentReadActor(cache());
  if (!actor) throw new Error("Synthetic actor was not admitted");
  cache().setQueryData(clientReadKey(clientId, actor), client);
  return actor;
}
beforeEach(() => {
  host.cache = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000, gcTime: Infinity },
    },
  });
  host.slots = [];
  requests = [];
  reply = async (path) =>
    Response.json(path.endsWith("/me") ? identity : client);
  host.api = createApiClient(async (url, init) => {
    expect(init?.method ?? "GET").toBe("GET");
    const path = String(url);
    requests.push(path);
    return reply(path);
  });
});
afterEach(() => {
  for (const slot of host.slots) {
    slot.release();
    slot.observer.destroy();
  }
  host.cache?.clear();
  host.slots = [];
});
it("starts canonical identity then client from a cold Module-route cache", async () => {
  expect(render().state).toBe("loading");
  await settle();
  expect(requests).toEqual([
    "/api/backend/core/me",
    `/api/backend/core/clients/${clientId}`,
  ]);
  expect(render().state).toBe("authorized-client");
});
it("does not mistake a separate successful me.read receipt for canonical identity", async () => {
  cache().setQueryData(["capiro", "me.read"], identity);
  render();
  await settle();
  expect(requests).toEqual([
    "/api/backend/core/me",
    `/api/backend/core/clients/${clientId}`,
  ]);
  expect(render().state).toBe("authorized-client");
});
it.each([undefined, "not-a-client-id"])(
  "does not read identity or client for General/invalid selection: %s",
  async (requestedId) => {
    host.cursor = 0;
    const tree = SelectedClientProvider({ requestedId, children: null });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(tree.props.value.state).toBe(
      requestedId === undefined ? "no-selection" : "unavailable",
    );
    expect(requests).toEqual([]);
  },
);
it.each([403, 500])(
  "ends loading honestly after canonical identity status %s, without client dispatch",
  async (status) => {
    reply = async () =>
      Response.json({ message: "Synthetic identity refused" }, { status });
    render();
    await settle();
    expect(render().state).toBe("unavailable");
    expect(requests).toEqual(["/api/backend/core/me"]);
  },
);
it("refuses an identity that cannot establish the canonical current actor", async () => {
  reply = async () => Response.json({ ...identity, tenant: null });
  render();
  await settle();
  expect(render().state).toBe("unavailable");
  expect(requests).toEqual(["/api/backend/core/me"]);
});
it("keeps an already admitted view during a same-actor client background refresh", async () => {
  const actor = seed();
  expect(render().state).toBe("authorized-client");
  let deliver!: (value: Response) => void;
  reply = () =>
    new Promise((resolve) => {
      deliver = resolve;
    });
  const refresh = cache().refetchQueries({
    queryKey: clientReadKey(clientId, actor),
  });
  const during = render();
  deliver(Response.json(client));
  await refresh;
  expect(during.state).toBe("authorized-client");
  expect(render().state).toBe("authorized-client");
});
it("hides cached admission when canonical identity reread fails", async () => {
  seed();
  expect(render().state).toBe("authorized-client");
  reply = async () =>
    Response.json(
      { message: "Synthetic identity unavailable" },
      { status: 503 },
    );
  await cache().refetchQueries({ queryKey: ["identity"] });
  expect(render().state).toBe("unavailable");
});
it.each([
  { ...client, id: "10000000-0000-4000-8000-000000000002" },
  { ...client, tenantId: "another-synthetic-tenant" },
])("rejects a wrong requested-client/tenant receipt", async (wrong) => {
  cache().setQueryData(["identity"], identity);
  reply = async () => Response.json(wrong);
  render();
  await settle();
  expect(render().state).toBe("unavailable");
  expect(requests).toEqual([`/api/backend/core/clients/${clientId}`]);
});
it("ignores a late old-actor client response after canonical actor replacement", async () => {
  cache().setQueryData(["identity"], identity);
  const oldActor = currentReadActor(cache());
  const pending: Array<(value: Response) => void> = [];
  reply = () =>
    new Promise((resolve) => {
      pending.push(resolve);
    });
  render();
  cache().setQueryData(["identity"], {
    ...identity,
    user: { ...identity.user, id: "synthetic-new-owner" },
  });
  render();
  expect(pending).toHaveLength(2);
  pending[0]!(Response.json({ ...client, name: "Old actor result" }));
  pending[1]!(Response.json({ ...client, name: "Current actor result" }));
  await settle();
  const result = render();
  expect(result.state).toBe("authorized-client");
  if (result.state !== "authorized-client")
    throw new Error("Expected admitted current client");
  expect(result.client.name).toBe("Current actor result");
  expect(
    cache().getQueryData(clientReadKey(clientId, oldActor)),
  ).toBeUndefined();
});
