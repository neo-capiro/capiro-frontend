import {
  routinesPaths,
  type RoutinesRoute,
} from "@capiro/meri-contracts/routines-application";
import { actionSessionHeader } from "../meri-actions/session-header";

/** Purpose-specific transport shape only; Meri authenticates this credential on every operation. */
export function receivedRoutineManagementSession(
  request: Request,
): string | null {
  const value = request.headers.get(actionSessionHeader);
  return value !== null && /^routine_session_[A-Za-z0-9_-]{43}$/.test(value)
    ? value
    : null;
}

/** Only these literal operations enter the existing authenticated action adapter. */
export function routineRoute(operation: string): RoutinesRoute | null {
  const name = operation.startsWith("routine-") ? operation.slice(8) : "";
  return Object.hasOwn(routinesPaths, name) ? (name as RoutinesRoute) : null;
}
