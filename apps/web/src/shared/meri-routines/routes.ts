import {
  routinesPaths,
  type RoutinesRoute,
} from "@capiro/meri-contracts/routines-application";

/** Only these literal operations enter the existing authenticated action adapter. */
export function routineRoute(operation: string): RoutinesRoute | null {
  const name = operation.startsWith("routine-") ? operation.slice(8) : "";
  return Object.hasOwn(routinesPaths, name) ? (name as RoutinesRoute) : null;
}
