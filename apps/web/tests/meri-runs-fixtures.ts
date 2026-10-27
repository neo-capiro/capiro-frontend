import type {
  RunIndexSummary,
  RunIndexListRequest,
  RunIndexListResponse,
  RunIndexDetailResponse,
} from "@capiro/meri-contracts/conversation-history";
import { currentContext } from "./meri-current-read-fixtures";

/** Synthetic records matching the public run wire; no target or customer data. */
export const run: RunIndexSummary = {
  conversationId: currentContext.conversationId,
  runId: currentContext.runId,
  createdAt: "2026-10-27T12:00:00.000Z",
  state: "completed",
  statusAt: "2026-10-27T12:01:00.000Z",
  lastSequence: 3,
  clientIds: [],
  usage: { recording: "recorded", sdkEstimateUsd: 0, providerBilledUsd: null },
  references: {
    conversationId: currentContext.conversationId,
    runId: currentContext.runId,
  },
};
export const listRequest: RunIndexListRequest = {
  schemaVersion: "meri.run-index/1",
  scope: { kind: "general" },
  status: "all",
  cursor: null,
  limit: 20,
};
export const listResponse: RunIndexListResponse = {
  schemaVersion: "meri.run-index/1",
  observedAt: "2026-10-27T12:02:00.000Z",
  scope: listRequest.scope,
  status: "all",
  runs: [run],
  nextCursor: null,
  coverage: {
    kind: "current-authorized-durable-runs",
    complete: true,
    snapshot: false,
  },
};
export const detailResponse: RunIndexDetailResponse = {
  schemaVersion: "meri.run-detail/1",
  observedAt: listResponse.observedAt,
  run,
  continuation: { kind: "conversation-owner", physicalStopVerified: false },
};
