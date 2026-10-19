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
vi.mock("@tanstack/react-query", () => ({
  useQuery: (query: Query) => {
    observed.query = query;
    return {};
  },
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
    expect(key).toEqual(["portfolio", "client", client.id]);
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
