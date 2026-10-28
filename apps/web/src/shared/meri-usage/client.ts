import {
  USAGE_OVERVIEW_SCHEMA,
  type UsageOverviewResponse,
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
      return readCurrentNative<UsageOverviewResponse>(
        usageOverviewOperation,
        { schemaVersion: USAGE_OVERVIEW_SCHEMA },
        signal,
        fetcher,
        isCurrent,
        onAccessLost,
      );
    },
  });
}
