import type {
  IntentsItem,
  IntentsProposal,
  IntentsExecutionOutcome,
  IntentsNativeMailOutcome,
  Canonical_MailSendApprovalProposalC6Ab2C41,
  IntentsMailSendResult,
} from "@capiro/meri-client/intents";
import type { IntentField, IntentRow, Viewer } from "./intent-view-types";

const modeLabels: Readonly<Record<string, string>> = {
  send: "Send a new message",
  reply: "Reply to the original message",
  reply_all: "Reply to everyone on the original message",
  forward: "Forward the original message",
};

/** A provider is named for people; its raw provider identifier is never the UI authority. */
const providerLabels: Readonly<Record<string, string>> = {
  gmail: "Gmail",
  microsoft_graph: "Microsoft 365",
};

type MailArguments =
  Canonical_MailSendApprovalProposalC6Ab2C41["command"]["arguments"];
type MailFile = Readonly<{
  attachmentId: string;
  fileName: string;
  contentType: string;
  bytes: number;
  sha256: string;
}>;
type AcceptedMailResult = Extract<IntentsMailSendResult, { state: "accepted" }>;

/** A canonical native mail proposal; the browser never treats its command as authority. */
export function isMailSendProposal(
  proposal: IntentsProposal,
): proposal is Canonical_MailSendApprovalProposalC6Ab2C41 {
  return "command" in proposal && proposal.command.action === "mail.send";
}

/**
 * Only the owner's exact native-mail accepted or failed outcome settles a saved mail decision.
 * An absent, unreadable or mismatched outcome stays uncertain and is never acknowledged here.
 */
export function mailOutcomeSettled(outcome: IntentsExecutionOutcome): boolean {
  if (!isNativeMailOutcome(outcome)) return false;
  const result = outcome.result;
  return result.state === "accepted" || result.state === "failed";
}

/** Narrow the complete public outcome, including legacy artifacts without an execution kind. */
export function isNativeMailOutcome(
  outcome: IntentsExecutionOutcome,
): outcome is IntentsNativeMailOutcome {
  return (
    "result" in outcome &&
    "execution" in outcome &&
    "kind" in outcome.execution &&
    outcome.execution.kind === "native-mail"
  );
}

const addressList = (value: readonly string[] | undefined) =>
  value && value.length > 0 ? value.join(", ") : "None";

/**
 * Display-only plain-text projection. The card renders a field value as text, so the retained
 * message is shown readably and is never injected as markup.
 */
const bodyText = (html: string) =>
  html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** The original operation's exact message and revision, only where the command carries it. */
const originalFields = (args: MailArguments): readonly IntentField[] => {
  if (args.mode === "send" || args.original === null) return [];
  return [
    { label: "Original thread", value: args.original.threadId },
    { label: "Original message", value: args.original.messageId },
    { label: "Original revision", value: args.original.updatedAt },
    ...(args.original.bodySha256 === null
      ? []
      : [{ label: "Original body hash", value: args.original.bodySha256 }]),
  ];
};

/** The retained command as the person must see it before deciding: nothing summarized away. */
export function mailFields(
  proposal: Canonical_MailSendApprovalProposalC6Ab2C41,
): readonly IntentField[] {
  const args = proposal.command.arguments;
  const files: readonly MailFile[] = args.files;
  const body = bodyText(args.bodyHtml);
  return [
    { label: "Action", value: "Send an email" },
    { label: "Mode", value: modeLabels[args.mode] ?? args.mode },
    { label: "From", value: args.senderEmail },
    { label: "To", value: addressList(args.to) },
    { label: "Cc", value: addressList(args.cc) },
    { label: "Bcc", value: addressList(args.bcc) },
    { label: "Subject", value: args.subject },
    { label: "Message", value: body === "" ? "None" : body },
    ...originalFields(args),
    ...(files.length === 0
      ? []
      : [
          {
            label: "Attachments",
            value: files
              .map((file) => `${file.fileName} (${file.bytes} bytes)`)
              .join(", "),
          },
        ]),
    ...(proposal.command.scopes.length === 0
      ? []
      : [
          {
            label: "Scope",
            value: proposal.command.scopes
              .map((scope) => `${scope.kind} ${scope.resourceId}`)
              .join("; "),
          },
        ]),
    { label: "Expires", value: proposal.expiresAt },
    { label: "Command hash", value: proposal.commandSha256 },
  ];
}

const acceptedDetail = (result: AcceptedMailResult) => {
  const provider = providerLabels[result.provider] ?? result.provider;
  const confirmation =
    result.mailboxConfirmation === "confirmed"
      ? "The provider also confirmed the message reached the mailbox."
      : result.mailboxConfirmation === "pending"
        ? "The provider has not yet confirmed the message reached the mailbox."
        : "Mailbox confirmation was not requested.";
  return `${provider} accepted this message from ${result.senderEmail}. Provider acceptance is not proof of delivery to recipients. ${confirmation}`;
};

const failedDetail =
  "The provider did not accept this message. It was not sent. This request cannot be retried automatically.";

const unknownDetail =
  "The approved action's outcome could not be confirmed. Check the current recorded result; this message will not be sent again.";

/** The owner's observed result, without claiming a delivery or hiding a failure. */
export function mailResultFields(
  outcome: IntentsNativeMailOutcome,
): readonly IntentField[] {
  const result = outcome.result;
  if (result.state === "failed")
    return [
      { label: "State", value: "Not sent" },
      { label: "Result", value: "Send request rejected" },
    ];
  const fields: IntentField[] = [
    { label: "State", value: "Accepted by provider" },
    {
      label: "Provider",
      value: providerLabels[result.provider] ?? result.provider,
    },
    { label: "Mode", value: modeLabels[result.mode] ?? result.mode },
    { label: "From", value: result.senderEmail },
    { label: "Signature policy", value: "Sent as the approving actor" },
    {
      label: "Signature",
      value: result.signatureAppended ? "Added" : "Not added",
    },
    {
      label: "Mailbox confirmation",
      value:
        result.mailboxConfirmation === "confirmed"
          ? "Confirmed"
          : result.mailboxConfirmation === "pending"
            ? "Pending"
            : "Not requested",
    },
  ];
  if (result.original)
    fields.push(
      { label: "Original thread", value: result.original.threadId },
      { label: "Original message", value: result.original.messageId },
      { label: "Original revision", value: result.original.updatedAt },
    );
  return fields;
}

/** A mail proposal row: durable phase plus the exact command content. */
export function mailRow(
  item: Extract<IntentsItem, { kind: "proposal"; proposal: unknown }>,
  now: number,
  viewer: Viewer,
): IntentRow | null {
  if (!isMailSendProposal(item.proposal)) return null;
  const proposal = item.proposal;
  const base: IntentRow = {
    deliveryId: item.deliveryId,
    createdAt: item.createdAt,
    title: "Email for your approval",
    status: "",
    tone: "neutral",
    detail: "",
    decision: "closed",
    proposal,
    fields: mailFields(proposal),
    result: [],
  };
  if (item.phase === "expired")
    return {
      ...base,
      status: "Expired",
      tone: "neutral",
      detail:
        "The approval period has expired. Refresh to read any recorded outcome; expiry does not confirm that nothing ran.",
    };
  if (item.phase === "rejected")
    return {
      ...base,
      status: "Rejected",
      tone: "neutral",
      detail: "You rejected this. Nothing was sent.",
    };
  if (item.phase === "executing")
    return {
      ...base,
      status: "Executing",
      tone: "neutral",
      detail:
        "Meri is carrying out the approved action. The message will not be sent twice.",
    };
  if (item.phase === "unknown")
    return {
      ...base,
      status: "Result uncertain",
      tone: "warning",
      detail: unknownDetail,
    };
  if (item.phase === "unknown_decision")
    return {
      ...base,
      status: "Decision status unavailable",
      tone: "warning",
      detail:
        "The decision record could not be read just now. Refresh to check.",
    };
  if (item.phase === "completed") {
    const execution = item.execution;
    if (
      execution === null ||
      execution === "unavailable" ||
      execution.state !== "completed"
    )
      return {
        ...base,
        status: "Result uncertain",
        tone: "warning",
        detail: unknownDetail,
      };
    const outcome = execution.outcome;
    if (!isNativeMailOutcome(outcome))
      return {
        ...base,
        status: "Result uncertain",
        tone: "warning",
        detail: unknownDetail,
      };
    const result = outcome.result;
    return {
      ...base,
      status: result.state === "accepted" ? "Accepted by provider" : "Not sent",
      tone: result.state === "accepted" ? "success" : "danger",
      detail:
        result.state === "accepted" ? acceptedDetail(result) : failedDetail,
      decision: "closed",
      result: mailResultFields(outcome),
    };
  }
  // awaiting_approval or approved
  const own =
    proposal.requiredApprover.tenantId === viewer.tenantId &&
    proposal.requiredApprover.actorId === viewer.actorId;
  const expired = Date.parse(proposal.expiresAt) <= now;
  return {
    ...base,
    status: expired
      ? "Expired"
      : item.phase === "approved"
        ? "Approved"
        : own
          ? "Awaiting your decision"
          : "Needs another approver",
    tone: "neutral",
    decision:
      item.phase === "awaiting_approval" && own && !expired
        ? "approvable"
        : "closed",
    detail: expired
      ? "The approval period has expired. Refresh to read any recorded outcome."
      : item.phase === "approved"
        ? "Your approval is recorded. Execution has not been confirmed yet."
        : "Nothing happens unless you approve this exact action. Sending does not happen during preview.",
  };
}
