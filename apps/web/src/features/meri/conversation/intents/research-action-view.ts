import type {
  IntentsItem,
  IntentsProposal,
  IntentsResearchActionProposal,
} from "@capiro/meri-client/intents";
import type { IntentField, IntentRow, Viewer } from "./intent-view-types";

type ResearchActionItem = Extract<IntentsItem, { kind: "research_action" }>;
type Decided = Exclude<
  Extract<ResearchActionItem, { proposal: unknown }>["result"],
  "unavailable"
>;

export function isResearchActionProposal(
  proposal: IntentsProposal,
): proposal is IntentsResearchActionProposal {
  return "kind" in proposal && proposal.kind === "research_action";
}

/** Core's terminal proposal statuses; everything else may still change without a new request. */
export function researchActionSettled(status: string) {
  return [
    "succeeded",
    "dismissed",
    "expired",
    "failed_terminal",
    "blocked",
  ].includes(status);
}

const operationLabels = {
  manage_research_portfolio: "Research Portfolio management action",
  create_research_portfolio_snapshot: "Research Portfolio snapshot",
  request_research_portfolio_output: "Research Portfolio CSV output",
  save_research_portfolio_output_to_client:
    "Save a Research Portfolio output to Client Files",
  watch_research_portfolio: "Research Portfolio watch",
  update_research_portfolio_change_state: "Research Portfolio change state",
  create_research_portfolio_bookmark: "Research Portfolio bookmark",
  add_research_portfolio_review_note: "Research Portfolio review note",
  prepare_research_portfolio_brief: "Research Portfolio brief draft",
  prepare_research_portfolio_meeting: "Research Portfolio meeting draft",
} satisfies Record<IntentsResearchActionProposal["operation"], string>;

const cap = (value: string, length = 400) =>
  value.length > length ? `${value.slice(0, length)}…` : value;
const plain = (value: unknown): string =>
  typeof value === "string"
    ? cap(value)
    : typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : value === null || value === undefined
        ? "None"
        : cap(JSON.stringify(value));
const humanize = (key: string) =>
  key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
/** Keys Meri derives or Core owns; they are never a person's decision input. */
const DERIVED = new Set([
  "conversationId",
  "operationKey",
  "idempotencyKey",
  "confirmed",
]);

/** The exact retained request, as the person must see it before deciding: nothing summarized away. */
export function researchActionFields(
  proposal: IntentsResearchActionProposal,
): readonly IntentField[] {
  const request: object = proposal.request;
  const fields: IntentField[] = [
    { label: "Action", value: proposal.preview.label },
    { label: "Operation", value: operationLabels[proposal.operation] },
    ...(proposal.preview.clientName
      ? [{ label: "Prepared for", value: proposal.preview.clientName }]
      : []),
    ...(proposal.preview.portfolioId
      ? [{ label: "Research Portfolio", value: proposal.preview.portfolioId }]
      : []),
  ];
  for (const [key, value] of Object.entries(request)) {
    if (DERIVED.has(key)) continue;
    if (key === "parameters" && value && typeof value === "object") {
      const parameters = Object.entries(
        value as Record<string, unknown>,
      ).filter(([name]) => !DERIVED.has(name));
      fields.push({
        label: "Parameters",
        value: parameters.length ? String(parameters.length) : "None",
      });
      for (const [name, parameter] of parameters)
        fields.push({
          label: `Parameter ${humanize(name)}`,
          value: plain(parameter),
        });
      continue;
    }
    fields.push({ label: humanize(key), value: plain(value) });
  }
  fields.push(
    {
      label: "Scope",
      value: proposal.scopes
        .map((s) =>
          s.kind === "private-user"
            ? "Private to the current actor"
            : `${s.kind} ${s.resourceId}`,
        )
        .join("; "),
    },
    { label: "Expires", value: proposal.expiresAt },
    { label: "Command hash", value: proposal.commandSha256 },
  );
  return fields;
}

/** Core's bounded receipt facts after a confirmed effect; identifiers only, never file bytes or addresses. */
export function researchActionResultFields(
  result: Decided,
): readonly IntentField[] {
  const summary = result.resultSummary;
  if (!summary) return [];
  const fields: IntentField[] = [];
  for (const [key, value] of Object.entries(summary)) {
    if (key === "client" && value && typeof value === "object") {
      const client = value as { id?: string; name?: string };
      if (client.name) fields.push({ label: "Client", value: client.name });
      else if (client.id) fields.push({ label: "Client", value: client.id });
      continue;
    }
    if (key === "ok" || value === null || value === undefined) continue;
    fields.push({ label: humanize(key), value: plain(value) });
  }
  return fields;
}

type RowView = Pick<IntentRow, "status" | "tone" | "detail">;
const settledViews = {
  succeeded: {
    status: "Action completed",
    tone: "success",
    detail:
      "Core applied this action once and recorded its receipt. A draft or output is not sent anywhere by this confirmation.",
  },
  dismissed: {
    status: "Rejected",
    tone: "neutral",
    detail: "This proposal was rejected. The action was not executed.",
  },
} satisfies Record<string, RowView>;
const uncertainView: RowView = {
  status: "Result uncertain",
  tone: "warning",
  detail:
    "No outcome is confirmed. Check the recorded status; this action will not be sent again.",
};
function proposedView(
  proposal: IntentsResearchActionProposal,
  now: number,
  viewer: Viewer,
): RowView & { decision: IntentRow["decision"] } {
  const own =
    proposal.binding.tenantId === viewer.tenantId &&
    proposal.binding.actorId === viewer.actorId;
  const expired = Date.parse(proposal.expiresAt) <= now;
  return {
    decision: own && !expired ? "approvable" : "closed",
    status: expired
      ? "Expired"
      : own
        ? "Awaiting your confirmation"
        : "Needs the original approver",
    tone: "neutral",
    detail: expired
      ? "Refresh to read any recorded outcome."
      : "Review this exact Research Portfolio action before confirming it. Nothing changes until you approve, and Core checks your current access again then.",
  };
}

export function researchActionRow(
  item: ResearchActionItem,
  now: number,
  viewer: Viewer,
): IntentRow {
  const base = {
    deliveryId: item.deliveryId,
    createdAt: item.createdAt,
    title: "Research Portfolio action",
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
  const { proposal, result } = item;
  const row = {
    ...base,
    title: proposal.preview.label,
    proposal,
    fields: researchActionFields(proposal),
  };
  if (result === "unavailable")
    return {
      ...row,
      status: "Status unavailable",
      tone: "warning",
      detail:
        "The current outcome could not be read. Refresh checks Core without repeating the action.",
    };
  const status = result.proposalStatus;
  if (status === "proposed")
    return { ...row, ...proposedView(proposal, now, viewer) };
  if (status === "succeeded")
    return {
      ...row,
      ...settledViews.succeeded,
      result: researchActionResultFields(result),
      ...([
        "prepare_research_portfolio_brief",
        "prepare_research_portfolio_meeting",
      ].includes(proposal.operation) &&
      typeof result.resultSummary?.artifactId === "string" &&
      proposal.preview.portfolioId
        ? {
            researchDraft: {
              artifactId: result.resultSummary.artifactId,
              portfolioId: proposal.preview.portfolioId,
            },
          }
        : {}),
    };
  if (status === "dismissed") return { ...row, ...settledViews.dismissed };
  if (["outcome_unknown", "failed_retryable", "executing"].includes(status))
    return { ...row, ...uncertainView };
  return {
    ...row,
    status: status.replaceAll("_", " "),
    tone: ["failed_terminal", "blocked"].includes(status)
      ? "danger"
      : "neutral",
    detail:
      "This is the action owner's recorded status. No effect is confirmed; refresh reads without repeating the action.",
  };
}
