import { expect, it, vi } from "vitest";
import {
  createConversationReads,
  conversationCurrentReadOperation,
  sourceReadOperation,
  usageReadOperation,
} from "../src/shared/meri-conversations/current-reads";
import { proxyConversationNativeRead } from "../src/shared/meri-conversations/history-proxy";
import {
  currentContext,
  sourceResponse,
  recordedUsage,
  missingUsage,
  unavailableUsage,
} from "./meri-current-read-fixtures";

const json = (value: unknown, status = 200) => Response.json(value, { status });
const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
const sourceInput = {
  schemaVersion: "meri.bill-text-source-read/1",
  conversationId: currentContext.conversationId,
  runId: currentContext.runId,
  referenceId: sourceResponse().event.eventId,
};
const usageInput = {
  schemaVersion: "meri.conversation-usage/1",
  conversationId: currentContext.conversationId,
  runId: currentContext.runId,
};
const signal = () => new AbortController().signal;

it("reads exact positive-offset source and distinct usage states through installed public receivers without admission or bearer storage", async () => {
  let reply: unknown = sourceResponse();
  const fetcher = vi.fn<typeof fetch>(async () => json(reply));
  const reads = createConversationReads(
    currentContext,
    signal(),
    () => true,
    vi.fn(),
    fetcher,
  );
  expect(
    await reads.source(currentContext.runId, sourceInput.referenceId, signal()),
  ).toEqual(reply);
  for (const value of [
    missingUsage(),
    unavailableUsage(),
    recordedUsage(true),
    recordedUsage(),
  ]) {
    reply = value;
    expect(await reads.usage(currentContext.runId, signal())).toEqual(value);
  }
  expect(fetcher.mock.calls.map(([path]) => path)).toEqual([
    sourceReadOperation.path,
    ...Array(4).fill(usageReadOperation.path),
  ]);
  expect(
    JSON.parse(
      new TextDecoder().decode(fetcher.mock.calls[0]![1]!.body as Uint8Array),
    ),
  ).toEqual(sourceInput);
  for (const [, init] of fetcher.mock.calls)
    expect(init).toMatchObject({
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
});

it("rejects wrong-bound, malformed, oversized and private-field responses before disclosure", async () => {
  const wrong = sourceResponse();
  wrong.event.binding = {
    ...wrong.event.binding,
    runId: "40000000-0000-4000-8000-000000000099",
  };
  for (const reply of [
    json(wrong),
    json({ privateText: "must not display" }),
    new Response("x".repeat(131073), {
      headers: { "Content-Type": "application/json" },
    }),
  ]) {
    const reads = createConversationReads(
      currentContext,
      signal(),
      () => true,
      vi.fn(),
      async () => reply,
    );
    await expect(
      reads.source(currentContext.runId, sourceInput.referenceId, signal()),
    ).rejects.toThrow();
  }
  const invalid = { ...recordedUsage(), toolUseId: "private-correlation" };
  const reads = createConversationReads(
    currentContext,
    signal(),
    () => true,
    vi.fn(),
    async () => json(invalid),
  );
  await expect(reads.usage(currentContext.runId, signal())).rejects.toThrow();
});

it("rejects late results when the existing lifetime changes even if fetch ignores abort", async () => {
  let deliver!: (value: Response) => void;
  let current = true;
  const fetcher = vi.fn<typeof fetch>(
    () =>
      new Promise((resolve) => {
        deliver = resolve;
      }),
  );
  const reads = createConversationReads(
    currentContext,
    signal(),
    () => current,
    vi.fn(),
    fetcher,
  );
  const pending = reads.usage(currentContext.runId, signal());
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  current = false;
  deliver(json(recordedUsage()));
  await expect(pending).rejects.toThrow("lifetime ended");
});

it("delegates native denial to the existing access owner but keeps source staleness local", async () => {
  const lost = vi.fn();
  let reply = json({ error: { code: "SOURCE_REFERENCE_STALE" } }, 409);
  const reads = createConversationReads(
    currentContext,
    signal(),
    () => true,
    lost,
    async () => reply,
  );
  await expect(
    reads.source(currentContext.runId, sourceInput.referenceId, signal()),
  ).rejects.toMatchObject({ code: "SOURCE_REFERENCE_STALE" });
  expect(lost).not.toHaveBeenCalled();
  reply = json({ private: "ignored denial content" }, 403);
  await expect(reads.usage(currentContext.runId, signal())).rejects.toThrow();
  expect(lost).toHaveBeenCalledOnce();
});

it("forwards only exact current-read routes with the current native bearer and validates the returned binding", async () => {
  const origin = "https://frontend.example.test";
  const config = {
    enabled: true,
    baseUrl: "https://meri.example.test",
    frontendOrigin: origin,
  };
  for (const [operation, input, output] of [
    [sourceReadOperation, sourceInput, sourceResponse()],
    [usageReadOperation, usageInput, recordedUsage()],
  ] as const) {
    const fetcher = vi.fn<typeof fetch>(async () => json(output));
    const request = () =>
      new Request(origin + operation.path, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: bytes(input),
      });
    const result = await proxyConversationNativeRead(
      request(),
      operation,
      config,
      async () => "current-native",
      fetcher,
    );
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual(output);
    expect(result.headers.get("cache-control")).toContain("no-store");
    expect(fetcher.mock.calls[0]![1]!.headers).toMatchObject({
      Authorization: "Bearer current-native",
    });
    expect(
      await proxyConversationNativeRead(
        request(),
        operation,
        config,
        async () => null,
        fetcher,
      ),
    ).toHaveProperty("status", 401);
  }
  expect(conversationCurrentReadOperation("source-read")?.path).toBe(
    sourceReadOperation.path,
  );
  expect(conversationCurrentReadOperation("usage")).toBe(usageReadOperation);
  expect(conversationCurrentReadOperation("usage/anything")).toBeUndefined();
});
