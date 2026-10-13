import type { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import { identitySchema } from "@/shared/portfolio/auth/identity";
import type { BoardPage } from "./contracts";

/** A read scope, not write permission; native services still authorize each request. */
export function trackerReaderKey(cache: QueryClient) {
  const state = cache.getQueryState(["identity"]);
  const identity = identitySchema.safeParse(state?.data);
  if (
    state?.status !== "success" ||
    state.error ||
    state.isInvalidated ||
    state.fetchStatus !== "idle" ||
    !identity.success ||
    !identity.data.user.id.trim() ||
    !identity.data.tenant?.id.trim()
  )
    return "";
  return JSON.stringify([
    identity.data.tenant.id,
    identity.data.user.id,
    identity.data.role,
  ]);
}
export function assertTrackerReader(cache: QueryClient, scope: string) {
  if (!scope || trackerReaderKey(cache) !== scope)
    throw new ApiError(
      403,
      "Your session changed. Reload the tracker to view current bills.",
    );
}

export function currentBoard(
  source: {
    isSuccess: boolean;
    error: unknown;
    data?: { pages: BoardPage[] };
  },
  search = "",
) {
  const pages =
    source.isSuccess && !source.error ? (source.data?.pages ?? []) : [];
  const all = pages.flatMap((page) =>
    page.columns.flatMap((column) => column.bills),
  );
  const bills = [...new Map(all.map((bill) => [bill.billId, bill])).values()];
  const needle = search.trim().toLowerCase();
  const columns = (pages[0]?.columns ?? []).map((column) => ({
    ...column,
    bills: bills.filter(
      (bill) =>
        bill.stage === column.id &&
        `${bill.displayNum} ${bill.title ?? ""}`.toLowerCase().includes(needle),
    ),
  }));
  return { pages, bills, columns, total: pages[0]?.total };
}
