import type {
  ActionErrorResponse,
  ActionRoute,
} from "@capiro/meri-contracts/action-application";
import type { WorkflowProblem } from "./workflow-port";

const dispositions: Record<
  ActionErrorResponse["error"]["outcome"],
  WorkflowProblem
> = {
  NOT_DISPATCHED: "not-dispatched",
  UNKNOWN: "unknown",
  RESULT_NOT_RELEASED: "result-withheld",
  STORED_NOT_RELEASED: "stored-withheld",
  NOT_STORED: "not-stored",
  READ_UNAVAILABLE: "read-unavailable",
};
export function actionDisposition(value: ActionErrorResponse): WorkflowProblem {
  return dispositions[value.error.outcome];
}
export function approvalPending(
  route: ActionRoute,
  status: number,
  value: ActionErrorResponse,
): boolean {
  return (
    route === "execute" &&
    status === 409 &&
    value.error.code === "COMMAND_APPROVAL_REFUSED" &&
    value.error.outcome === "NOT_DISPATCHED"
  );
}
export function isAccessLost(
  status: number,
  value: ActionErrorResponse,
): boolean {
  return (
    status === 401 ||
    value.error.code === "SESSION_SCOPE_REFUSED" ||
    value.error.code === "ACCESS_DENIED"
  );
}
