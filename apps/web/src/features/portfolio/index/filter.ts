import {
  clientLocation,
  clientSectors,
  memberName,
  type Client,
  type Member,
} from "./contracts";
import { sectorLabel } from "@/shared/portfolio/domain/sector";
import type { Prospect } from "@/features/portfolio/prospects/public";
export interface PortfolioFilter {
  search: string;
  status: string;
  sector: string;
  owner: string;
}
export const unassignedOwner = "unassigned";
export interface PortfolioIndexState extends PortfolioFilter {
  type: string;
  view: "list" | "cards";
  sort: "saved" | "recent" | "name";
  unsupportedSort: string;
}
export function readPortfolioState(
  params: Pick<URLSearchParams, "get">,
): PortfolioIndexState {
  const sort = params.get("sort") ?? "saved";
  return {
    search: params.get("q") ?? "",
    status: params.get("status") ?? "",
    sector: params.get("sector") ?? "",
    owner: params.get("owner") ?? "",
    type: params.get("type") ?? "",
    view:
      (params.get("view") ?? params.get("layout")) === "list"
        ? "list"
        : "cards",
    sort: sort === "saved" || sort === "name" ? sort : "recent",
    unsupportedSort: ["saved", "name", "recent"].includes(sort) ? "" : sort,
  };
}
export function portfolioHref(
  pathname: string,
  params: URLSearchParams,
  key: string,
  value: string,
) {
  const next = new URLSearchParams(params);
  if (value) next.set(key, value);
  else next.delete(key);
  if (key === "view") next.delete("layout");
  return `${pathname}${next.size ? `?${next}` : ""}`;
}
export function clearPortfolioFilters(
  pathname: string,
  params: URLSearchParams,
) {
  const next = new URLSearchParams(params);
  for (const key of ["q", "status", "sector", "owner", "type", "search"])
    next.delete(key);
  return `${pathname}${next.size ? `?${next}` : ""}`;
}
export function sortClients(
  clients: Client[],
  sort: "saved" | "recent" | "name",
) {
  // GET /clients is ordered by createdAt DESC. Preserve that order for Recent.
  return sort === "name"
    ? [...clients].sort(
        (a, b) =>
          a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
            numeric: true,
          }) || a.id.localeCompare(b.id),
      )
    : clients;
}

export type ProspectProfile =
  | { kind: "core"; record: Client }
  | { kind: "prospect"; record: Prospect };

/** Saved order remains source-owned; the existing explicit sort spans both sources. */
export function sortProspectProfiles(
  coreRows: readonly Client[],
  prospects: readonly Prospect[],
  sort: PortfolioIndexState["sort"],
): ProspectProfile[] {
  const rows: ProspectProfile[] = [
    ...coreRows.map((record) => ({ kind: "core" as const, record })),
    ...prospects.map((record) => ({ kind: "prospect" as const, record })),
  ];
  if (sort === "saved") return rows;
  const name = (row: ProspectProfile) =>
    row.kind === "core" ? row.record.name : row.record.displayName;
  const created = (row: ProspectProfile) => {
    const value = row.record.createdAt ? Date.parse(row.record.createdAt) : NaN;
    return Number.isFinite(value) ? value : -Infinity;
  };
  return rows.sort((a, b) => {
    const order =
      sort === "name"
        ? name(a).localeCompare(name(b), undefined, {
            sensitivity: "base",
            numeric: true,
          })
        : created(b) - created(a);
    return (
      order ||
      a.record.id.localeCompare(b.record.id) ||
      a.kind.localeCompare(b.kind)
    );
  });
}

export function sortProspects(
  prospects: readonly Prospect[],
  sort: PortfolioIndexState["sort"],
): Prospect[] {
  return sortProspectProfiles([], prospects, sort).flatMap((row) =>
    row.kind === "prospect" ? [row.record] : [],
  );
}
export function filterClients(
  clients: Client[],
  filter: PortfolioFilter,
  owners: Record<
    string,
    { accountOwnerUserId: string | null; accountOwner?: Member | null }
  >,
) {
  const term = filter.search.trim().toLocaleLowerCase();
  return clients.filter((client) => {
    const location = clientLocation(client);
    const sectors = clientSectors(client);
    const searchText = [
      client.name,
      client.description,
      client.primaryContactName,
      sectors.join(" "),
      sectors.map(sectorLabel).join(" "),
      location?.replace(", ", " "),
      location,
      owners[client.id]?.accountOwner
        ? memberName(owners[client.id]?.accountOwner)
        : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return (
      (!term || searchText.includes(term)) &&
      (!filter.status || client.profileStatus === filter.status) &&
      (!filter.sector || sectors.includes(filter.sector)) &&
      (!filter.owner ||
        (filter.owner === unassignedOwner
          ? owners[client.id]?.accountOwnerUserId === null
          : owners[client.id]?.accountOwnerUserId === filter.owner))
    );
  });
}

export function filterProspects(
  prospects: readonly Prospect[],
  filter: PortfolioFilter,
) {
  // Client profile status and sector have no equivalent on BD prospects.
  const term = filter.search.trim().toLocaleLowerCase();
  return prospects.filter((prospect) => {
    const searchText = [
      prospect.displayName,
      prospect.description,
      prospect.serviceHypothesis,
      prospect.geography,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return (
      (!term || searchText.includes(term)) &&
      (!filter.owner ||
        (filter.owner === unassignedOwner
          ? prospect.ownerUserId === null
          : prospect.ownerUserId === filter.owner)) &&
      !filter.status &&
      !filter.sector
    );
  });
}
