import type { Matter, TimelineEntry } from "./contracts";

export const lifecycleStatuses = [
  "planning",
  "active",
  "monitoring",
  "outcome_observed",
  "successful",
  "partially_successful",
  "unsuccessful",
  "withdrawn",
  "archived",
] as const;
export const legacyStatuses = ["open", "resolved", "stalled"] as const;
export const statusLabel = (status: string) => status.replaceAll("_", " ");
export function matchesMatter(matter: Matter, search: string, status: string) {
  const text = [
    matter.title,
    matter.summary,
    matter.primaryPeCode,
    matter.primaryBillId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
  return (
    (!status || matter.status === status) &&
    (!search.trim() || text.includes(search.trim().toLocaleLowerCase()))
  );
}
export function filterTimeline(
  entries: TimelineEntry[],
  matters: Matter[] | undefined,
  search: string,
  status: string,
) {
  if (!search.trim() && !status) return entries;
  if (!matters) return undefined;
  const byId = new Map(matters.map((matter) => [matter.id, matter]));
  return entries.filter((entry) => {
    const matter = entry.matterId ? byId.get(entry.matterId) : undefined;
    if (status && (!matter || matter.status !== status)) return false;
    const needle = search.trim().toLocaleLowerCase();
    return (
      !needle ||
      entry.title.toLocaleLowerCase().includes(needle) ||
      Boolean(matter && matchesMatter(matter, search, ""))
    );
  });
}
export function timelineDate(value: string | null) {
  if (value === null) return "Undated";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}
export function timelineIcon(entry: TimelineEntry) {
  if (entry.subtype.includes("meeting")) return "users";
  if (entry.subtype.includes("email") || entry.subtype.includes("mail"))
    return "mail";
  if (
    entry.subtype.includes("bill") ||
    entry.subtype.includes("legislat") ||
    entry.subtype.includes("outcome")
  )
    return "landmark";
  return "file-text";
}
