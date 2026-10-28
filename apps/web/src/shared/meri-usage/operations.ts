import {
  usageOverviewMetadata,
  receiveUsageOverviewRequest,
  receiveUsageOverviewResponse,
  type UsageOverviewResponse,
  type UsageOverviewErrorResponse,
} from "@capiro/meri-contracts/conversation-usage";
import type { CurrentReadOperation } from "../meri-conversations/current-reads";

/** Independent tenant aggregate receiving; no session or principal selectors. */
export const usageOverviewOperation: CurrentReadOperation<
  UsageOverviewResponse | UsageOverviewErrorResponse
> = {
  path: usageOverviewMetadata.path,
  requestBytes: usageOverviewMetadata.requestBytes,
  responseBytes: usageOverviewMetadata.responseBytes,
  admit(bytes) {
    const request = receiveUsageOverviewRequest(bytes);
    return (status, body) =>
      receiveUsageOverviewResponse(status, body, request);
  },
};
