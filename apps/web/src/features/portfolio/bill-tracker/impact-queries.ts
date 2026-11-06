"use client";
import { useEffect, useRef } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { ApiError } from "@/shared/portfolio/api/http";
import type {
  ImpactContext,
  ImpactDetail,
} from "@/shared/capiro/operations/legiwatch-impact-schemas";
import { assertTrackerReader } from "./current-data";
import { boardKey, useTrackerReaderScope } from "./queries";

export function assertImpactAssociation(
  detail: ImpactDetail,
  clientId: string,
  billId: string,
) {
  if (detail.row.clientId !== clientId || detail.row.billId !== billId)
    throw new ApiError(
      502,
      "The bill detail did not match the selected client and bill.",
    );
  return detail;
}

export function useImpactTracker(clientId: string | undefined, q: string) {
  const api = useCapiro(),
    cache = useQueryClient();
  const scope = useTrackerReaderScope();
  const query = useInfiniteQuery({
    queryKey: ["legiwatch-tracker", scope, clientId ?? "all", q],
    initialPageParam: undefined as string | undefined,
    enabled: Boolean(scope),
    retry: false,
    queryFn: async ({ pageParam, signal }) => {
      assertTrackerReader(cache, scope);
      const page = await api.request(
        "legiwatch.tracker",
        {
          query: { clientId, q: q || undefined, cursor: pageParam, limit: 25 },
        },
        { signal },
      );
      signal.throwIfAborted();
      assertTrackerReader(cache, scope);
      if (clientId && page.rows.some((row) => row.clientId !== clientId))
        throw new ApiError(
          502,
          "The tracker returned a different client scope.",
        );
      return page;
    },
    getNextPageParam: (last, _pages, _last, params) =>
      last.nextCursor && !params.includes(last.nextCursor)
        ? last.nextCursor
        : undefined,
  });
  const pages =
    scope && query.isSuccess && !query.error ? query.data.pages : [];
  const rows = [
    ...new Map(
      pages
        .flatMap((page) => page.rows)
        .map((row) => [JSON.stringify([row.clientId, row.billId]), row]),
    ).values(),
  ];
  return {
    ...query,
    scope,
    rows,
    clients: pages[0]?.clients ?? [],
    total: pages[0]?.total,
    backend: pages[0]?.trackerBackend,
  };
}

export function useImpactDetail(clientId: string, billId: string) {
  const api = useCapiro(),
    cache = useQueryClient();
  const scope = useTrackerReaderScope();
  const query = useQuery<ImpactDetail>({
    queryKey: ["legiwatch-impact", clientId, billId, scope],
    enabled: Boolean(scope),
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: (current) =>
      current.state.status !== "error" &&
      ["queued", "running"].includes(current.state.data?.refresh?.state ?? "")
        ? 3000
        : false,
    queryFn: async ({ signal }) => {
      assertTrackerReader(cache, scope);
      const detail = await api.request(
        "legiwatch.impact",
        { params: { clientId, billId } },
        { signal },
      );
      signal.throwIfAborted();
      assertTrackerReader(cache, scope);
      return assertImpactAssociation(detail, clientId, billId);
    },
  });
  const previousRefresh = useRef(false);
  useEffect(() => {
    if (!query.data || query.error || !scope) return;
    const active = ["queued", "running"].includes(
      query.data.refresh?.state ?? "",
    );
    if (previousRefresh.current && !active)
      void cache.invalidateQueries({ queryKey: ["legiwatch-tracker"] });
    previousRefresh.current = active;
  }, [query.data, query.error, cache, scope]);
  return {
    ...query,
    scope,
    current:
      scope && query.isFetchedAfterMount && query.isSuccess && !query.error
        ? query.data
        : undefined,
  };
}

export function useImpactWrite(
  clientId: string,
  billId: string,
  scope: string,
) {
  const api = useCapiro(),
    cache = useQueryClient();
  return useMutation({
    mutationFn: async (context: ImpactContext | undefined) => {
      assertTrackerReader(cache, scope);
      const params = { clientId, billId };
      const detail = context
        ? await api.request("legiwatch.bill.context", { params, body: context })
        : await api.request("legiwatch.impact.analyze", { params, body: {} });
      assertTrackerReader(cache, scope);
      return assertImpactAssociation(detail, clientId, billId);
    },
    onSuccess: async (detail) => {
      cache.setQueryData(["legiwatch-impact", clientId, billId, scope], detail);
      await cache.invalidateQueries({ queryKey: ["legiwatch-tracker"] });
      await cache.invalidateQueries({
        queryKey: boardKey(clientId, detail.row.trackerBackend),
      });
    },
    onError: async (error) => {
      const status = (error as { status?: number }).status;
      if (status === 403 || status === 404) {
        cache.removeQueries({
          queryKey: ["legiwatch-impact", clientId, billId, scope],
          exact: true,
        });
        await cache.invalidateQueries({ queryKey: ["legiwatch-tracker"] });
      }
    },
  });
}
