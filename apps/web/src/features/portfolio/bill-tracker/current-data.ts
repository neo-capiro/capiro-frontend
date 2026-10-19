import { hashKey, type Query, type QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import { identitySchema } from "@/shared/portfolio/auth/identity";
import type { TrackerBackend } from "@/shared/portfolio/config/config";
import { billSearchSchema, type BoardPage } from "./contracts";

export const billSearchKey = (
  clientId: string,
  backend: TrackerBackend,
  q: string,
  jurisdictions: string[],
) => ["bill-search", backend, clientId, q, jurisdictions] as const;
export type BillSearchSelection = {
  billId: string;
  source: {
    key: ReturnType<typeof billSearchKey>;
    query: Query;
    revision: number;
  };
};
export function currentBillSearch(
  cache: QueryClient,
  key: ReturnType<typeof billSearchKey>,
) {
  const query = cache.getQueryCache().find({ queryKey: key, exact: true });
  const state = query?.state;
  const record = billSearchSchema.safeParse(state?.data);
  if (
    !query ||
    key[3].trim().length < 2 ||
    state?.status !== "success" ||
    state.error ||
    state.isInvalidated ||
    state.fetchStatus !== "idle" ||
    !record.success
  )
    return null;
  return {
    bills: record.data,
    source: { key, query, revision: state.dataUpdateCount },
  };
}
export function matchesBillSearchSelection(
  current: ReturnType<typeof currentBillSearch>,
  selection: BillSearchSelection | null,
) {
  return Boolean(
    current &&
    selection &&
    current.source.query === selection.source.query &&
    hashKey(current.source.key) === hashKey(selection.source.key) &&
    current.source.revision === selection.source.revision &&
    current.bills.filter((bill) => bill.billId === selection.billId).length ===
      1,
  );
}
export function assertBillSearchSelection(
  cache: QueryClient,
  clientId: string,
  backend: TrackerBackend,
  selection: BillSearchSelection,
) {
  if (
    selection.source.key[1] !== backend ||
    selection.source.key[2] !== clientId ||
    !matchesBillSearchSelection(
      currentBillSearch(cache, selection.source.key),
      selection,
    )
  )
    throw new ApiError(
      409,
      "Search again and choose a current bill before tracking.",
    );
}

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
