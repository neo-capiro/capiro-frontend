import type { IntentsItem, IntentsProposal } from "@capiro/meri-client/intents";
import type {
  IntentField,
  IntentRow,
  OfficeVersionTarget,
  Viewer,
} from "./intent-view-types";

export type OfficeEditProposal = Extract<
  IntentsProposal,
  { kind: "office_edit" }
>;
export type OfficeEditItem = Extract<
  IntentsItem,
  { kind: "office_edit"; proposal: unknown }
>;
/** Either the visible item or the withheld one. */
export type OfficeEditListItem = Extract<IntentsItem, { kind: "office_edit" }>;
export type OfficeEditResult = Exclude<OfficeEditItem["result"], "unavailable">;
export function isOfficeEditProposal(
  proposal: IntentsProposal,
): proposal is OfficeEditProposal {
  return "kind" in proposal && proposal.kind === "office_edit";
}
/** A proposal that can no longer be applied, or has been: nothing left to decide. */
export const officeEditSettled = (status: string) =>
  ["applied", "rejected", "conflict", "refused", "expired"].includes(status);

const formatLabels: Readonly<
  Record<OfficeEditProposal["document"]["format"], string>
> = {
  docx: "Word document",
  xlsx: "Excel workbook",
  pptx: "PowerPoint presentation",
};
const mimeTypes: Readonly<
  Record<OfficeEditProposal["document"]["format"], string>
> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
const kindLabels = {
  replace_text: "Replace text",
  insert_after: "Insert after",
  delete: "Remove",
} as const;

/** The unit Meri addressed, in words: a paragraph number, a cell on its sheet, or a shape on its slide. */
export function officeUnitLabel(unit: string): string {
  const paragraph = /^p:(\d+)$/.exec(unit);
  if (paragraph) return `paragraph ${paragraph[1]}`;
  const cell = /^(.+)!([A-Z]+\d+)$/.exec(unit);
  if (cell) return `cell ${cell[2]} on sheet ${cell[1]}`;
  const shape = /^slide:(\d+)\/shape:(.+)$/.exec(unit);
  if (shape) return `slide ${shape[1]}, shape ${shape[2]}`;
  return unit;
}

/** The document and every operation with its before/after, as the person must see it before applying. */
export function officeEditFields(
  proposal: OfficeEditProposal,
): readonly IntentField[] {
  const document = proposal.document;
  return [
    { label: "Document", value: document.filename },
    { label: "Kind", value: formatLabels[document.format] },
    { label: "Summary", value: proposal.summary },
    ...proposal.operations.flatMap((operation, index) => [
      {
        label: `Change ${index + 1}`,
        value: `${kindLabels[operation.kind]} · ${officeUnitLabel(operation.unit)}`,
      },
      {
        label: `Change ${index + 1} before`,
        value: operation.before ?? "(nothing: a new unit is inserted)",
      },
      {
        label: `Change ${index + 1} after`,
        value: operation.after ?? "(removed)",
      },
    ]),
    { label: "Expires", value: proposal.expiresAt },
  ];
}

/** Plain words for why a proposal was not applied. */
export function officeEditExplanation(
  status: OfficeEditResult["proposalStatus"],
): string {
  if (status === "conflict")
    return "The document changed since Meri read it: a newer version was saved. Nothing was changed; ask Meri again from the latest version.";
  if (status === "expired")
    return "This proposal expired before it was applied. Nothing was changed; ask Meri again from the latest version.";
  if (status === "refused")
    return "This proposal no longer matches the document Meri read, so it was not applied. Nothing was changed; ask Meri again from the latest version.";
  if (status === "rejected")
    return "You rejected this proposal. Nothing was changed.";
  if (status === "unknown")
    return "Whether this proposal was applied is not confirmed. Refresh to read the recorded result; it is never applied twice.";
  return "";
}

/** The version Meri published, in the shape the Office editor opens. */
function officeVersion(
  proposal: OfficeEditProposal,
  result: OfficeEditResult,
): OfficeVersionTarget | undefined {
  if (result.proposalStatus !== "applied" || result.version === null)
    return undefined;
  return {
    artifactId: result.version.artifactId,
    versionId: result.version.versionId,
    parentVersionId: result.version.parentVersionId,
    filename: result.version.filename,
    mimeType: mimeTypes[proposal.document.format],
    binding: proposal.binding,
    scopes: proposal.scopes,
    note: `New version of ${result.version.filename}, saved from Meri's edit`,
  };
}

/** An office proposal row: Apply is the person's decision; every other status is a reading of the artifact owner. */
export function officeEditRow(
  item: OfficeEditListItem,
  now: number,
  viewer: Viewer,
): IntentRow {
  const base = {
    deliveryId: item.deliveryId,
    createdAt: item.createdAt,
    title: "Edit the selected document",
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
      detail: "This document proposal is unavailable with your current access.",
    };
  const proposal = item.proposal,
    result = item.result;
  const row = {
    ...base,
    proposal,
    title: `Edit ${proposal.document.filename}`,
    fields: officeEditFields(proposal),
  };
  if (result === "unavailable")
    return {
      ...row,
      status: "Status unavailable",
      tone: "neutral",
      detail:
        "The recorded result could not be read. Refresh before deciding; nothing is applied twice.",
    };
  const status = result.proposalStatus;
  if (status === "applied")
    return {
      ...row,
      status: "Applied",
      tone: "success",
      detail:
        "A new version of the same document was saved from Meri's edit. Your manual content outside the changed units is unchanged.",
      result: [
        { label: "Saved as", value: result.version!.filename },
        { label: "Saved from", value: "Meri's edit, applied by you" },
      ],
      officeVersion: officeVersion(proposal, result),
    };
  if (status !== "proposed")
    return {
      ...row,
      status:
        status === "conflict"
          ? "Not applied: document changed"
          : status === "rejected"
            ? "Rejected"
            : status === "expired"
              ? "Expired"
              : status === "unknown"
                ? "Outcome unknown"
                : "Not applied",
      tone:
        status === "rejected"
          ? "neutral"
          : status === "unknown"
            ? "warning"
            : "danger",
      detail: officeEditExplanation(status),
    };
  const expired = Date.parse(proposal.expiresAt) <= now;
  if (expired)
    return {
      ...row,
      status: "Expired",
      tone: "neutral",
      detail: officeEditExplanation("expired"),
    };
  const approver = proposal.requiredApprover;
  if (
    approver.tenantId !== viewer.tenantId ||
    approver.actorId !== viewer.actorId
  )
    return {
      ...row,
      status: "Awaiting another approver",
      tone: "neutral",
      detail: "Only the person who asked Meri can apply this proposal.",
      decision: "held",
    };
  return {
    ...row,
    status: "Awaiting your decision",
    tone: "warning",
    detail:
      "Apply publishes a new version of this document with exactly these changes; everything else you wrote stays as it is. If a newer version is published first, Apply changes nothing and you can ask Meri again from that version.",
    decision: "approvable",
  };
}
