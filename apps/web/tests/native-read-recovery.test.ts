import { QueryClient } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { z } from "zod";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { retryNativeRead } from "../src/shared/portfolio/api/native-read-retry";

const changed = "Current membership changed; reload";
const read = (responses: Response[]) => {
  const fetcher = vi.fn<typeof fetch>(async () => responses.shift()!);
  const api = createApiClient(fetcher);
  const cache = new QueryClient();
  return {
    fetcher,
    result: cache.fetchQuery({
      queryKey: ["identity"],
      queryFn: ({ signal }) =>
        api.request("core", "me", z.object({ id: z.string() }), { signal }),
      retry: retryNativeRead,
      retryDelay: 0,
      gcTime: 0,
    }),
  };
};
const refusal = (status: number, message = changed) =>
  Response.json({ message }, { status });

it("obtains a fresh native read after two changed membership snapshots", async () => {
  const request = read([
    refusal(409),
    refusal(409),
    Response.json({ id: "same-actor" }),
  ]);
  await expect(request.result).resolves.toEqual({ id: "same-actor" });
  expect(request.fetcher).toHaveBeenCalledTimes(3);
  for (const [path, options] of request.fetcher.mock.calls) {
    expect(path).toBe("/api/backend/core/me");
    expect(options).toMatchObject({ method: "GET", cache: "no-store" });
  }
});

it("surfaces a membership conflict after the bounded fresh reads", async () => {
  const request = read([refusal(409), refusal(409), refusal(409)]);
  await expect(request.result).rejects.toMatchObject({
    status: 409,
    message: changed,
  });
  expect(request.fetcher).toHaveBeenCalledTimes(3);
});

it.each([
  [401, changed],
  [403, changed],
  [404, changed],
  [400, changed],
  [409, "A different optimistic version conflict"],
] as const)("does not retry refusal %i / %s", async (status, message) => {
  const request = read([refusal(status, message)]);
  await expect(request.result).rejects.toMatchObject({ status });
  expect(request.fetcher).toHaveBeenCalledTimes(1);
});

it("preserves the single retry for transient service failure", async () => {
  const request = read([refusal(503), refusal(503)]);
  await expect(request.result).rejects.toMatchObject({ status: 503 });
  expect(request.fetcher).toHaveBeenCalledTimes(2);
});
