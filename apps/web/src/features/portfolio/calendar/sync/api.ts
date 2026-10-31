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
  // Absent ownership is not evidence of an outside caller: `engagement/integrations`
  // already filters to the caller's own connections. Only a stated different owner
  // is a contract violation. Kept as one message so the dialog never shows the
  // schema's generic "unexpected response" for this case (B3).
  if (
    !userId ||
    connections.some(
      (item) => item.createdByUserId != null && item.createdByUserId !== userId,
    )
  )
    throw new ApiError(
      502,
      "The calendar connections returned did not match your account. Refresh and try again.",
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
