import { routinesPaths as publishedRoutinePaths } from "@capiro/meri-contracts/routines-application";
import { routineConsentPaths, type RoutineRouteName } from "./consent";
import { actionSessionHeader } from "../meri-actions/session-header";

/**
 * The published routines family plus the two source-stage renewal routes. The upstream path is resolved from here so
 * that a route the installed package does not know yet is still addressed canonically, without touching the package.
 */
export const routinePaths = Object.freeze({
  ...publishedRoutinePaths,
  ...routineConsentPaths,
}) as Readonly<Record<RoutineRouteName, string>>;

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
export function routineRoute(operation: string): RoutineRouteName | null {
  const name = operation.startsWith("routine-") ? operation.slice(8) : "";
  return Object.hasOwn(routinePaths, name) ? (name as RoutineRouteName) : null;
}
