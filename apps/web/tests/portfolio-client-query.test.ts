import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createApiClient,
  type ApiClient,
} from "../src/shared/portfolio/api/http";
import { clientSchema } from "../src/features/portfolio/index/contracts";
import { useClient } from "../src/features/portfolio/index/queries";

type Query = {
  queryKey: readonly unknown[];
  queryFn: (context: { signal: AbortSignal }) => Promise<unknown>;
};
const observed = vi.hoisted(() => ({
  api: undefined as ApiClient | undefined,
  query: undefined as Query | undefined,
}));
export const ACTOR = {
  tenantId: "33333333-3333-4333-8333-333333333333",
  userId: "44444444-4444-4444-8444-444444444444",
  role: "standard_user",
};
vi.mock("@tanstack/react-query", () => ({
  useQuery: (query: Query) => {
    observed.query = query;
    return {};
  },
  // The shared client read resolves its cache and actor through these.
  useQueryClient: () => ({}),
}));
vi.mock("@/shared/portfolio/auth/current-actor", () => ({
  useCurrentActor: () => ACTOR,
  currentActorKey: (
    actor?: { tenantId: string; userId: string; role?: string } | null,
  ) =>
    actor
      ? JSON.stringify([actor.tenantId, actor.userId, actor.role])
      : "unavailable",
  assertCurrentActor: () => undefined,
}));
vi.mock("../src/shared/portfolio/api/provider", () => ({
  useApi: () => observed.api,
}));

const client = clientSchema.parse({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Synthetic requested client",
  status: "active",
  profileStatus: "ACTIVE",
});
beforeEach(() => {
  observed.api = undefined;
  observed.query = undefined;
});
function ClientQueryProbe() {
  useClient(client.id);
  return null;
}
function queryClient(receipt: unknown) {
  const calls: { path: string; method: string }[] = [];
  observed.api = createApiClient(async (url, init) => {
    calls.push({ path: String(url), method: init?.method ?? "GET" });
    return new Response(JSON.stringify(receipt), {
      headers: { "Content-Type": "application/json" },
    });
  });
  renderToStaticMarkup(createElement(ClientQueryProbe));
  if (!observed.query)
    throw new Error("The client hook did not register its query.");
  return {
    calls,
    key: observed.query.queryKey,
    result: observed.query.queryFn({ signal: new AbortController().signal }),
  };
}

describe("Portfolio client query response admission", () => {
  it("accepts the requested client on its exact native route and cache key", async () => {
    const { result, calls, key } = queryClient(client);
    await expect(result).resolves.toEqual(client);
    expect(calls).toEqual([
      { path: `/api/backend/core/clients/${client.id}`, method: "GET" },
    ]);
    // One actor-scoped key: the catalogue and the profile panels share this entry.
    expect(key).toEqual([
      "portfolio",
      "client",
      client.id,
      JSON.stringify([ACTOR.tenantId, ACTOR.userId, ACTOR.role]),
    ]);
  });
  it("rejects another structurally valid client before returning it to the cache", async () => {
    const foreign = clientSchema.parse({
      ...client,
      id: "22222222-2222-4222-8222-222222222222",
      name: "Synthetic unrelated client",
    });
    await expect(queryClient(foreign).result).rejects.toMatchObject({
      status: 502,
    });
  });
  it("rejects a null success instead of treating it as a client", async () => {
    await expect(queryClient(null).result).rejects.toMatchObject({
      status: 502,
    });
  });
});
