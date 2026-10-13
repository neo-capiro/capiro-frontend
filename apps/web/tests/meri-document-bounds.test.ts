import { afterEach, expect, it, vi } from "vitest";
import {
  boundedJsonBytes,
  boundedJsonText,
  boundedResponseBytes,
  withActionDeadline,
} from "../src/shared/meri-actions/bounded-json";

const signal = () => new AbortController().signal;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
afterEach(() => vi.useRealTimers());

it("binary acquisition preserves invalid UTF8, zero bytes and exact limit without text normalization", async () => {
  const bytes = new Uint8Array([0xff, 0, 0xc3, 0x28, 13, 10]);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.subarray(0, 3));
      controller.enqueue(bytes.subarray(3));
      controller.close();
    },
  });
  const received = await boundedResponseBytes(
    new Response(body),
    signal(),
    bytes.length,
  );
  expect(received).toEqual(bytes);
  expect(received.buffer).not.toBe(bytes.buffer);
  expect(body.locked).toBe(false);
  received[0] = 1;
  expect(bytes[0]).toBe(255);
});

it("raw acquisition waits for genuine EOF, even after all declared bytes arrive", async () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const nextRead = deferred<void>();
  let pulls = 0;
  const body = new ReadableStream<Uint8Array>(
    {
      start(value) {
        controller = value;
      },
      pull() {
        if (++pulls === 1) controller.enqueue(new Uint8Array([1]));
        else nextRead.resolve();
      },
    },
    { highWaterMark: 0 },
  );
  let released = false;
  const read = boundedResponseBytes(
    new Response(body, { headers: { "Content-Length": "1" } }),
    signal(),
    2,
  ).then((bytes) => {
    released = true;
    return bytes;
  });
  await nextRead.promise;
  expect(released).toBe(false);
  controller.close();
  expect(await read).toEqual(new Uint8Array([1]));
});

it("copies a received chunk before a producer reuses its storage", async () => {
  const chunk = new Uint8Array([1, 2]);
  let pulls = 0;
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (pulls++ === 0) controller.enqueue(chunk);
        else {
          chunk.fill(9);
          controller.enqueue(new Uint8Array([3]));
          controller.close();
        }
      },
    },
    { highWaterMark: 0 },
  );
  expect(await boundedResponseBytes(new Response(body), signal(), 3)).toEqual(
    new Uint8Array([1, 2, 3]),
  );
});

it.each(["-1", "1.5", "NaN", "2, 2", "99999999999999999999999", "4"])(
  "refuses invalid or over-limit declared length %s and cancels before reading",
  async (length) => {
    const cancel = vi.fn(() => new Promise<void>(() => undefined));
    const pull = vi.fn();
    const body = new ReadableStream<Uint8Array>(
      { cancel, pull },
      { highWaterMark: 0 },
    );
    await expect(
      boundedResponseBytes(
        new Response(body, { headers: { "Content-Length": length } }),
        signal(),
        3,
      ),
    ).rejects.toThrow("limit");
    expect(pull).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  },
);

it("counts actual bytes when a declared length understates a split stream", async () => {
  const cancel = vi.fn(() => new Promise<void>(() => undefined));
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2]));
      controller.enqueue(new Uint8Array([3, 4]));
    },
    cancel,
  });
  await expect(
    boundedResponseBytes(
      new Response(body, { headers: { "Content-Length": "1" } }),
      signal(),
      3,
    ),
  ).rejects.toThrow("limit");
  expect(cancel).toHaveBeenCalledOnce();
  expect(body.locked).toBe(false);
});

it("a pre-aborted binary acquisition cancels its body without pulling or waiting on cancellation", async () => {
  const cancel = vi.fn(() => new Promise<void>(() => undefined));
  const pull = vi.fn();
  const body = new ReadableStream<Uint8Array>(
    { cancel, pull },
    { highWaterMark: 0 },
  );
  await expect(
    boundedResponseBytes(new Response(body), AbortSignal.abort(), 3),
  ).rejects.toBeDefined();
  expect(pull).not.toHaveBeenCalled();
  expect(cancel).toHaveBeenCalledOnce();
  expect(body.locked).toBe(false);
});

it("aborting a parked read releases its lock even when cancel never settles", async () => {
  const pulled = deferred<void>();
  const lifetime = new AbortController();
  const cancel = vi.fn(() => new Promise<void>(() => undefined));
  const body = new ReadableStream<Uint8Array>(
    {
      pull() {
        pulled.resolve();
      },
      cancel,
    },
    { highWaterMark: 0 },
  );
  const read = boundedResponseBytes(new Response(body), lifetime.signal, 3);
  const rejected = expect(read).rejects.toBeDefined();
  await pulled.promise;
  lifetime.abort();
  await rejected;
  expect(cancel).toHaveBeenCalledOnce();
  expect(body.locked).toBe(false);
});

it("a stream failure after a prefix never releases partial bytes", async () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const pulled = deferred<void>();
  let pulls = 0;
  const body = new ReadableStream<Uint8Array>(
    {
      start(value) {
        controller = value;
      },
      pull() {
        if (++pulls === 1) controller.enqueue(new Uint8Array([1]));
        else pulled.resolve();
      },
    },
    { highWaterMark: 0 },
  );
  const read = boundedResponseBytes(new Response(body), signal(), 3);
  const rejected = expect(read).rejects.toThrow("synthetic failure");
  await pulled.promise;
  controller.error(new Error("synthetic failure"));
  await rejected;
  expect(body.locked).toBe(false);
});

it("JSON byte acquisition preserves exact multibyte wire bytes before public receiver parsing", async () => {
  const bytes = new TextEncoder().encode(' {"text":"€"}\n');
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    },
  });
  expect(
    await boundedJsonBytes(
      new Response(body, {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }),
      signal(),
      bytes.length,
    ),
  ).toEqual(bytes);
  expect(body.locked).toBe(false);
});

it("raw JSON bytes defer fatal UTF8 validation while the existing text interface still refuses it", async () => {
  const bytes = new Uint8Array([0xc3, 0x28]);
  const response = () =>
    new Response(bytes, { headers: { "Content-Type": "application/json" } });
  expect(await boundedJsonBytes(response(), signal(), 2)).toEqual(bytes);
  await expect(boundedJsonText(response(), signal(), 2)).rejects.toBeDefined();
});

it.each(["", "text/html", "application/jsonp", "application/octet-stream"])(
  "JSON byte acquisition refuses media %s before reading and disposes the body",
  async (media) => {
    const cancel = vi.fn(() => new Promise<void>(() => undefined));
    const pull = vi.fn();
    const body = new ReadableStream<Uint8Array>(
      { cancel, pull },
      { highWaterMark: 0 },
    );
    await expect(
      boundedJsonBytes(
        new Response(body, { headers: { "Content-Type": media } }),
        signal(),
        2,
      ),
    ).rejects.toThrow("format");
    expect(pull).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  },
);

it("deadline covers a stalled binary body and does not await body cancellation", async () => {
  vi.useFakeTimers();
  const pulled = deferred<void>();
  const cancelled = deferred<void>();
  const cancel = vi.fn(() => {
    cancelled.resolve();
    return new Promise<void>(() => undefined);
  });
  const body = new ReadableStream<Uint8Array>(
    {
      pull() {
        pulled.resolve();
      },
      cancel,
    },
    { highWaterMark: 0 },
  );
  const read = withActionDeadline(
    [],
    (lifetime) => boundedResponseBytes(new Response(body), lifetime, 10),
    100,
  );
  const rejected = expect(read).rejects.toBeDefined();
  await pulled.promise;
  await vi.advanceTimersByTimeAsync(101);
  await rejected;
  await cancelled.promise;
  expect(cancel).toHaveBeenCalledOnce();
  expect(body.locked).toBe(false);
});

it("missing bodies cannot become successful empty binary downloads", async () => {
  await expect(
    boundedResponseBytes(new Response(null), signal(), 1),
  ).rejects.toThrow("body");
});
