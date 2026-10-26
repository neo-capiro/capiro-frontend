import { createHash } from "node:crypto";
import type {
  NativeBillTextSourceEvent,
  BillTextSourceReadResponse,
} from "@capiro/meri-contracts/conversation-sources";
import type { ConversationUsageResponse } from "@capiro/meri-contracts/conversation-usage";

/** Synthetic public wire records only; no provider, customer or private accounting data. */
export const currentBinding = {
  tenantId: "20000000-0000-4000-8000-000000000001",
  actorId: "10000000-0000-4000-8000-000000000001",
  conversationId: "30000000-0000-4000-8000-000000000003",
  runId: "40000000-0000-4000-8000-000000000004",
  attemptId: "50000000-0000-4000-8000-000000000005",
  workerId: "60000000-0000-4000-8000-000000000006",
  writerFence: 1,
};
export const currentContext = {
  ...currentBinding,
  selectedClientId: "10000000-0000-4000-8000-000000000001",
};
export const sourceText =
  '<script>alert("inert")</script>\nSynthetic bill text 😀\nhttps://inert.example.test/';
export function nativeSource(): NativeBillTextSourceEvent {
  const hash = "a".repeat(64),
    offset = 37,
    endOffset = offset + sourceText.length;
  return {
    contractVersion: "0.1.0",
    eventId: "70000000-0000-4000-8000-000000000002",
    binding: currentBinding,
    sequence: 2,
    createdAt: "2026-10-26T06:00:00Z",
    scopes: [
      {
        tenantId: currentBinding.tenantId,
        kind: "client",
        resourceId: currentContext.selectedClientId,
        policyRevision: "policy1",
      },
    ],
    type: "source.native-bill-text",
    data: {
      schemaVersion: "meri.native-bill-text-source/1",
      deliveryId: "synthetic-delivery",
      operation: { id: "read_bill_text", version: "0.2.0" },
      requestSha256: hash,
      argumentsSha256: hash,
      resultSha256: hash,
      executionSha256: hash,
      policyRevision: "policy1",
      source: {
        authoritativeOwner: "federal_evidence_current",
        billId: "119-HR-42",
        versionCode: "ih",
        revisionId: "90000000-0000-4000-8000-000000000009",
        packageId: "synthetic-package",
        provider: "synthetic",
        lineageKey: "synthetic-lineage",
        versionHash: hash,
        textHash: hash,
      },
      page: {
        offset,
        endOffset,
        totalCharacters: endOffset,
        textSha256: createHash("sha256").update(sourceText).digest("hex"),
        pageComplete: true,
        contentComplete: false,
        paginationComplete: true,
        truncated: true,
      },
    },
  };
}
export function sourceResponse(): BillTextSourceReadResponse {
  const event = nativeSource(),
    page = event.data.page;
  return {
    schemaVersion: "meri.bill-text-source-read/1",
    event,
    current: {
      text: sourceText,
      sourceModifiedAt: null,
      publishedAt: null,
      fetchedAt: "2026-10-26T07:00:00Z",
      coverage: {
        totalCharacters: page.totalCharacters,
        pageComplete: true,
        contentComplete: false,
        paginationComplete: true,
        complete: true,
        truncated: true,
        nextCursor: null,
        locator: { offset: page.offset, endOffset: page.endOffset },
      },
      sourceLocator: "https://example.test/bill/119-HR-42/ih",
      linkStatus: "available",
    },
  };
}
export function recordedUsage(zero = false): ConversationUsageResponse {
  const n = zero ? 0 : 1;
  const model = (name: string, count: number) => ({
    model: name,
    inputTokens: count * n,
    outputTokens: 20 * n,
    cacheReadInputTokens: 30 * n,
    cacheCreationInputTokens: 40 * n,
    webSearchRequests: n,
  });
  return {
    schemaVersion: "meri.conversation-usage/1",
    conversationId: currentBinding.conversationId,
    runId: currentBinding.runId,
    recording: "recorded",
    usage: {
      status: "recorded",
      reason: null,
      currency: "USD",
      providerBilledUsd: null,
      runDelta: {
        sdkEstimateUsd: 0.1 * n,
        modelCounters: [model("model.alpha", 10), model("model.beta", 20)],
      },
      cumulative: {
        sdkEstimateUsd: 0.3 * n,
        basis: {
          sdk: "0.3.295",
          cli: "2.1.295",
          provider: "bedrock",
          cacheWriteTtl: "5m",
          priceRevision: "synthetic-prices",
        },
        models: [
          {
            ...model("model.alpha", 100),
            sdkEstimateUsd: 0.1 * n,
            provider: "bedrock",
            costBasis: "list",
          },
          {
            ...model("model.beta", 200),
            sdkEstimateUsd: 0.2 * n,
            provider: "unknown",
            costBasis: "unknown",
          },
        ],
      },
    },
    toolAudit: {
      coverage: "recorded-hooks-only",
      partial: true,
      omitted: 2,
      tools: [
        { name: "Read", executionOutcome: "completed", durationMs: 0 },
        { name: "Read", executionOutcome: "failed", durationMs: null },
      ],
    },
  };
}
export const missingUsage = (): ConversationUsageResponse => ({
  ...recordedUsage(),
  recording: "not-recorded",
  usage: null,
  toolAudit: null,
});
export const unavailableUsage = (): ConversationUsageResponse => ({
  ...recordedUsage(),
  usage: {
    status: "unavailable",
    reason: "result_unavailable",
    currency: "USD",
    providerBilledUsd: null,
    runDelta: null,
    cumulative: null,
  },
});
