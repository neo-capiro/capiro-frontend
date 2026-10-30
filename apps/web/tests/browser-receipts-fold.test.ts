import { describe, expect, it } from "vitest";
import type { ConversationEvent } from "@capiro/meri-contracts/conversation-application";
import { turnFromEvents } from "../src/features/meri/conversation/conversation-view";

const RUN = "00000000-0000-4000-8000-000000000003";
const binding = {
  tenantId: "tenant",
  actorId: "actor",
  conversationId: "00000000-0000-4000-8000-000000000001",
  runId: RUN,
  attemptId: "00000000-0000-4000-8000-000000000004",
  workerId: "00000000-0000-4000-8000-000000000005",
  writerFence: 1,
};
const scopes = [
  { tenantId: "tenant", kind: "private-user" as const, resourceId: "actor", policyRevision: "p1" },
];

function receipt(seq: number, id: string, over: Record<string, unknown> = {}) {
  return {
    contractVersion: "0.1.0",
    eventId: id,
    binding,
    sequence: seq,
    createdAt: new Date(1_700_000_000_000 + seq).toISOString(),
    scopes,
    type: "browser.receipt",
    data: {
      schema: "meri-browser-receipt/1",
      kind: "browser.action",
      binding,
      sessionId: "session-1",
      toolUseId: null,
      action: "browser_click",
      urlHost: "app.capiro.example",
      atMs: 1_700_000_000_000 + seq,
      reference: null,
      outcome: "ok",
    },
    ...over,
  } as unknown as ConversationEvent;
}

const fold = (events: ConversationEvent[]) =>
  turnFromEvents(events, { runId: RUN }, null, "running", false);

describe("browser receipts in a saved turn", () => {
  it("folds receipts apart from legacy tool activity, in admitted order, one entry per event", () => {
    const turn = fold([
      receipt(1, "r1"),
      receipt(2, "r2", {
        data: {
          schema: "meri-browser-receipt/1",
          kind: "browser.download",
          binding,
          urlHost: "files.capiro.example",
          atMs: 1_700_000_000_002,
          reference: "downloads/r-1",
          sha256: null,
          bytes: 12,
          mimeType: "application/pdf",
        },
      }),
      receipt(1, "r1"),
    ]);
    expect(turn.browserReceipts.map((e) => e.eventId)).toEqual(["r1", "r2"]);
    expect(turn.tools).toEqual([]);
    expect(turn.messages).toEqual([]);
    // Nothing derived from a receipt claims the action succeeded beyond the receipt's own outcome.
    expect(turn.approvals).toEqual([]);
    expect(turn.artifacts).toEqual([]);
  });

  it("keeps only the receipt bound to this run", () => {
    const turn = fold([
      receipt(1, "mine"),
      receipt(2, "other", { binding: { ...binding, runId: "other-run" } }),
    ]);
    expect(turn.browserReceipts.map((e) => e.eventId)).toEqual(["mine"]);
  });

  it("preserves the receipt's own ok/error outcome verbatim", () => {
    const turn = fold([
      receipt(1, "a"),
      receipt(2, "b", {
        data: {
          schema: "meri-browser-receipt/1",
          kind: "browser.action",
          binding,
          sessionId: "session-1",
          toolUseId: "toolu_01",
          action: "browser_click",
          urlHost: "app.capiro.example",
          atMs: 1_700_000_000_002,
          reference: null,
          outcome: "error",
        },
      }),
    ]);
    expect(
      turn.browserReceipts.map((e) => (e.data.kind === "browser.action" ? e.data.outcome : null)),
    ).toEqual(["ok", "error"]);
  });
});
