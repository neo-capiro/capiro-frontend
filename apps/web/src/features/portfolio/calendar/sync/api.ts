import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import {
  calendarConnectionsSchema,
  type CalendarSyncIntent,
} from "./contracts";

export async function fetchOwnedCalendarConnections(
  api: ApiClient,
  userId: string,
  signal?: AbortSignal,
) {
  const connections = await api.request(
    "core",
    "engagement/integrations",
    calendarConnectionsSchema,
    { signal },
  );
  if (!userId || connections.some((item) => item.createdByUserId !== userId))
    throw new ApiError(
      502,
      "The service returned an account outside the current caller's scope.",
    );
  return connections;
}

/** Current mailbox ownership is checked again before reserving or continuing an import. */
export async function verifyCalendarAccount(
  api: ApiClient,
  intent: CalendarSyncIntent,
  userId: string,
  assertCurrent: () => void,
  signal: AbortSignal,
  resume = false,
) {
  assertCurrent();
  const accounts = await fetchOwnedCalendarConnections(api, userId, signal);
  assertCurrent();
  const account = accounts.find((item) => item.id === intent.connectionId);
  if (
    !account ||
    account.provider !== intent.provider ||
    !(account.status === "connected" || (resume && account.status === "error"))
  )
    throw new ApiError(
      409,
      "This calendar account changed. Review its current connection before continuing.",
    );
}
