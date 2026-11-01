import type { IntentsInboxRow } from "@capiro/meri-client/intents";
import {
  conversationHref,
  conversationLabel,
} from "../../../shared/meri-conversations/conversation-navigation";
import type { StatusTone } from "../ui/StatusPill";

/** One inbox row as the page shows it: labels only, the link leads to the conversation that decides. */
export type InboxRowView = {
  id: string;
  proposal: string;
  client: string;
  conversation: { label: string; href: string };
  created: string;
  expires: string;
  state: { label: string; tone: StatusTone };
  pending: boolean;
};

export type InboxContext = {
  /** Visible clients, for names; an unknown or withheld client is named by its absence, never guessed. */
  clients?: readonly { id: string; name: string }[] | undefined;
  /** Owned conversation titles the shell already reads; a missing title falls back to the creation receipt. */
  titles?:
    | readonly { conversationId: string; title: string; status: string }[]
    | undefined;
  now: number;
};

const operationLabels: Readonly<Record<string, string>> = {
  create_task: "Create a task",
  update_task: "Update a task",
  create_word: "Prepare a document",
  create_excel: "Prepare a spreadsheet",
  create_powerpoint: "Prepare a presentation",
  request_document: "Prepare a document",
  save_memory: "Save to memory",
  save_chat_attachments: "File chat attachments",
  send_mail: "Send an email",
  browser_action: "Browser action",
  watch_action: "Watch change",
  apply_legiwatch_suggestion: "Apply LegiWatch suggestion",
  save_legiwatch_relevance: "Save LegiWatch relevance",
  create_client: "Create a client",
  update_client_profile: "Update a client profile",
  save_business_development_brief: "Save a business development brief",
  prepare_legiwatch_briefing: "Prepare a LegiWatch briefing",
  save_legislative_research: "Save legislative research",
  publish_research_portfolio_share_link: "Publish a research share link",
  revoke_research_portfolio_share_link: "Revoke a research share link",
};
const kindLabels: Readonly<Record<IntentsInboxRow["kind"], string>> = {
  proposal: "Proposal",
  browser_action: "Browser action",
  watch_action: "Watch change",
  legiwatch_action: "LegiWatch suggestion",
  client_record_action: "Client record",
  bizdev_action: "Business development brief",
  legislative_document_action: "Legislative document",
  research_action: "Research action",
  research_share: "Research share link",
};
const humanize = (id: string) =>
  id.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());

/** The proposal column: the operation the person would approve, in the conversation list's words. */
export function proposalLabel(row: IntentsInboxRow) {
  return (
    operationLabels[row.operation.id] ??
    (row.kind === "proposal"
      ? humanize(row.operation.id)
      : kindLabels[row.kind])
  );
}

/** Phases are the server's reading of the decision and execution owners; only a live awaiting phase is pending. */
export function phaseView(
  row: IntentsInboxRow,
  now: number,
): { label: string; tone: StatusTone; pending: boolean } {
  if (row.withheld)
    return {
      label: "Withheld",
      tone: "neutral",
      pending: false,
    };
  switch (row.phase) {
    case "awaiting_approval":
      return Date.parse(row.expiresAt) <= now
        ? { label: "Expired", tone: "neutral", pending: false }
        : { label: "Awaiting your decision", tone: "warning", pending: true };
    case "approved":
      return {
        label: "Approved · awaiting execution",
        tone: "neutral",
        pending: false,
      };
    case "rejected":
      return { label: "Rejected", tone: "neutral", pending: false };
    case "expired":
      return { label: "Expired", tone: "neutral", pending: false };
    case "executing":
      return { label: "Executing", tone: "neutral", pending: false };
    case "completed":
      return { label: "Completed", tone: "success", pending: false };
    case "unknown":
      return { label: "Result uncertain", tone: "warning", pending: false };
    case "unknown_decision":
      return {
        label: "Decision unavailable",
        tone: "warning",
        pending: false,
      };
  }
}

const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";

export function inboxRowView(
  row: IntentsInboxRow,
  context: InboxContext,
): InboxRowView {
  const clientId = row.withheld ? null : row.clientId;
  const client = row.withheld
    ? "No longer visible"
    : clientId === null
      ? "General"
      : (context.clients?.find((item) => item.id === clientId)?.name ??
        "Client not in your current list");
  const title = context.titles?.find(
    (item) =>
      item.conversationId === row.conversationId && item.status === "active",
  )?.title;
  const state = phaseView(row, context.now);
  return {
    id: `${row.conversationId}/${row.deliveryId}`,
    proposal: proposalLabel(row),
    client,
    conversation: {
      label: title ?? conversationLabel(row.createdAt),
      href: conversationHref(clientId, row.conversationId),
    },
    created: stamp(row.createdAt),
    expires: row.withheld ? "Withheld" : stamp(row.expiresAt),
    state: { label: state.label, tone: state.tone },
    pending: state.pending,
  };
}
