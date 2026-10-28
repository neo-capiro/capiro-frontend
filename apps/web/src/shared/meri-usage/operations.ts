import {
  usageOverviewMetadataV2,
  receiveUsageOverviewRequestV2,
  receiveUsageOverviewResponseV2,
  type UsageOverviewResponse2,
  type UsageOverviewErrorResponse2,
} from "@capiro/meri-contracts/conversation-usage";
import type { CurrentReadOperation } from "../meri-conversations/current-reads";

/** Independent tenant aggregate receiving; no session or principal selectors. */
export const usageOverviewOperation: CurrentReadOperation<
  UsageOverviewResponse2 | UsageOverviewErrorResponse2
> = {
  path: usageOverviewMetadataV2.path,
  requestBytes: usageOverviewMetadataV2.requestBytes,
  responseBytes: usageOverviewMetadataV2.responseBytes,
  admit(bytes) {
    const request = receiveUsageOverviewRequestV2(bytes);
    return (status, body) =>
      receiveUsageOverviewResponseV2(status, body, request);
  },
};
