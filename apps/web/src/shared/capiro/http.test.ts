import { expect, it, vi } from "vitest";
import { z } from "zod";
import { defineOperation } from "./contracts";
import { createCapiroApi } from "./http";

const registry = {
  "sample.read": defineOperation({
    service: "core",
    method: "GET",
    path: "/me",
    request: z.object({}).strict(),
    response: z.object({ id: z.string() }),
    source: "test controller",
  }),
  "sample.update": defineOperation({
    service: "core",
    method: "PATCH",
    path: "/me",
    request: z
      .object({ body: z.object({ name: z.string() }).strict() })
      .strict(),
    response: z.object({ id: z.string() }),
    source: "test controller",
  }),
};
it("encodes only registered operation input and validates responses", async () => {
  const fetcher = vi.fn(async () => Response.json({ id: "person" }));
  const api = createCapiroApi(registry, { fetcher });
  expect(await api.request("sample.read", {})).toEqual({ id: "person" });
  const [url, init] = fetcher.mock.calls[0]! as unknown as [
    string,
    RequestInit,
  ];
  expect(url).toBe("/api/capiro/sample.read?input=%7B%7D");
  expect(init.credentials).toBe("same-origin");
  expect(init.body).toBeUndefined();
  await api.request("sample.update", { body: { name: "Test" } });
  expect(
    (fetcher.mock.calls[1] as unknown as [string, RequestInit])[1].body,
  ).toBe('{"body":{"name":"Test"}}');
});
it("rejects invalid request fields before network and has no automatic write retry", async () => {
  const fetcher = vi.fn(async () =>
    Response.json({ message: "Unavailable" }, { status: 503 }),
  );
  const api = createCapiroApi(registry, { fetcher });
  await expect(
    api.request("sample.read", { tenantId: "untrusted" } as never),
  ).rejects.toMatchObject({ status: 400 });
  expect(fetcher).not.toHaveBeenCalled();
  await expect(
    api.request("sample.update", { body: { name: "Test" } }),
  ).rejects.toMatchObject({ status: 503 });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("returns bounded session and schema failures and forwards cancellation", async () => {
  const expired = vi.fn();
  const api = createCapiroApi(registry, {
    fetcher: async () =>
      Response.json({ message: "provider detail" }, { status: 401 }),
    onSessionExpired: expired,
  });
  await expect(api.request("sample.read", {})).rejects.toMatchObject({
    status: 401,
    message: "Your session expired. Sign in again.",
  });
  expect(expired).toHaveBeenCalledTimes(1);
  await expect(
    createCapiroApi(registry, {
      fetcher: async () => Response.json({ id: 1 }),
    }).request("sample.read", {}),
  ).rejects.toMatchObject({ status: 502 });
  const controller = new AbortController();
  const fetcher = vi.fn(async () => Response.json({ id: "person" }));
  await createCapiroApi(registry, { fetcher }).request(
    "sample.read",
    {},
    { signal: controller.signal },
  );
  const signal = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1]
    .signal;
  controller.abort();
  expect(signal?.aborted).toBe(true);
});
