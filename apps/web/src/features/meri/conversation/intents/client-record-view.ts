import type { IntentsItem, IntentsProposal } from "@capiro/meri-client/intents";
import type { IntentField, IntentRow, Viewer } from "./intent-view-types";

type ClientRecordProposal = Extract<
  IntentsProposal,
  { kind: "client_record_action" }
>;

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
  if (result === "unavailable")
    return {
      ...row,
      status: "Status unavailable",
      tone: "warning",
      detail: "Refresh to read the recorded outcome. No action is repeated.",
    };
  if (result.status === "succeeded" && result.receipt) {
    const receipt = result.receipt;
    if (receipt.outcome === "created")
      return {
        ...row,
        status: "Client created",
        tone: "success",
        detail:
          "The client owner confirmed creation. Background enrichment completion is not confirmed by this receipt.",
        result: fields(
          { client: receipt.client, ldaMatch: receipt.ldaMatch },
          "",
        ),
      };
    return {
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
    };
  }
  if (result.status === "proposed") {
    const own =
        proposal.binding.tenantId === viewer.tenantId &&
        proposal.binding.actorId === viewer.actorId,
      expired = Date.parse(proposal.expiresAt) <= now;
    return {
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
    };
  }
  if (["outcome_unknown", "failed_retryable"].includes(result.status))
    return {
      ...row,
      status: "Result uncertain",
      tone: "warning",
      detail:
        "No confirmed outcome is available. Read the recorded status; this action will not be sent again.",
    };
  return {
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
  };
}
