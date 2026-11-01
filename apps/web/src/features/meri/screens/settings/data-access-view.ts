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

/** Plain names for the sources; a source without one is named from its identifier in words. */
export const familyLabels: Readonly<Record<string, string>> = {
  "acquisition-personnel": "Acquisition personnel",
  "action-items-complete": "Action items",
  "bill-text": "Bill text",
  "business-development": "Business development",
  "buyer-workspace": "Buyer workspace",
  "capiro-data": "Capiro data (SQL)",
  "certification-status": "Certification status",
  "client-documents": "Client documents",
  "client-knowledge-attachments": "Client attachments",
  "client-knowledge-memory": "Client memory",
  "client-knowledge-monday": "Client Monday boards",
  "client-knowledge-profile": "Client profiles",
  "client-knowledge-search": "Client knowledge search",
  "client-registry": "Client registry",
  "connected-apps": "Connected apps",
  "data-search": "Data search",
  "dataset-metadata": "Dataset descriptions",
  disclosures: "Lobbying disclosures",
  "district-nexus": "District nexus",
  "entity-candidates": "Entity matches",
  "facility-representation": "Facility representation",
  "federal-draft-source": "Federal drafting sources",
  "federal-legislation": "Federal legislation",
  "federal-market": "Federal market",
  "florida-budget": "Florida budget",
  "funding-analysis": "Funding analysis",
  "funding-opportunities": "Funding opportunities",
  "graph-paths": "Relationship paths",
  "intelligence-summary": "Intelligence summaries",
  "legislative-comparisons": "Legislative comparisons",
  "legislative-directory": "Legislative directory",
  "legiwatch-relevance": "LegiWatch relevance",
  "legiwatch-review": "LegiWatch review",
  mail: "Mail",
  "meeting-source": "Meetings",
  "memory-proposals": "Memory proposals",
  "operational-reads": "Operational records",
  "outreach-query": "Outreach",
  "pe-references": "Program element references",
  "program-elements": "Program elements",
  "public-data": "Public data",
  "public-domain-hearings": "Hearings",
  "public-domain-query": "Public datasets",
  "public-reports": "Public reports",
  "public-web": "Public web",
  "regulatory-dockets": "Regulatory dockets",
  "research-legal-candidates": "Legal research candidates",
  "research-legal-legislation": "Legal and legislative research",
  "research-legal-news": "Legal news",
  "research-portfolio": "Research portfolios",
  "research-portfolio-evidence": "Research portfolio evidence",
  "research-portfolio-sharing": "Research portfolio sharing",
  "research-portfolio-workflow": "Research portfolio workflow",
  "rule-status": "Rule status",
  "sam-opportunities": "SAM.gov opportunities",
  "saved-records": "Saved records",
  "state-legislation": "State legislation",
  "state-status-votes": "State status and votes",
  "stored-intelligence": "Stored intelligence",
  "strategy-saved-records": "Strategy and Planner records",
  "teams-channels": "Teams channels",
  "tenant-contacts": "Contacts",
  "tracked-bills": "Tracked bills",
  "watch-state": "Watch state",
};
const title = (id: string) =>
  familyLabels[id] ??
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
    ...(sql[0] ? [{ ...sql[0], family: "capiro-data" }] : []),
    ...installed.filter((family) => !isSql(family)),
  ]
    .map((family) => ({ ...family, label: title(family.family) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return rows.map((family) => ({
    id: family.family,
    family: family.label,
    covers: family.covers ?? "No description is published for this source yet.",
    state: familyState(family, connections),
  }));
}

/** Data table names as plain labels. */
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
