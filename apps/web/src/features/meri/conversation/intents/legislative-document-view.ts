import type { IntentsItem, IntentsProposal } from "@capiro/meri-client/intents";
import type { IntentField, IntentRow, Viewer } from "./intent-view-types";

type LegislativeDocumentProposal = Extract<
  IntentsProposal,
  { kind: "legislative_document_action" }
>;
export function isLegislativeDocumentProposal(
  proposal: IntentsProposal,
): proposal is LegislativeDocumentProposal {
  return "kind" in proposal && proposal.kind === "legislative_document_action";
}
export const legislativeDocumentSettled = (status: string) =>
  ["succeeded", "dismissed", "expired", "failed_terminal", "blocked"].includes(
    status,
  );

/** Preserve the retained evidence and exact text; model text never becomes HTML or a new source card. */
export function legislativeDocumentFields(
  proposal: LegislativeDocumentProposal,
): readonly IntentField[] {
  const request = proposal.request;
  return [
    {
      label: "Action",
      value:
        proposal.operation === "prepare_legiwatch_briefing"
          ? "Prepare LegiWatch briefing draft"
          : "Save legislative research draft",
    },
    { label: "Title", value: request.title },
    { label: "Client", value: request.clientId ?? "General" },
    ...(request.folderId ? [{ label: "Folder", value: request.folderId }] : []),
    ...(request.jurisdiction
      ? [{ label: "Jurisdiction", value: request.jurisdiction }]
      : []),
    ...(request.sessionKey
      ? [{ label: "Session", value: request.sessionKey }]
      : []),
    { label: "Analysis", value: request.analysis },
    ...("template" in request
      ? [
          { label: "Template", value: request.template.replaceAll("_", " ") },
          { label: "Cutoff", value: request.cutoff },
          { label: "Time zone", value: request.timezone },
          ...request.sources.map((source, i) => ({
            label: `Source ${i + 1}`,
            value: `${source.kind} · ${source.id} · revision ${source.revision}`,
          })),
        ]
      : [
          ...(request.allowCrossBill !== undefined
            ? [
                {
                  label: "Allow cross-bill research",
                  value: String(request.allowCrossBill),
                },
              ]
            : []),
          ...(request.rightSessionKey
            ? [{ label: "Comparison session", value: request.rightSessionKey }]
            : []),
          ...request.documents.map((document, i) => ({
            label: `Source document ${i + 1}`,
            value: `${document.id} · revision ${document.revision}${document.sessionKey ? ` · session ${document.sessionKey}` : ""}`,
          })),
        ]),
    ...request.citations.flatMap((citation, i) => [
      {
        label: `Citation ${i + 1} source`,
        value: `${"kind" in citation ? `${citation.kind} · ${citation.id}` : citation.documentId} · revision ${citation.revision}`,
      },
      { label: `Citation ${i + 1} locator`, value: citation.locator },
      {
        label: `Citation ${i + 1} offsets (UTF-16)`,
        value: `${citation.start}–${citation.end}`,
      },
      { label: `Citation ${i + 1} quote`, value: citation.quote },
    ]),
    { label: "Expires", value: proposal.expiresAt },
  ];
}

/** A saved selection has no completed document; unknown outcomes stay read-only. */
export function legislativeDocumentRow(
  item: Extract<IntentsItem, { kind: "legislative_document_action" }>,
  now: number,
  viewer: Viewer,
): IntentRow {
  const base = {
    deliveryId: item.deliveryId,
    createdAt: item.createdAt,
    title: "Legislative document",
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
      proposal.operation === "prepare_legiwatch_briefing"
        ? "LegiWatch briefing draft"
        : "Legislative research draft",
    fields: legislativeDocumentFields(proposal),
  };
  if (result === "unavailable")
    return {
      ...row,
      status: "Status unavailable",
      tone: "warning",
      detail: "Refresh to read the recorded outcome. No action is repeated.",
    };
  if (result.status === "succeeded" && result.receipt) {
    const receipt = result.receipt,
      complete = receipt.state === "complete";
    return {
      ...row,
      status: complete ? "Document draft saved" : "Selection saved",
      tone: complete ? "success" : "warning",
      detail: complete
        ? "The document owner confirmed an editable draft. Nothing was published or sent."
        : "The source selection was saved. No completed document was returned; do not repeat the save to recover it.",
      result: [
        { label: "Recorded effect", value: receipt.state.replaceAll("_", " ") },
        ...(receipt.selectionId
          ? [{ label: "Saved selection", value: receipt.selectionId }]
          : []),
        ...(complete && receipt.documentId && receipt.location
          ? [
              { label: "Document reference", value: receipt.documentId },
              { label: "Recorded location", value: receipt.location },
            ]
          : []),
        { label: "Existing result reused", value: String(receipt.reused) },
      ],
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
        : "Review the exact text, source revisions and citations before confirming this draft save.",
    };
  }
  if (["outcome_unknown", "failed_retryable"].includes(result.status))
    return {
      ...row,
      status: "Result uncertain",
      tone: "warning",
      detail:
        "No completed effect is confirmed. Check the recorded status; this save will not be sent again.",
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
      "This is the document action owner's recorded status. Refresh reads it without repeating the save.",
  };
}
