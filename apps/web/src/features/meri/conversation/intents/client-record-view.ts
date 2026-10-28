import type { IntentsItem, IntentsProposal } from "@capiro/meri-client/intents";
import type { IntentField, IntentRow, Viewer } from "./intent-view-types";

type ClientRecordProposal = Extract<
  IntentsProposal,
  { kind: "client_record_action" }
>;
/**
 * The admitted item's owner answer exactly as the public binding declares it: one bounded nullable
 * preflight reading, or the string the receiving layer uses when no answer could be read.
 */
type ClientRecordResult = Extract<
  IntentsItem,
  { kind: "client_record_action"; proposal: unknown }
>["result"];

export function isClientRecordProposal(
  proposal: IntentsProposal,
): proposal is ClientRecordProposal {
  return "kind" in proposal && proposal.kind === "client_record_action";
}
export const clientRecordSettled = (status: string) =>
  ["succeeded", "dismissed", "expired", "failed_terminal", "blocked"].includes(
    status,
  );
const label = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (value) => value.toUpperCase());
/**
 * The owner's bounded duplicate/capacity reading is review evidence only. The public binding
 * declares exactly one bounded nullable preflight on the live answer, so it is read directly
 * through that declared type: no structural probe, no cast, no second validator. Applying still
 * rechecks duplicate, capacity, schema and identity atomically: the reading reserves nothing, and
 * Core never consults a stored preflight when it applies.
 */
const preflightMeanings = {
  review:
    "Informational only — not a reservation, an approval or a promise that the action will be accepted. The owner rechecks duplicate, capacity, schema and identity when it applies, so this reading can change.",
  uncertain:
    "Informational only — not a reservation. The outcome is not confirmed; refresh reads the recorded status without repeating the action.",
  settled:
    "Informational only — this action already has a recorded outcome. This reading reserved nothing and implies no change.",
} as const;
type PreflightPhase = keyof typeof preflightMeanings;
/**
 * Two bounded enums only, so no matching client id, name, count or URL can travel. `possible`
 * is an existence signal, not a visible match: the owner's probe is tenant-scoped, so it can be
 * true for a record this viewer cannot see. `clear` and `allowed` mirror the apply-time rules
 * but do not model every apply guard, so neither promises that the action will be accepted.
 */
const duplicateReadings: Readonly<Record<string, string>> = {
  clear:
    "Clear in this answer — the owner's bounded duplicate check reported nothing",
  possible:
    "Possible in this answer — the owner's bounded check found something that may duplicate this name, which can be a record you cannot see",
  unknown:
    "Unknown in this answer — the owner could not complete the duplicate check",
};
const capacityReadings: Readonly<Record<string, string>> = {
  allowed:
    "Allowed in this answer — the owner's current capacity rule reported room",
  denied:
    "Denied in this answer — the owner's current capacity rule is at its limit",
  unknown:
    "Unknown in this answer — the owner could not complete the capacity check",
};
/**
 * Only the two bounded verdicts are ever read, so any other value renders this one fixed sentence:
 * it repeats nothing the owner sent and implies nothing about duplicates or capacity.
 */
const unboundedReading =
  "An unbounded value from the owner; nothing is implied about duplicates or capacity.";
/** Never names a matching client, count or detail: only the two bounded verdicts are read. */
function preflightFields(
  result: ClientRecordResult,
  phase: PreflightPhase,
  operation: ClientRecordProposal["operation"],
): readonly IntentField[] {
  if (result === "unavailable")
    return [
      {
        label: "Preflight check",
        value:
          "Unavailable with this response. Refresh to read the owner's current answer; no preflight is a reservation.",
      },
    ];
  // The binding declares this field, so it is read directly — never structurally and never cast.
  const preflight = result.preflight;
  if (preflight === null)
    return [
      {
        label: "Preflight check",
        value:
          operation === "create_client"
            ? "The owner recorded no current duplicate or capacity reading for this request, so nothing is implied about either."
            : "Not applicable to this action: the owner checks duplicates and capacity when it creates a client, not when it updates one.",
      },
    ];
  // A value no canonical receiver admits (only reachable by projecting a refused shape directly)
  // renders one fixed sentence: the value itself is never repeated.
  if (typeof preflight !== "object")
    return [{ label: "Preflight check", value: unboundedReading }];
  return [
    {
      label: "Preflight duplicate",
      value: duplicateReadings[preflight.duplicate] ?? unboundedReading,
    },
    {
      label: "Preflight capacity",
      value: capacityReadings[preflight.capacity] ?? unboundedReading,
    },
    { label: "Preflight meaning", value: preflightMeanings[phase] },
  ];
}
/** Exact reviewed values, including replacement lists and child rows. No summary hides a field. */
function fields(value: unknown, prefix: string, empty = "None"): IntentField[] {
  if (Array.isArray(value))
    return value.length
      ? value.flatMap((item, index) =>
          fields(item, `${prefix} ${index + 1}`, empty),
        )
      : [{ label: prefix, value: empty }];
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key, item]) =>
      fields(item, `${prefix}${prefix ? " · " : ""}${label(key)}`, empty),
    );
  return [{ label: prefix, value: value === null ? "None" : String(value) }];
}
export function clientRecordFields(
  proposal: ClientRecordProposal,
): readonly IntentField[] {
  return [
    {
      label: "Action",
      value:
        proposal.operation === "create_client"
          ? "Create client"
          : "Update client profile",
    },
    ...fields(proposal.request.input, "", "Replace with an empty list"),
    ...(proposal.operation === "update_client_profile"
      ? [
          {
            label: "Update behavior",
            value:
              "Approved scalar and list fields replace current values without a version condition. Child records use the profile owner's existing merge rules.",
          },
        ]
      : []),
    { label: "Expires", value: proposal.expiresAt },
  ];
}
export function clientRecordRow(
  item: Extract<IntentsItem, { kind: "client_record_action" }>,
  now: number,
  viewer: Viewer,
): IntentRow {
  const base = {
    deliveryId: item.deliveryId,
    createdAt: item.createdAt,
    title: "Client record",
    proposal: null,
    fields: [],
    result: [],
    decision: "closed" as const,
  };
  if ("withheld" in item)
    return {
      ...base,
      status: "Unavailable",
      tone: "neutral",
      detail: "This action is unavailable with your current access.",
    };
  const proposal = item.proposal,
    result = item.result;
  const row = {
    ...base,
    proposal,
    title:
      proposal.operation === "create_client"
        ? "Create client"
        : "Update client profile",
    fields: clientRecordFields(proposal),
  };
  const withPreflight = (row: IntentRow, phase: PreflightPhase): IntentRow => ({
    ...row,
    fields: [
      ...row.fields,
      ...preflightFields(result, phase, proposal.operation),
    ],
  });
  if (result === "unavailable")
    return withPreflight(
      {
        ...row,
        status: "Status unavailable",
        tone: "warning",
        detail: "Refresh to read the recorded outcome. No action is repeated.",
      },
      "uncertain",
    );
  if (result.status === "succeeded" && result.receipt) {
    const receipt = result.receipt;
    if (receipt.outcome === "created")
      return withPreflight(
        {
          ...row,
          status: "Client created",
          tone: "success",
          detail:
            "The client owner confirmed creation. Background enrichment completion is not confirmed by this receipt.",
          result: fields(
            { client: receipt.client, ldaMatch: receipt.ldaMatch },
            "",
          ),
        },
        "settled",
      );
    return withPreflight(
      {
        ...row,
        status: {
          updated: "Profile updated",
          partially_updated: "Partially updated",
          not_updated: "No changes confirmed",
          unchanged: "Already present",
        }[receipt.outcome],
        tone: receipt.rowErrors.length ? "warning" : "success",
        detail:
          "The profile owner returned these exact field and row outcomes. The update is not an atomic version-checked change.",
        result: fields(
          {
            clientId: receipt.clientId,
            fieldsWritten: receipt.fieldsWritten,
            facilitiesCreated: receipt.facilitiesCreated,
            capabilitiesCreated: receipt.capabilitiesCreated,
            peopleCreated: receipt.peopleCreated,
            peopleUpdated: receipt.peopleUpdated,
            skipped: receipt.skipped,
            rowErrors: receipt.rowErrors,
          },
          "",
        ),
      },
      "settled",
    );
  }
  if (result.status === "proposed") {
    const own =
        proposal.binding.tenantId === viewer.tenantId &&
        proposal.binding.actorId === viewer.actorId,
      expired = Date.parse(proposal.expiresAt) <= now;
    return withPreflight(
      {
        ...row,
        decision: own && !expired ? "approvable" : "closed",
        status: expired
          ? "Expired"
          : own
            ? "Awaiting your confirmation"
            : "Needs the original approver",
        tone: "neutral",
        detail: expired
          ? "Refresh to read any recorded outcome."
          : "Review every retained field before confirming. Nothing changes until you approve.",
      },
      expired ? "settled" : "review",
    );
  }
  if (["outcome_unknown", "failed_retryable"].includes(result.status))
    return withPreflight(
      {
        ...row,
        status: "Result uncertain",
        tone: "warning",
        detail:
          "No confirmed outcome is available. Read the recorded status; this action will not be sent again.",
      },
      "uncertain",
    );
  return withPreflight(
    {
      ...row,
      status:
        result.status === "dismissed"
          ? "Rejected"
          : result.status.replaceAll("_", " "),
      tone: ["failed_terminal", "blocked"].includes(result.status)
        ? "danger"
        : "neutral",
      detail:
        "This is the action owner's recorded status. Refresh reads it without repeating the action.",
    },
    "settled",
  );
}
