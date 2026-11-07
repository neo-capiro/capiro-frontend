import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxyRequest } from "../src/shared/portfolio/api/proxy";
import { readConfig } from "../src/shared/portfolio/config/config";

const origin = "https://frontend.example.test";
const entry = ["clients", "profile-build", "identity-preview"];
const attachmentId = "10000000-0000-4000-8000-000000000007";
const config = readConfig({
  CORE_API_BASE_URL: "https://core.example.test/api",
  STRATEGY_API_BASE_URL: "https://strategy.example.test/api",
  INTELLIGENCE_API_BASE_URL: "https://intelligence.example.test/api",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
});
function request(
  path = entry,
  method = "POST",
  body: unknown = {},
  signal?: AbortSignal,
) {
  return new Request(`${origin}/api/backend/core/${path.join("/")}`, {
    method,
    signal,
    headers: { Origin: origin, "Content-Type": "application/json" },
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
  });
}
function forward(
  fetcher: typeof fetch,
  input = request(),
  path = entry,
  service = "core",
) {
  return proxyRequest(
    input,
    service,
    path,
    config,
    async () => "synthetic-token",
    fetcher,
  );
}
beforeEach(() => {
  vi.useFakeTimers();
  // Native AbortSignal timers are not intercepted by fake timers. Keep the
  // standard signal behavior while making the HTTP deadlines controllable.
  vi.spyOn(AbortSignal, "timeout").mockImplementation((milliseconds) => {
    const controller = new AbortController();
    setTimeout(
      () => controller.abort(new DOMException("Timed out", "TimeoutError")),
      milliseconds,
    );
    return controller.signal;
  });
});
afterEach(() => {
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("identity preview HTTP lifetime", () => {
  it.each([
    ["website only", { website: "https://fixture.example/" }],
    [
      "document and website",
      {
        name: "Fixture Engineering",
        website: "https://fixture.example/",
        attachmentId,
      },
    ],
  ])(
    "delivers %s candidates after 30s with the original input and no extra command",
    async (_label, input) => {
      const preview = {
        status: "ambiguous",
        entity: null,
        requiresUserConfirmation: true,
        candidates: [
          {
            entity: { id: null, canonicalName: "Fixture Engineering" },
            sourceCandidate: {
              source: "website",
              externalId: "https://fixture.example/",
              name: "Fixture Engineering",
            },
          },
        ],
        sourceGaps: [],
        duplicate: null,
      };
      const fetcher = vi.fn<typeof fetch>(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(Response.json(preview)), 45_000);
          }),
      );
      const pending = forward(fetcher, request(entry, "POST", input));
      await vi.advanceTimersByTimeAsync(45_000);
      const response = await pending;
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(preview);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher.mock.calls[0]?.[0]).toEqual(
        new URL(
          "https://core.example.test/api/clients/profile-build/identity-preview",
        ),
      );
      expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual(
        input,
      );
      expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
    },
  );

  it.each([
    ["core", "POST", entry, true],
    [
      "core",
      "POST",
      ["clients", "fixture", "profile-build", "identity", "preview"],
      true,
    ],
    [
      "core",
      "POST",
      [
        "business-development",
        "prospects",
        "fixture",
        "profile-build",
        "identity",
        "preview",
      ],
      true,
    ],
    ["core", "GET", entry, false],
    ["core", "PUT", entry, false],
    ["intelligence", "POST", entry, false],
    ["core", "POST", ["clients", "profile-build", "identity-confirm"], false],
    [
      "core",
      "POST",
      ["clients", "profile-build", "registration-suggestions"],
      false,
    ],
    ["core", "POST", [...entry, "extra"], false],
    [
      "core",
      "POST",
      ["clients", "fixture", "profile-build", "identity", "confirm"],
      false,
    ],
  ] as const)(
    "bounds only the exact identity POST surface: %s %s %j",
    async (service, method, path, extended) => {
      const fetcher = vi.fn<typeof fetch>(() => new Promise(() => undefined));
      let settled = false;
      const pending = forward(
        fetcher,
        request([...path], method),
        [...path],
        service,
      ).then((response) => {
        settled = true;
        return response;
      });
      await vi.advanceTimersByTimeAsync(30_000);
      expect(settled).toBe(!extended);
      if (extended) await vi.advanceTimersByTimeAsync(220_000);
      const response = await pending;
      expect(response.status).toBe(504);
      expect(await response.json()).toEqual({
        message: "The service request timed out. Please retry.",
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    },
  );

  it("settles at the deadline even if fetch ignores abort and cancels a late response body", async () => {
    let finish!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = forward(fetcher);
    await vi.advanceTimersByTimeAsync(250_000);
    expect((await pending).status).toBe(504);
    const cancel = vi.fn();
    finish(new Response(new ReadableStream({ cancel })));
    await vi.advanceTimersByTimeAsync(0);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([200, 503])(
    "keeps the deadline through a stalled HTTP %s body after headers",
    async (status) => {
      const cancel = vi.fn();
      const fetcher = vi.fn<typeof fetch>(
        async () =>
          new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(new TextEncoder().encode('{"candidates":'));
              },
              cancel,
            }),
            { status },
          ),
      );
      const pending = forward(fetcher);
      await vi.advanceTimersByTimeAsync(250_000);
      const response = await pending;
      expect(response.status).toBe(504);
      expect(await response.json()).toEqual({
        message: "The service request timed out. Please retry.",
      });
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );

  it("preserves caller cancellation during a stalled body and cancels the upstream reader", async () => {
    const controller = new AbortController();
    const cancel = vi.fn();
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response(new ReadableStream({ cancel })),
    );
    const pending = forward(
      fetcher,
      request(entry, "POST", {}, controller.signal),
    );
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    const response = await pending;
    expect(response.status).toBe(408);
    expect(await response.json()).toEqual({
      message: "The request was cancelled.",
    });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("does not postpone the deadline while a body cancellation is still pending", async () => {
    let finishCancel!: () => void;
    const cancel = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishCancel = resolve;
        }),
    );
    const upstream = new Response(new ReadableStream({ cancel }));
    const pending = forward(vi.fn<typeof fetch>(async () => upstream));
    await vi.advanceTimersByTimeAsync(250_000);
    expect((await pending).status).toBe(504);
    expect(cancel).toHaveBeenCalledTimes(1);
    finishCancel();
    await vi.advanceTimersByTimeAsync(0);
    expect(upstream.body?.locked).toBe(false);
  });

  it("never asks for credentials or dispatches an already cancelled preview", async () => {
    const token = vi.fn(async () => "synthetic-token");
    const fetcher = vi.fn<typeof fetch>();
    const response = await proxyRequest(
      request(entry, "POST", {}, AbortSignal.abort()),
      "core",
      entry,
      config,
      token,
      fetcher,
    );
    expect(response.status).toBe(408);
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("distinguishes a transport failure from timeout and an upstream service error", async () => {
    const network = await forward(
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError("network failed")),
    );
    expect(network.status).toBe(502);
    expect(await network.json()).toEqual({
      message: "The service could not be reached. Please retry.",
    });
    const unavailable = await forward(
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({}, { status: 503 })),
    );
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({
      message: "The service is unavailable. Please retry.",
    });
    const timeout = await forward(
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({}, { status: 504 })),
    );
    expect(timeout.status).toBe(504);
    expect(await timeout.json()).toEqual({
      message: "The service request timed out. Please retry.",
    });
  });

  it.each([
    ["core", "POST", entry, true],
    ["core", "GET", entry, false],
    ["intelligence", "POST", entry, false],
    ["core", "POST", [...entry, "extra"], false],
    ["core", "POST", ["clients", "profile-build", "identity-confirm"], false],
  ] as const)(
    "limits the upstream 504 timeout message to identity previews: %s %s %j",
    async (service, method, path, identityPreview) => {
      const fetcher = vi.fn<typeof fetch>(async () =>
        Response.json(
          { message: "Synthetic private upstream diagnostic" },
          { status: 504 },
        ),
      );
      const response = await forward(
        fetcher,
        request([...path], method),
        [...path],
        service,
      );
      expect(response.status).toBe(504);
      expect(await response.json()).toEqual({
        message: identityPreview
          ? "The service request timed out. Please retry."
          : "The service is unavailable. Please retry.",
      });
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
});
