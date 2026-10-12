"use client";
import { useSyncExternalStore } from "react";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { assertTrackerReader, trackerReaderKey } from "./current-data";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import type { TrackerBackend } from "@/shared/portfolio/config/config";
import { fetchBoard, searchBills, setTracked, fetchJurisdictions } from "./api";
import { fetchBillHearings } from "./hearings";
export function useBillHearings(
  clientId: string,
  billId: string,
  backend: TrackerBackend,
) {
  const api = useApi();
  return useQuery({
    queryKey: ["bill-hearings", backend, clientId, billId],
    queryFn: ({ signal }) =>
      fetchBillHearings(api, clientId, billId, backend, signal),
    enabled: backend === "intelligence",
  });
}
export const boardKey = (clientId: string, backend: TrackerBackend) =>
  ["bill-tracker", backend, clientId] as const;
export function useBillBoard(clientId: string, backend: TrackerBackend) {
  const api = useApi();
  const cache = useQueryClient();
  useIdentity();
  const scope = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe((event) => {
        if (event.query.queryKey[0] === "identity") notify();
      }),
    () => trackerReaderKey(cache),
    () => "",
  );
  const query = useInfiniteQuery({
    queryKey: [...boardKey(clientId, backend), scope],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      assertTrackerReader(cache, scope);
      const page = await fetchBoard(api, clientId, backend, pageParam, signal);
      signal.throwIfAborted();
      assertTrackerReader(cache, scope);
      return page;
    },
    enabled: Boolean(scope),
    getNextPageParam: (last, _pages, _lastParam, params) =>
      last.nextCursor && !params.includes(last.nextCursor)
        ? last.nextCursor
        : undefined,
  });
  return { ...query, scope };
}
export function useBillSearch(
  clientId: string,
  backend: TrackerBackend,
  q: string,
  jurisdictions: string[],
) {
  const api = useApi();
  return useQuery({
    queryKey: ["bill-search", backend, clientId, q, jurisdictions],
    queryFn: ({ signal }) =>
      searchBills(api, clientId, backend, q, jurisdictions, signal),
    enabled: q.trim().length >= 2,
  });
}
export function useBillJurisdictions(backend: TrackerBackend) {
  const api = useApi();
  return useQuery({
    queryKey: ["bill-corpus-jurisdictions"],
    queryFn: ({ signal }) => fetchJurisdictions(api, signal),
    enabled: backend === "intelligence",
  });
}
export function useTrackBill(
  clientId: string,
  backend: TrackerBackend,
  onSaved: () => void,
) {
  const api = useApi();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({ billId, track }: { billId: string; track: boolean }) =>
      setTracked(api, clientId, backend, billId, track),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: boardKey(clientId, backend) });
      onSaved();
    },
  });
}
