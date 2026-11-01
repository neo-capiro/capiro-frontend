import type {
  DataAccessFamily,
  DataAccessRelation,
} from "@capiro/meri-client/data-access";
import type { StatusTone } from "../../ui/StatusPill";

/** One read family as the page shows it; the state joins Meri's answer with the member's own connections. */
export type DataAccessFamilyRow = {
  id: string;
  family: string;
  covers: string;
  freshness: string;
  state: { label: string; tone: StatusTone };
  operations: string;
};

export type DataAccessRelationRow = {
  id: string;
  name: string;
  state: { label: string; tone: StatusTone };
};

/** The member's own provider connections, as Core reports them on the Connections page. */
export type ConnectionSummary = { provider: string; status: string };

const mailboxProviders = new Set(["microsoft_365", "google_workspace"]);
/** A connected mailbox provider is the only connection the mail family reads through. */
export const mailboxConnected = (
  connections: readonly ConnectionSummary[] | undefined,
) =>
  connections?.some(
    (connection) =>
      mailboxProviders.has(connection.provider) &&
      connection.status === "connected",
  ) === true;

const stateLabels: Record<
  DataAccessFamily["state"],
  { label: string; tone: StatusTone }
> = {
  available: { label: "Available", tone: "success" },
  policy_off: { label: "Off by policy", tone: "neutral" },
  client_required: { label: "Needs a selected client", tone: "neutral" },
  not_installed: { label: "Not installed", tone: "neutral" },
};

/**
 * Meri's state, except that an available family whose only path is a mailbox connection reads as
 * "connector not connected" until Core reports a connected mailbox for this account. Nothing here
 * grants a read: the gateway rechecks the connection on every call.
 */
export function familyState(
  family: Pick<DataAccessFamily, "state" | "requires">,
  connections: readonly ConnectionSummary[] | undefined,
): { label: string; tone: StatusTone } {
  if (
    family.state === "available" &&
    family.requires === "mailbox" &&
    !mailboxConnected(connections)
  )
    return { label: "Connector not connected", tone: "warning" };
  return stateLabels[family.state];
}

const title = (family: string) =>
  family.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase());

export function familyRow(
  family: DataAccessFamily,
  connections: readonly ConnectionSummary[] | undefined,
): DataAccessFamilyRow {
  return {
    id: family.family,
    family: title(family.family),
    covers:
      family.covers ??
      "No model-facing description is published for this family.",
    freshness:
      family.freshness ??
      "No freshness or version field is declared for this family.",
    state: familyState(family, connections),
    operations: family.operations.join(", "),
  };
}

export function relationRow(
  relation: DataAccessRelation,
): DataAccessRelationRow {
  return {
    id: `${relation.source}/${relation.name}`,
    name: relation.name,
    state: stateLabels[relation.state],
  };
}

/** How many families a run for this member would list right now, for the page summary. */
export function availableCount(
  families: readonly DataAccessFamily[],
  connections: readonly ConnectionSummary[] | undefined,
) {
  return families.filter(
    (family) => familyState(family, connections).label === "Available",
  ).length;
}
