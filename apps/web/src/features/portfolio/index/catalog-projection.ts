import type { Prospect } from "@/features/portfolio/prospects/public";
import type { Client } from "./contracts";
import {
  filterClients,
  filterProspects,
  sortClients,
  type PortfolioIndexState,
} from "./filter";

/** Compose the two accessible catalogs without counting a linked Core prospect twice. */
export function projectPortfolioCatalog({
  records,
  prospectRecords,
  prospectVisibleCount,
  state,
  owners,
}: {
  records?: Client[];
  prospectRecords?: readonly Prospect[];
  prospectVisibleCount?: number;
  state: PortfolioIndexState;
  owners: Parameters<typeof filterClients>[2];
}) {
  const coreById = new Map(
    (records ?? []).map((client) => [client.id, client]),
  );
  const linkedCoreIds = new Set(
    (prospectRecords ?? [])
      .map((prospect) => prospect.linkedClientId)
      .filter((id): id is string => Boolean(id)),
  );
  const coreOnlyProspects = (records ?? []).filter(
    (client) =>
      client.profileType === "PROSPECT" && !linkedCoreIds.has(client.id),
  );
  const allCore = (records ?? []).filter(
    (client) =>
      client.profileType !== "PROSPECT" || !linkedCoreIds.has(client.id),
  );
  const allBd = (prospectRecords ?? []).filter((prospect) => {
    const linked = prospect.linkedClientId
      ? coreById.get(prospect.linkedClientId)
      : undefined;
    return !linked || linked.profileType === "PROSPECT";
  });
  const rows = sortClients(
    filterClients(
      state.type === "PROSPECT" ? coreOnlyProspects : allCore,
      state,
      owners,
    ).filter(
      (client) => state.type !== "CLIENT" || client.profileType === "CLIENT",
    ),
    state.sort,
  );
  const visibleProspects =
    prospectRecords && state.type !== "CLIENT"
      ? filterProspects(
          state.type === "PROSPECT" ? prospectRecords : allBd,
          state,
        )
      : [];
  const prospectsCapped =
    prospectVisibleCount !== undefined &&
    prospectRecords !== undefined &&
    prospectVisibleCount > prospectRecords.length;
  // When loaded BD records are capped, unseen links cannot be deduplicated
  // against Core. With no Core prospect, the BD prospect count is still exact.
  const prospectCount =
    prospectVisibleCount === undefined || !records
      ? undefined
      : prospectsCapped && coreOnlyProspects.length > 0
        ? undefined
        : prospectVisibleCount + coreOnlyProspects.length;
  const allCount =
    prospectVisibleCount === undefined || !records
      ? undefined
      : prospectsCapped && records.length > 0
        ? undefined
        : allCore.length +
          allBd.length +
          (prospectVisibleCount - (prospectRecords?.length ?? 0));
  return { rows, visibleProspects, prospectsCapped, prospectCount, allCount };
}
