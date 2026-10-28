import {
  USAGE_OVERVIEW_SCHEMA_V2,
  type UsageOverviewResponse2,
} from "@capiro/meri-contracts/conversation-usage";
import { readCurrentNative } from "../meri-conversations/current-reads";
import { usageOverviewOperation } from "./operations";

export function createUsageOverviewClient(
  isCurrent: () => boolean,
  onAccessLost: () => void,
  fetcher: typeof fetch = fetch,
) {
  return Object.freeze({
    read(signal: AbortSignal) {
      return readCurrentNative<UsageOverviewResponse2>(
        usageOverviewOperation,
        { schemaVersion: USAGE_OVERVIEW_SCHEMA_V2 },
        signal,
        fetcher,
        isCurrent,
        onAccessLost,
      );
    },
  });
}
