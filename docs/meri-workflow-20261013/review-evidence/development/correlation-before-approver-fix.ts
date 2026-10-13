import type {
  ActionDraftResponse,
  ActionQueryResponse,
  ActionPrepareResponse,
  ActionExecuteResponse,
} from "@capiro/meri-contracts/action-application";
import type { ActionContext } from "./session-receipt";
import type { TaskEdits } from "./workflow-port";

export function sameJson(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object")
    return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = Object.keys(left),
    b = Object.keys(right);
  if (a.length !== b.length) return false;
  return a.every(
    (key) =>
      Object.hasOwn(right, key) &&
      sameJson(Reflect.get(left, key), Reflect.get(right, key)),
  );
}
type Binding = ActionQueryResponse["observation"]["binding"];
export function sameContext(binding: Binding, context: ActionContext): boolean {
  return (
    binding.tenantId === context.tenantId &&
    binding.actorId === context.actorId &&
    binding.conversationId === context.conversationId &&
    binding.runId === context.runId
  );
}
export function canonicalEdits(
  edits: TaskEdits,
): Pick<ActionDraftResponse["task"], "title" | "dueDate"> {
  const title = edits.title;
  if (typeof title !== "string" || title.length < 1 || title.length > 240)
    throw new Error("Invalid task title");
  if (edits.dueDate === null) return { title, dueDate: null };
  const date = edits.dueDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid task date");
  const dueDate = `${date}T00:00:00.000Z`;
  if (new Date(dueDate).toISOString() !== dueDate)
    throw new Error("Invalid task date");
  return { title, dueDate };
}
export function validQuery(
  value: ActionQueryResponse,
  context: ActionContext,
): boolean {
  return (
    sameContext(value.observation.binding, context) &&
    value.observation.result.clientId === context.selectedClientId
  );
}
export function validDraft(
  value: ActionDraftResponse,
  query: ActionQueryResponse,
  actionId: string,
  edits: TaskEdits,
  context: ActionContext,
): boolean {
  const source = value.source;
  return (
    source.resultReference === query.resultReference &&
    source.resultSha256 === query.resultSha256 &&
    source.lookupId === query.lookupId &&
    source.actionId === actionId &&
    source.clientId === context.selectedClientId &&
    sameJson(source.originalBinding, query.observation.binding) &&
    sameJson(
      value.recommendation,
      query.observation.result.actions.find((row) => row.id === actionId),
    ) &&
    sameJson(value.task, { ...edits, clientId: context.selectedClientId })
  );
}
export function validPrepared(
  value: ActionPrepareResponse,
  draft: ActionDraftResponse,
  context: ActionContext,
  now: number,
): boolean {
  return (
    sameJson(value.draft, draft) &&
    sameContext(value.proposal.command.binding, context) &&
    value.proposal.requiredApprover.tenantId === context.tenantId &&
    value.proposal.requiredApprover.actorId === context.actorId &&
    Date.parse(value.proposal.expiresAt) > now
  );
}
export function validExecution(
  value: ActionExecuteResponse,
  prepared: ActionPrepareResponse,
  context: ActionContext,
): boolean {
  if (value.status === "indeterminate") return true;
  const { receipt, result } = value.outcome;
  const command = prepared.proposal.command;
  return (
    receipt.commandId === command.commandId &&
    receipt.commandSha256 === prepared.proposal.commandSha256 &&
    receipt.idempotencyKey === command.idempotencyKey &&
    sameContext(receipt.binding, context) &&
    result.clientId === prepared.draft.task.clientId &&
    result.title === prepared.draft.task.title &&
    result.dueDate === prepared.draft.task.dueDate
  );
}
