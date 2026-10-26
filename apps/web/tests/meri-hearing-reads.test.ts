import { expect, it, vi } from "vitest";
import {
  createConversationReads,
  conversationCurrentReadOperation,
} from "../src/shared/meri-conversations/current-reads";
import { proxyConversationNativeRead } from "../src/shared/meri-conversations/history-proxy";
import { turnFromEvents } from "../src/features/meri/conversation/conversation-view";
import {
  receiveHearingSourceRequest,
  receiveHearingSourceResponse,
  receiveNativeHearingSourceEvent,
} from "@capiro/meri-contracts/conversation-sources";
import { currentContext, nativeSource } from "./meri-current-read-fixtures";
import fixtures from "./meri-hearing-source-fixtures.json";

const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
const signal = () => new AbortController().signal;
const input = {
  schemaVersion: "meri.hearing-source-read/1",
  conversationId: currentContext.conversationId,
  runId: currentContext.runId,
  referenceId: fixtures.published.event.eventId,
};

it("reads all owner packet kinds through installed public hearing receiving at the existing endpoint", async () => {
  for (const fixture of Object.values(fixtures)) {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(fixture));
    const reads = createConversationReads(
      currentContext,
      signal(),
      () => true,
      vi.fn(),
      fetcher,
    );
    const result = await reads.hearing(
      currentContext.runId,
      fixture.event.eventId,
      signal(),
    );
    expect(result).toEqual(fixture);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]![0]).toBe("/api/conversations/source-read");
    expect(
      JSON.parse(
        new TextDecoder().decode(fetcher.mock.calls[0]![1]!.body as Uint8Array),
      ),
    ).toEqual({ ...input, referenceId: fixture.event.eventId });
  }
});

it("keeps original request binding, payload hash and unknown source families closed", async () => {
  const operation = conversationCurrentReadOperation("source-read")!;
  const receive = await operation.admit(bytes(input));
  const wrong = structuredClone(fixtures.published);
  wrong.event.binding.runId = "40000000-0000-4000-8000-000000000099";
  await expect(receive(200, bytes(wrong))).rejects.toThrow();
  wrong.event.binding.runId = currentContext.runId;
  wrong.current.result.records[0]!.payload.evidence.text =
    "Unadmitted replacement";
  await expect(receive(200, bytes(wrong))).rejects.toThrow();
  expect(() =>
    operation.admit(bytes({ ...input, schemaVersion: "unpublished-source/1" })),
  ).toThrow();
  expect(
    conversationCurrentReadOperation("source-read/anything"),
  ).toBeUndefined();
});

it("shares denial and late-lifetime rejection without opening a new conversation or model run", async () => {
  const lost = vi.fn();
  const denied = createConversationReads(
    currentContext,
    signal(),
    () => true,
    lost,
    async () =>
      Response.json({ error: { code: "ACCESS_DENIED" } }, { status: 403 }),
  );
  await expect(
    denied.hearing(currentContext.runId, input.referenceId, signal()),
  ).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  expect(lost).toHaveBeenCalledTimes(1);
  let current = true;
  const late = createConversationReads(
    currentContext,
    signal(),
    () => current,
    vi.fn(),
    async () => {
      current = false;
      return Response.json(fixtures.published);
    },
  );
  await expect(
    late.hearing(currentContext.runId, input.referenceId, signal()),
  ).rejects.toThrow("Conversation lifetime ended");
});

it("preserves bill sources alongside admitted hearing sources after completed-run reload", () => {
  const event = receiveNativeHearingSourceEvent(
    bytes(fixtures.published.event),
  );
  const bill = nativeSource();
  const turn = turnFromEvents(
    [bill, event],
    currentContext,
    "Synthetic",
    "completed",
    false,
  );
  expect(turn.nativeSources).toEqual([bill, event]);
  expect(turn.sources).toEqual([]);
});

it("uses the same authenticated proxy and public response receiver for hearing reads", async () => {
  const admitted = receiveHearingSourceRequest(bytes(input));
  const operation = conversationCurrentReadOperation("source-read")!;
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json(fixtures.published),
  );
  const request = new Request(
    "https://preview.example.test/api/conversations/source-read",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://preview.example.test",
      },
      body: JSON.stringify(input),
    },
  );
  const response = await proxyConversationNativeRead(
    request,
    operation,
    {
      enabled: true,
      baseUrl: "https://meri.example.test",
      frontendOrigin: "https://preview.example.test",
    },
    async () => "synthetic-token",
    fetcher,
  );
  expect(response.status).toBe(200);
  expect(
    await receiveHearingSourceResponse(
      200,
      new Uint8Array(await response.arrayBuffer()),
      admitted,
    ),
  ).toEqual(fixtures.published);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
