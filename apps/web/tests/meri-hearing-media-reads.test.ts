import { expect, it, vi } from "vitest";
import {
  createConversationReads,
  conversationCurrentReadOperation,
} from "../src/shared/meri-conversations/current-reads";
import { proxyConversationNativeRead } from "../src/shared/meri-conversations/history-proxy";
import { currentContext } from "./meri-current-read-fixtures";
import { hearingMediaFixture } from "./meri-hearing-media-fixtures";
const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
const signal = () => new AbortController().signal;

it("receives manifest and selected audio through the installed media contract at the current source endpoint", async () => {
  for (const positionMs of [null, 30_000, 50_000]) {
    const value = hearingMediaFixture(positionMs),
      playback =
        positionMs === null ? null : { epochId: "synthetic-epoch", positionMs };
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(value));
    const reads = createConversationReads(
      currentContext,
      signal(),
      () => true,
      vi.fn(),
      fetcher,
    );
    expect(
      await reads.hearingMedia(
        currentContext.runId,
        value.event.eventId,
        playback,
        signal(),
      ),
    ).toEqual(value);
    expect(fetcher.mock.calls[0]![0]).toBe("/api/conversations/source-read");
    expect(
      JSON.parse(
        new TextDecoder().decode(fetcher.mock.calls[0]![1]!.body as Uint8Array),
      ),
    ).toEqual({
      schemaVersion: value.schemaVersion,
      conversationId: currentContext.conversationId,
      runId: currentContext.runId,
      referenceId: value.event.eventId,
      playback,
    });
  }
});

it("rejects substituted source/time/URL and forwards the unchanged request through the current authenticated proxy", async () => {
  const value = hearingMediaFixture(30_000);
  const input = {
    schemaVersion: value.schemaVersion,
    conversationId: currentContext.conversationId,
    runId: currentContext.runId,
    referenceId: value.event.eventId,
    playback: { epochId: "synthetic-epoch", positionMs: 30_000 },
  };
  const operation = conversationCurrentReadOperation("source-read")!;
  const receive = await operation.admit(bytes(input));
  for (const mutate of [
    (v: typeof value) => {
      v.current.source.contentHash = "b".repeat(64);
    },
    (v: typeof value) => {
      v.current.media.playback!.epochId = "other";
    },
    (v: typeof value) => {
      v.current.media.playback!.startMs = 30_001;
    },
    (v: typeof value) => {
      v.current.media.playback!.url = "javascript:alert(1)";
    },
  ]) {
    const wrong = structuredClone(value);
    mutate(wrong);
    await expect(receive(200, bytes(wrong))).rejects.toThrow();
  }
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(value));
  const response = await proxyConversationNativeRead(
    new Request("https://preview.example.test/api/conversations/source-read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://preview.example.test",
      },
      body: JSON.stringify(input),
    }),
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
  expect(await response.json()).toEqual(value);
  expect(fetcher.mock.calls[0]![0].toString()).toBe(
    "https://meri.example.test/api/conversations/source-read",
  );
});

it("discards denied or late media reads when the existing conversation lifetime ends", async () => {
  const lost = vi.fn(),
    value = hearingMediaFixture(30_000),
    selection = { epochId: "synthetic-epoch", positionMs: 30_000 };
  const denied = createConversationReads(
    currentContext,
    signal(),
    () => true,
    lost,
    async () =>
      Response.json({ error: { code: "ACCESS_DENIED" } }, { status: 403 }),
  );
  await expect(
    denied.hearingMedia(
      currentContext.runId,
      value.event.eventId,
      selection,
      signal(),
    ),
  ).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  expect(lost).toHaveBeenCalledTimes(1);
  const controller = new AbortController();
  const late = createConversationReads(
    currentContext,
    controller.signal,
    () => true,
    vi.fn(),
    async () => {
      controller.abort();
      return Response.json(value);
    },
  );
  await expect(
    late.hearingMedia(
      currentContext.runId,
      value.event.eventId,
      selection,
      signal(),
    ),
  ).rejects.toThrow();
});
