import type {
  DataAccessFamily,
  DataAccessRelation,
} from "@capiro/meri-client/data-access";
import type { StatusTone } from "../../ui/StatusPill";

/** One source as the page shows it; the state joins Meri's answer with the member's own connections. */
export type DataAccessFamilyRow = {
  id: string;
  family: string;
  covers: string;
  freshness: string;
  state: { label: string; tone: StatusTone };
};

export type DataAccessRelationRow = {
  id: string;
  name: string;
  state: { label: string; tone: StatusTone };
};

/** The member's own provider connections, as Core reports them on the Connections page. */
export type ConnectionSummary = { provider: string };
/** What the page knows about those connections right now. */
export type ConnectionsRead =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; connections: readonly ConnectionSummary[] };

const mailboxProviders = new Set(["microsoft_365", "google_workspace"]);
/** The mail source reads through a mailbox connection the member owns; its status is the provider's business, not this page's. */
export const hasMailbox = (connections: readonly ConnectionSummary[]) =>
  connections.some((connection) => mailboxProviders.has(connection.provider));

const stateLabels: Record<
  DataAccessFamily["state"],
  { label: string; tone: StatusTone }
> = {
  available: { label: "Available", tone: "success" },
  policy_off: { label: "Off by policy", tone: "neutral" },
  client_required: { label: "Needs a selected client", tone: "neutral" },
  not_installed: { label: "Not installed", tone: "neutral" },
};
const rank: Record<DataAccessFamily["state"], number> = {
  not_installed: 0,
  policy_off: 1,
  client_required: 2,
  available: 3,
};

/** Meri's state, except that a mailbox-only source waits for the member's own connection, or for the connections read. */
export function familyState(
  family: Pick<DataAccessFamily, "state" | "requires">,
  connections: ConnectionsRead,
): { label: string; tone: StatusTone } {
  if (family.state === "available" && family.requires === "mailbox") {
    if (connections.status === "loading")
      return { label: "Checking your connections", tone: "neutral" };
    if (connections.status === "unavailable")
      return { label: "Could not check your connections", tone: "warning" };
    if (!hasMailbox(connections.connections))
      return { label: "Connector not connected", tone: "warning" };
  }
  return stateLabels[family.state];
}

/** Result-field names the guidance cites, said in words. */
const fieldWords: Readonly<Record<string, string>> = {
  asOf: "as-of time",
  asOfDate: "as-of date",
  sourceAsOf: "source as-of time",
  sourceVersion: "source version",
  generatedAt: "generation time",
  observedAt: "observation time",
  knownAt: "known-at time",
  createdAt: "creation time",
  updatedAt: "update time",
  recordedAt: "recorded time",
  checkedAt: "checked time",
  nextCursor: "a next-page cursor",
  nextPage: "a next-page marker",
  hasMore: "a more-results flag",
  rowLimitReached: "a row-limit flag",
  byteTruncated: "a size-limit flag",
  revisionId: "revision identifier",
  versionId: "version identifier",
  observationId: "observation identifier",
};
/** Turns a camelCase field name into words when it is not in the table. */
const words = (token: string) =>
  fieldWords[token] ??
  token
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_/]/g, " ")
    .toLowerCase();
/** The guidance sentence with field names spoken as words, never raw identifiers. */
export function freshnessSentence(text: string | null) {
  if (text === null)
    return "No freshness or version information is published for this source.";
  const spoken = text
    .replace(/\b[a-z]+(?:[A-Z][a-z0-9]*)+\b/g, (token) => words(token))
    .replace(/\s+/g, " ")
    .trim();
  return /[.!?]$/.test(spoken) ? spoken : `${spoken}.`;
}

const title = (id: string) =>
  id.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase());
const isSql = (family: DataAccessFamily) =>
  family.family.startsWith("capiro-data");

/**
 * The page's rows: sources a run could list (uninstalled ones are left out), the SQL versions collapsed into one
 * "Capiro data (SQL)" row that carries the best state among them.
 */
export function familyRows(
  families: readonly DataAccessFamily[],
  connections: ConnectionsRead,
): DataAccessFamilyRow[] {
  const installed = families.filter(
    (family) => family.state !== "not_installed",
  );
  const sql = installed
    .filter(isSql)
    .sort((a, b) => rank[b.state] - rank[a.state]);
  const rows = [
    ...(sql[0]
      ? [{ ...sql[0], family: "capiro-data", label: "Capiro data (SQL)" }]
      : []),
    ...installed
      .filter((family) => !isSql(family))
      .map((family) => ({ ...family, label: title(family.family) })),
  ].sort((a, b) => a.label.localeCompare(b.label));
  return rows.map((family) => ({
    id: family.family,
    family: family.label,
    covers: family.covers ?? "No description is published for this source yet.",
    freshness: freshnessSentence(family.freshness),
    state: familyState(family, connections),
  }));
}

/** Relation names as plain labels. */
export const relationLabel = (name: string) =>
  name.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());

export function relationRow(
  relation: DataAccessRelation,
): DataAccessRelationRow {
  return {
    id: `${relation.source}/${relation.name}`,
    name: relationLabel(relation.name),
    state: stateLabels[relation.state],
  };
}

/** How many of the shown sources are readable right now, for the page summary. */
export const availableCount = (rows: readonly DataAccessFamilyRow[]) =>
  rows.filter((row) => row.state.label === "Available").length;
