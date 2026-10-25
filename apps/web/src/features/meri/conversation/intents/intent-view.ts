import {
  intentsMetadata,
  type IntentsItem,
  type IntentsProposal,
} from "@capiro/meri-client/intents";

export type IntentTone = "neutral" | "success" | "warning" | "danger";
/** What the person may do with a row: decide it, only read it (held), or nothing (closed). */
export type IntentDecision = "approvable" | "held" | "closed";
export type IntentField = Readonly<{ label: string; value: string }>;
export type IntentRow = Readonly<{
  deliveryId: string;
  createdAt: string;
  title: string;
  status: string;
  tone: IntentTone;
  detail: string;
  decision: IntentDecision;
  /** Present only for a visible command proposal; the exact content the server retained. */
  proposal: IntentsProposal | null;
  fields: readonly IntentField[];
  /** The owner's observed task or published document result. */
  result: readonly IntentField[];
}>;
export type Viewer = Readonly<{ tenantId: string; actorId: string }>;

const operationLabels: Readonly<Record<string, string>> = {
  create_task: "Create a task",
  create_word: "Prepare a document",
  update_task: "Update a task",
  save_memory: "Save to memory",
  save_chat_attachments: "File chat attachments",
  request_document: "Prepare a document",
  request_analysis: "Prepare an analysis",
};
const actionLabels: Readonly<Record<string, string>> = {
  "task.create": "Create a task",
  "task.update": "Update a task",
  "document.draft": "Prepare a document",
  "memory.propose": "Propose a memory for review",
  "artifact.file": "File attachments to a client",
};
const cap = (value: string, length = 400) =>
  value.length > length ? `${value.slice(0, length)}…` : value;
const plainValue = (value: unknown): string =>
  typeof value === "string"
    ? cap(value)
    : typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : value === null
        ? "None"
        : cap(JSON.stringify(value));
const humanize = (key: string) =>
  key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
const day = (iso: string) => iso.slice(0, 10);

/** The retained command, as the person must see it before deciding: nothing summarized away. */
export function proposalFields(
  proposal: IntentsProposal,
): readonly IntentField[] {
  const command = proposal.command;
  const args = command.arguments as Record<string, unknown>;
  const fields: IntentField[] = [
    { label: "Action", value: actionLabels[command.action] ?? command.action },
  ];
  if (command.action === "task.create") {
    fields.push(
      { label: "Task title", value: plainValue(args.title) },
      {
        label: "Due date",
        value: typeof args.dueDate === "string" ? day(args.dueDate) : "None",
      },
      { label: "Client", value: plainValue(args.clientId) },
    );
  } else {
    for (const [key, value] of Object.entries(args))
      fields.push({ label: humanize(key), value: plainValue(value) });
  }
  fields.push(
    {
      label: "Scope",
      value: command.scopes.map((s) => `${s.kind} ${s.resourceId}`).join("; "),
    },
    { label: "Attachments", value: String(command.attachments.length) },
    { label: "Expires", value: proposal.expiresAt },
    { label: "Command hash", value: proposal.commandSha256 },
  );
  if (command.action === "artifact.file")
    command.attachments.forEach((file, index) => {
      const label = `Attachment ${index + 1}`;
      fields.push(
        { label: `${label} reference`, value: file.objectId },
        { label: `${label} version`, value: file.versionId },
        { label: `${label} bytes`, value: String(file.bytes) },
        { label: `${label} hash`, value: file.sha256 },
      );
    });
  return fields;
}

type Completed = Extract<
  Extract<IntentsItem, { kind: "proposal"; proposal: unknown }>["execution"],
  { state: "completed" }
>;
function resultFields(
  execution: Completed,
  action: IntentsProposal["command"]["action"],
): readonly IntentField[] {
  if ("version" in execution.outcome) {
    const { version } = execution.outcome;
    return [
      { label: "Document prepared", value: version.filename },
      { label: "Version", value: version.versionId },
      { label: "Bytes", value: String(version.object.bytes) },
      { label: "Created", value: version.createdAt },
    ];
  }
  const { result } = execution.outcome;
  if ("files" in result)
    return result.files.flatMap((file, index) => {
      const label = `File ${index + 1}`;
      return [
        { label, value: file.fileName ?? "Name unavailable" },
        { label: `${label} status`, value: humanize(file.status) },
        ...(file.documentId === undefined
          ? []
          : [
              { label: `${label} document`, value: file.documentId },
              { label: `${label} location`, value: file.location! },
              {
                label: `${label} indexing`,
                value:
                  file.indexingStatus === "not_indexed"
                    ? "Not indexed"
                    : humanize(file.indexingStatus!),
              },
              { label: `${label} reused`, value: file.reused ? "Yes" : "No" },
            ]),
        ...(file.reason === undefined
          ? []
          : [{ label: `${label} reason`, value: file.reason }]),
      ];
    });
  const proof =
    "execution" in execution.outcome
      ? execution.outcome.execution
      : execution.outcome.receipt;
  return [
    {
      label: action === "task.update" ? "Task updated" : "Task created",
      value: result.title,
    },
    ...(action === "task.update"
      ? [{ label: "Task status", value: result.status.replaceAll("_", " ") }]
      : []),
    { label: "Due date", value: result.dueDate ? day(result.dueDate) : "None" },
    { label: "Completed", value: proof.completedAt },
  ];
}

type Look = Readonly<{ status: string; tone: IntentTone; detail: string }>;
function filingLook(execution: Completed): Look | null {
  if (
    !("result" in execution.outcome) ||
    !("files" in execution.outcome.result)
  )
    return null;
  const files = execution.outcome.result.files;
  const saved = files.filter((file) => file.status === "saved").length;
  const pending = files.filter((file) => file.status === "pending").length;
  const failed = files.filter((file) => file.status === "failed").length;
  return {
    status:
      saved === files.length
        ? "Files saved"
        : failed === files.length
          ? "Filing failed"
          : "Filing needs attention",
    tone:
      saved === files.length
        ? "success"
        : failed === files.length
          ? "danger"
          : "warning",
    detail: `${saved} saved, ${pending} pending, ${failed} failed. Review each file's recorded result; indexing is shown separately.`,
  };
}
const nothing = "Nothing was approved or executed.";
/** Journal states and withheld or non-command items: shown, never decidable, no content. */
const plainLooks = {
  pending: {
    status: "Preparing",
    tone: "neutral",
    detail: "Meri is still preparing this request.",
  },
  unknown: {
    status: "Result uncertain",
    tone: "warning",
    detail: `Meri could not confirm whether this request was prepared. ${nothing}`,
  },
  withheldDraft: {
    status: "Withheld",
    tone: "neutral",
    detail: "You no longer have access to the client this draft belongs to.",
  },
  draft: {
    status: "Draft ready",
    tone: "success",
    detail: "A draft file was prepared. Nothing was filed or shared.",
  },
  schedule: {
    status: "Prepared",
    tone: "neutral",
    detail:
      "A schedule proposal was prepared. Approving schedules is not available here.",
  },
  withheldProposal: {
    status: "Withheld",
    tone: "neutral",
    detail: "You no longer have access to the client this proposal belongs to.",
  },
} satisfies Record<string, Look>;
/** Durable phases, read from the decision and execution owners; a phase is never a decision. */
const phaseLooks = {
  approved: {
    status: "Approved",
    tone: "neutral",
    detail: "Your approval is recorded. Execution has not been confirmed yet.",
  },
  executing: {
    status: "Executing",
    tone: "neutral",
    detail: "Meri is carrying out the approved action.",
  },
  completed: {
    status: "Completed",
    tone: "success",
    detail: "Meri recorded the result of the approved action.",
  },
  rejected: {
    status: "Rejected",
    tone: "neutral",
    detail: "You rejected this. Nothing was executed.",
  },
  expired: {
    status: "Expired",
    tone: "neutral",
    detail: "It expired before a decision. Nothing was executed.",
  },
  unknown: {
    status: "Result uncertain",
    tone: "warning",
    detail:
      "Meri could not confirm the result of the approved action. Check again; nothing is repeated.",
  },
  unknown_decision: {
    status: "Decision status unavailable",
    tone: "warning",
    detail: "The decision record could not be read just now. Refresh to check.",
  },
} satisfies Record<string, Look>;
const awaitingLooks = {
  approvable: {
    status: "Awaiting your decision",
    tone: "warning",
    detail: "Nothing happens unless you approve this exact action.",
  },
  held: {
    status: "Prepared",
    tone: "neutral",
    detail: `Approval is not available yet for this kind of action. ${nothing}`,
  },
  otherApprover: {
    status: "Needs another approver",
    tone: "neutral",
    detail: `Another person must approve this; that is not supported here. ${nothing}`,
  },
} satisfies Record<string, Look>;

const base = (item: IntentsItem) => ({
  deliveryId: item.deliveryId,
  createdAt: item.createdAt,
  title: operationLabels[item.operation.id] ?? humanize(item.operation.id),
  proposal: null,
  fields: [] as readonly IntentField[],
  result: [] as readonly IntentField[],
});
type ProposalItem = Extract<
  IntentsItem,
  { kind: "proposal"; proposal: unknown }
>;

/** The look of a visible proposal: the durable phase, except that a decision is offered only when it can be made. */
function proposalLook(
  item: ProposalItem,
  now: number,
  viewer: Viewer,
): { look: Look; decision: IntentDecision } {
  const { proposal } = item;
  if (
    item.phase !== "awaiting_approval" ||
    Date.parse(proposal.expiresAt) <= now
  )
    return {
      look:
        item.phase === "awaiting_approval"
          ? phaseLooks.expired
          : phaseLooks[item.phase],
      decision: "closed",
    };
  if (
    !(intentsMetadata.approvableActions as readonly string[]).includes(
      proposal.command.action,
    )
  )
    return { look: awaitingLooks.held, decision: "held" };
  const approver = proposal.requiredApprover;
  if (
    approver.tenantId !== viewer.tenantId ||
    approver.actorId !== viewer.actorId
  )
    return { look: awaitingLooks.otherApprover, decision: "held" };
  return { look: awaitingLooks.approvable, decision: "approvable" };
}

/** One list item as a truthful row. Phase is read from the durable owners; this never decides anything. */
export function intentRow(
  item: IntentsItem,
  now: number,
  viewer: Viewer,
): IntentRow {
  const row = base(item);
  const closed = (look: Look) => ({
    ...row,
    ...look,
    decision: "closed" as const,
  });
  if (item.state === "pending" || item.state === "unknown")
    return closed(plainLooks[item.state]);
  if (item.state === "failed")
    return closed({
      status: "Failed",
      tone: "danger",
      detail: `Preparation failed (${item.code}). ${nothing}`,
    });
  if (item.kind === "draft")
    return closed(
      "withheld" in item ? plainLooks.withheldDraft : plainLooks.draft,
    );
  if (item.kind === "schedule_proposal") return closed(plainLooks.schedule);
  if (item.kind === "memory_review") {
    const withheld = "withheld" in item;
    return {
      ...closed({
        status: withheld ? "Withheld" : "Submitted for review",
        tone: "neutral",
        detail: withheld
          ? "Memory review details are unavailable with your current access."
          : "Submission was accepted for memory review. This receipt does not confirm a saved or published memory.",
      }),
      title: "Memory review",
      result: withheld
        ? []
        : [
            {
              label: "Candidate reference",
              value: item.review.result.candidateId,
            },
            { label: "Command hash", value: item.review.result.commandSha256 },
          ],
    };
  }
  if ("withheld" in item) return closed(plainLooks.withheldProposal);
  const { look, decision } = proposalLook(item, now, viewer);
  const execution = item.execution;
  const completed =
    execution !== null &&
    typeof execution === "object" &&
    execution.state === "completed"
      ? execution
      : null;
  return {
    ...row,
    ...(item.phase === "completed" && !completed ? phaseLooks.unknown : look),
    ...(completed ? filingLook(completed) : null),
    decision,
    title: actionLabels[item.proposal.command.action] ?? row.title,
    proposal: item.proposal,
    fields: proposalFields(item.proposal),
    result: completed
      ? resultFields(completed, item.proposal.command.action)
      : [],
  };
}

/** Awaiting rows first; everything else in the order Meri listed it, newest first. */
export function intentRows(
  items: readonly IntentsItem[],
  now: number,
  viewer: Viewer,
): readonly IntentRow[] {
  const rows = items.map((item) => intentRow(item, now, viewer));
  return [
    ...rows.filter((row) => row.decision === "approvable"),
    ...rows.filter((row) => row.decision !== "approvable").reverse(),
  ];
}

const refusalText: Readonly<Record<string, string>> = {
  INTENT_EXPIRED: "This proposal has expired. Nothing was executed.",
  INTENT_NOT_APPROVABLE:
    "Approval is not available yet for this kind of action. Nothing was executed.",
  INTENT_MISMATCH:
    "This proposal changed. Refresh to see the current one. Nothing was executed.",
  INTENT_NOT_FOUND: "Meri no longer has this proposal. Nothing was executed.",
  INTENT_SCOPE_WITHHELD:
    "You no longer have access to what this proposal covers. Nothing was executed.",
  APPROVER_REFUSED:
    "You are not the approver for this proposal. Nothing was executed.",
  APPROVAL_DECISION_REFUSED:
    "A different decision was already recorded for this proposal. Refresh to see it.",
  INTENT_APPROVALS_DISABLED:
    "Approval decisions are not enabled for this deployment.",
};
/** Plain words for a definite refusal; the code stays visible so support can read it. */
export const refusalMessage = (code: string) =>
  `${refusalText[code] ?? "Your decision was not recorded. Nothing was executed."} (${code})`;
