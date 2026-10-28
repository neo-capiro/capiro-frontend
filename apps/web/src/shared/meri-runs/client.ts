import {
  RUN_INDEX_SCHEMA,
  RUN_DETAIL_SCHEMA,
  type RunIndexListRequest,
  type RunIndexListResponse,
  type RunIndexDetailResponse,
} from "@capiro/meri-contracts/conversation-history";
import { CONVERSATION_USAGE_SCHEMA } from "@capiro/meri-contracts/conversation-usage";
import {
  readCurrentNative,
  usageReadOperation,
} from "../meri-conversations/current-reads";
import { runReadOperation } from "./operations";

/** Current native-auth reads need no conversation session or model execution. */
export function createRunsClient(
  isCurrent: () => boolean,
  onAccessLost: () => void,
  fetcher: typeof fetch = fetch,
) {
  return Object.freeze({
    list(
      input: Omit<RunIndexListRequest, "schemaVersion">,
      signal: AbortSignal,
    ) {
      return readCurrentNative<RunIndexListResponse>(
        runReadOperation("list"),
        { schemaVersion: RUN_INDEX_SCHEMA, ...input },
        signal,
        fetcher,
        isCurrent,
        onAccessLost,
      );
    },
    detail(conversationId: string, runId: string, signal: AbortSignal) {
      return readCurrentNative<RunIndexDetailResponse>(
        runReadOperation("detail"),
        { schemaVersion: RUN_DETAIL_SCHEMA, conversationId, runId },
        signal,
        fetcher,
        isCurrent,
        onAccessLost,
      );
    },
    usage(conversationId: string, runId: string, signal: AbortSignal) {
      return readCurrentNative(
        usageReadOperation,
        { schemaVersion: CONVERSATION_USAGE_SCHEMA, conversationId, runId },
        signal,
        fetcher,
        isCurrent,
        onAccessLost,
      );
    },
  });
}
export type RunsClient = ReturnType<typeof createRunsClient>;
