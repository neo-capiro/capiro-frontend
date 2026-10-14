import {
  objectiveDestinationQuery,
  type ObjectiveDestinationQuery,
} from "./objective-destination-binding";

/** Capture only presentation selectors; the current owner remains authoritative. */
export function captureObjectiveRead(
  query: ObjectiveDestinationQuery,
  signal: AbortSignal,
  isCurrent: () => boolean = () => true,
) {
  const captured = Object.freeze(objectiveDestinationQuery.parse(query));
  const admitted = () => {
    signal.throwIfAborted();
    if (!isCurrent())
      throw new DOMException(
        "The selected Objective resource changed.",
        "AbortError",
      );
  };
  admitted();
  return { query: captured, admitted };
}
