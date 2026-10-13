import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActionRoute } from "@capiro/meri-contracts/action-application";
import {
  boundedJsonText,
  withActionDeadline,
} from "../src/shared/meri-actions/bounded-json";
import { actionTransport } from "../src/shared/meri-actions/workflow-transport";

const signal = () => new AbortController().signal;
const encoder = new TextEncoder();
const never = <T>() => new Promise<T>(() => undefined);
function streamed(chunks: Uint8Array[], headers: Record<string, string> = {}) {
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
    cancel,
  });
  const response = new Response(body, {
    headers: { "Content-Type": "application/json", ...headers },
  });
  return { body, response, cancel };
}
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Meri rejected response stream disposal", () => {
  it.each(["pre-aborted", "wrong-media", "oversized-header"])(
    "cancels an acquired response body for %s without awaiting cancel",
    async (reason) => {
      const cancel = vi.fn(() => never<void>());
      const body = new ReadableStream<Uint8Array>({ cancel });
      const controller = new AbortController();
      if (reason === "pre-aborted") controller.abort();
      const response = new Response(body, {
        headers: {
          "Content-Type":
            reason === "wrong-media" ? "text/html" : "application/json",
          ...(reason === "oversized-header" ? { "Content-Length": "17" } : {}),
        },
      });
      await expect(
        boundedJsonText(response, controller.signal, 16),
      ).rejects.toThrow();
      expect(cancel).toHaveBeenCalledOnce();
      expect(body.locked).toBe(false);
    },
  );
  it("releases a late response body from fetch that ignored the expired deadline", async () => {
    vi.useFakeTimers();
    let release!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    const pending = actionTransport(
      "action_session_synthetic",
      signal(),
      fetcher,
    )("execute", {}, signal());
    const rejected = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.advanceTimersByTimeAsync(30_000);
    await rejected;
    const cancel = vi.fn(() => never<void>());
    const body = new ReadableStream<Uint8Array>({ cancel });
    release(
      new Response(body, { headers: { "Content-Type": "application/json" } }),
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("Meri streamed UTF-8 receiving bound", () => {
  it("accepts exactly the byte limit across a split multibyte character", async () => {
    const bytes = encoder.encode('{"text":"é"}');
    const cut = bytes.indexOf(0xc3) + 1;
    const { body, response } = streamed([
      bytes.slice(0, cut),
      bytes.slice(cut),
    ]);
    await expect(
      boundedJsonText(response, signal(), bytes.length),
    ).resolves.toBe('{"text":"é"}');
    expect(body.locked).toBe(false);
  });
  it("refuses streamed limit+1 even when Content-Length understates bytes", async () => {
    const { body, response } = streamed(
      [encoder.encode("1234"), encoder.encode("5")],
      { "Content-Length": "1" },
    );
    await expect(boundedJsonText(response, signal(), 4)).rejects.toThrow(
      "receiving limit",
    );
    expect(body.locked).toBe(false);
  });
  it.each(["5", "-1", "1.5", "NaN", "4,4", "999999999999999999999999"])(
    "rejects declared size %s before acquiring a body reader",
    async (declared) => {
      const { body, response } = streamed([encoder.encode("{}")], {
        "Content-Length": declared,
      });
      const getReader = vi.spyOn(body, "getReader");
      await expect(boundedJsonText(response, signal(), 4)).rejects.toThrow(
        "receiving limit",
      );
      expect(getReader).not.toHaveBeenCalled();
      expect(body.locked).toBe(false);
    },
  );
  it.each(["text/html", "application/jsonp", "text/plain"])(
    "refuses media type %s before body read",
    async (type) => {
      const { body, response } = streamed([encoder.encode("{}")], {
        "Content-Type": type,
      });
      const getReader = vi.spyOn(body, "getReader");
      await expect(boundedJsonText(response, signal(), 4)).rejects.toThrow(
        "response format",
      );
      expect(getReader).not.toHaveBeenCalled();
    },
  );
  it("accepts JSON charset parameters but refuses missing bodies", async () => {
    const { response } = streamed([encoder.encode("{}")], {
      "Content-Type": "application/json; charset=utf-8",
    });
    await expect(boundedJsonText(response, signal(), 2)).resolves.toBe("{}");
    await expect(
      boundedJsonText(
        new Response(null, { headers: { "Content-Type": "application/json" } }),
        signal(),
        2,
      ),
    ).rejects.toThrow("body is unavailable");
  });
  it.each([[0xc3, 0x28], [0xc3]])(
    "fatally rejects malformed or unfinished UTF-8 %#",
    async (...bytes) => {
      const { body, response } = streamed([new Uint8Array(bytes)]);
      await expect(boundedJsonText(response, signal(), 16)).rejects.toThrow();
      expect(body.locked).toBe(false);
    },
  );
  it("aborts a parked read without waiting for a hanging underlying cancel", async () => {
    const cancel = vi.fn(() => never<void>());
    const body = new ReadableStream<Uint8Array>({ cancel });
    const controller = new AbortController();
    const response = new Response(body, {
      headers: { "Content-Type": "application/json" },
    });
    const pending = boundedJsonText(response, controller.signal, 16);
    const rejection = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    controller.abort();
    await rejection;
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  });
  it("overflow rejection does not wait for hanging cancellation", async () => {
    const cancel = vi.fn(() => never<void>());
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("12345"));
      },
      cancel,
    });
    const response = new Response(body, {
      headers: { "Content-Type": "application/json" },
    });
    await expect(boundedJsonText(response, signal(), 4)).rejects.toThrow(
      "receiving limit",
    );
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  });
});

describe("Meri observation deadline and cancellation", () => {
  it("rejects before invocation for an already-aborted owner", async () => {
    vi.useFakeTimers();
    const owner = new AbortController();
    owner.abort();
    const run = vi.fn(() => Promise.resolve("not allowed"));
    await expect(
      withActionDeadline([owner.signal], run, 100),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(run).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("bounds ignored cancellation and late processing beyond response headers", async () => {
    vi.useFakeTimers();
    let finish!: (value: string) => void;
    let receivingSignal!: AbortSignal;
    const pending = withActionDeadline(
      [],
      (current) => {
        receivingSignal = current;
        return new Promise<string>((resolve) => {
          finish = resolve;
        });
      },
      100,
    );
    const rejected = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.advanceTimersByTimeAsync(99);
    expect(receivingSignal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await rejected;
    expect(receivingSignal.aborted).toBe(true);
    finish("late validated result");
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("clears its deadline after success without aborting borrowed input", async () => {
    vi.useFakeTimers();
    const owner = new AbortController();
    await expect(
      withActionDeadline([owner.signal], async () => "complete", 100),
    ).resolves.toBe("complete");
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(100);
    expect(owner.signal.aborted).toBe(false);
  });
});

describe("Meri fixed authenticated action transport", () => {
  const credential = `action_session_${"x".repeat(43)}`;
  it.each(["query", "draft", "prepare", "execute"] as const)(
    "uses only fixed POST %s with exact request and no ambient routing",
    async (route) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json(
            { error: { code: "ACCESS_DENIED", outcome: "NOT_DISPATCHED" } },
            { status: 403 },
          ),
        );
      const body = { request: { limit: 20 } };
      const pending = actionTransport(credential, signal(), fetcher)(
        route,
        body,
        signal(),
      );
      body.request.limit = 99;
      await expect(pending).resolves.toEqual({
        status: 403,
        value: { error: { code: "ACCESS_DENIED", outcome: "NOT_DISPATCHED" } },
      });
      expect(fetcher).toHaveBeenCalledOnce();
      const [url, init] = fetcher.mock.calls[0]!;
      expect(url).toBe(`/api/action-followthrough/${route}`);
      expect(init).toMatchObject({
        method: "POST",
        body: '{"request":{"limit":20}}',
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credential}`,
        },
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
      });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    },
  );
  it.each([
    "../session",
    "execute?approve=true",
    "https://example.test",
    "approve",
  ])("refuses forged route %s before dispatch", async (route) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({}));
    await expect(
      actionTransport(credential, signal(), fetcher)(
        route as ActionRoute,
        {},
        signal(),
      ),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("runs the actual public receiver and refuses malformed JSON without retry", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response("{", { headers: { "Content-Type": "application/json" } }),
      );
    await expect(
      actionTransport(credential, signal(), fetcher)("execute", {}, signal()),
    ).rejects.toMatchObject({ name: "ActionResponseError" });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("returns a deeply frozen accepted response through the real receiver", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ status: "indeterminate", outcome: null }),
      );
    const result = await actionTransport(credential, signal(), fetcher)(
      "execute",
      {},
      signal(),
    );
    expect(result).toEqual({
      status: 200,
      value: { status: "indeterminate", outcome: null },
    });
    expect(Object.isFrozen(result.value)).toBe(true);
  });
  it.each(["caller", "lifetime"] as const)(
    "settles ignored-fetch cancellation from %s once without retry",
    async (kind) => {
      vi.useFakeTimers();
      const caller = new AbortController(),
        lifetime = new AbortController();
      const fetcher = vi.fn<typeof fetch>(() => never<Response>());
      const pending = actionTransport(credential, lifetime.signal, fetcher)(
        "execute",
        {},
        caller.signal,
      );
      const rejection = expect(pending).rejects.toMatchObject({
        name: "AbortError",
      });
      (kind === "caller" ? caller : lifetime).abort();
      await rejection;
      expect(fetcher).toHaveBeenCalledOnce();
      expect(fetcher.mock.calls[0]![1]!.signal!.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    },
  );
  it("times out a parked body even if cancellation never completes", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn(() => never<void>());
    const body = new ReadableStream<Uint8Array>({ cancel });
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(body, { headers: { "Content-Type": "application/json" } }),
      );
    const pending = actionTransport(credential, signal(), fetcher)(
      "execute",
      {},
      signal(),
    );
    const rejection = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.advanceTimersByTimeAsync(29_999);
    expect(body.locked).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
