import { expect, it, vi } from "vitest";
import { z } from "zod";
import { defineOperation } from "./contracts";
import { handleCapiroRequest } from "./gateway";
import { createCapiroApi } from "./http";

const operation = defineOperation({
  service: "core",
  method: "GET",
  path: "/me",
  timeoutMs: 1000,
  request: z.object({}).strict(),
  response: z.object({ id: z.string() }),
  source: "lifecycle fixture",
});
const registry = { "identity.read": operation };
const config = {
  services: { core: "https://backend.example.test/api" },
  authConfigured: true,
  issues: [],
};
const request = () =>
  new Request(
    "https://frontend.example.test/api/capiro/identity.read?input=%7B%7D",
  );

it("applies the operation deadline to a hanging token provider before dispatch", async () => {
  const fetcher = vi.fn();
  const response = await handleCapiroRequest(
    request(),
    "identity.read",
    registry,
    config,
    () => new Promise(() => undefined),
    fetcher,
  );
  expect(response.status).toBe(504);
  expect(fetcher).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("cancels a hanging upstream response stream when the caller leaves", async () => {
  const controller = new AbortController();
  const cancelled = vi.fn();
  const upstream = new ReadableStream<Uint8Array>({
    start(stream) {
      stream.enqueue(new TextEncoder().encode('{"id":'));
    },
    pull() {
      controller.abort();
    },
    cancel: cancelled,
  });
  const fetcher = vi.fn(async () => {
    return new Response(upstream);
  });
  const response = await handleCapiroRequest(
    new Request(request(), { signal: controller.signal }),
    "identity.read",
    registry,
    config,
    async () => "verified-token",
    fetcher,
  );
  expect(response.status).toBe(408);
  expect(cancelled).toHaveBeenCalledTimes(1);
});

it("refuses an oversized streamed success and redacts upstream diagnostic headers", async () => {
  const result = await handleCapiroRequest(
    request(),
    "identity.read",
    registry,
    config,
    async () => "verified-token",
    async () =>
      new Response(new Uint8Array(8_000_001), {
        headers: {
          "X-Provider-Trace": "private",
          "Set-Cookie": "private=secret",
        },
      }),
  );
  expect(result.status).toBe(502);
  expect(result.headers.has("x-provider-trace")).toBe(false);
  expect(result.headers.has("set-cookie")).toBe(false);
});

it("never forwards caller credentials or selected tenant headers", async () => {
  const fetcher = vi.fn(async () => Response.json({ id: "verified-person" }));
  const incoming = new Request(request(), {
    headers: {
      Authorization: "Bearer browser-claim",
      Cookie: "scope=other",
      Host: "other-tenant.test",
      "X-Capiro-Tenant": "other-tenant",
      "X-Capiro-Impersonate-Tenant": "other-tenant",
    },
  });
  await handleCapiroRequest(
    incoming,
    "identity.read",
    registry,
    config,
    async () => "verified-token",
    fetcher,
  );
  const init = (fetcher.mock.calls[0] as unknown as [URL, RequestInit])[1];
  expect(init.headers).toEqual({
    Authorization: "Bearer verified-token",
    Accept: "application/json",
    "Content-Type": "application/json",
  });
});

it("does not admit a late successful read after the session scope was aborted", async () => {
  const scope = new AbortController();
  let finish!: (response: Response) => void;
  const fetcher = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  const expired = vi.fn();
  const api = createCapiroApi(registry, {
    fetcher,
    scopeSignal: () => scope.signal,
    onSessionExpired: expired,
  });
  const pending = api.request("identity.read", {});
  scope.abort();
  finish(Response.json({ id: "prior-tenant-person" }));
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(expired).not.toHaveBeenCalled();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("does not admit a late response body or expire a new scope from an old 401", async () => {
  const scope = new AbortController();
  let finish!: (payload: object) => void;
  const response = Response.json({}, { status: 401 });
  response.json = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const expired = vi.fn();
  const api = createCapiroApi(registry, {
    fetcher: async () => response,
    scopeSignal: () => scope.signal,
    onSessionExpired: expired,
  });
  const pending = api.request("identity.read", {});
  await Promise.resolve();
  scope.abort();
  finish({ message: "Prior session expired" });
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(expired).not.toHaveBeenCalled();
});

it("closes a late upstream response even if the provider ignores cancellation", async () => {
  const controller = new AbortController();
  const cancelled = vi.fn();
  let finish!: (response: Response) => void;
  let started!: () => void;
  const dispatched = new Promise<void>((resolve) => {
    started = resolve;
  });
  const fetcher = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
        started();
      }),
  );
  const pending = handleCapiroRequest(
    new Request(request(), { signal: controller.signal }),
    "identity.read",
    registry,
    config,
    async () => "verified-token",
    fetcher,
  );
  await dispatched;
  controller.abort();
  expect((await pending).status).toBe(408);
  finish(new Response(new ReadableStream({ cancel: cancelled })));
  await Promise.resolve();
  expect(cancelled).toHaveBeenCalledTimes(1);
});
