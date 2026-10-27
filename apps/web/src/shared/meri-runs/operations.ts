import {
  RUN_INDEX_PATHS,
  runIndexMetadata,
  receiveRunIndexRequest,
  receiveRunIndexResponse,
  type RunIndexRoute,
  type RunIndexResponseMap,
  type RunIndexErrorResponse,
} from "@capiro/meri-contracts/conversation-history";
import type { CurrentReadOperation } from "../meri-conversations/current-reads";

/** The receiver retains the exact admitted selector; it never issues run authority. */
export function runReadOperation<R extends RunIndexRoute>(
  route: R,
): CurrentReadOperation<RunIndexResponseMap[R] | RunIndexErrorResponse> {
  return {
    path: RUN_INDEX_PATHS[route],
    requestBytes: runIndexMetadata.requestBytes,
    responseBytes: runIndexMetadata.responseBytes,
    admit(bytes) {
      const request = receiveRunIndexRequest(route, bytes);
      return (status, body) =>
        receiveRunIndexResponse(route, status, body, request);
    },
  };
}
