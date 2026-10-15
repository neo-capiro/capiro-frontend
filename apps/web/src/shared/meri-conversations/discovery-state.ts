import type { ActionContext } from "../meri-actions/session-receipt";

type DiscoveryScope = Readonly<
  Pick<ActionContext, "tenantId" | "actorId" | "selectedClientId">
>;

/** An in-memory correlation ticket, never a serialized request or authority. */
export type DiscoveryRequest = Readonly<{
  scope: DiscoveryScope;
  cursor: string | null;
}>;

export type DiscoveryState = Readonly<{
  scope: DiscoveryScope;
  status:
    | "idle"
    | "loading"
    | "more"
    | "complete"
    | "empty"
    | "denied"
    | "unavailable"
    | "restart-required";
  rowKeys: readonly string[];
  nextCursor: string | null;
  consumedCursors: readonly (string | null)[];
  request: DiscoveryRequest | null;
}>;

/** Local UI projections after a future canonical receiver, not response DTOs. */
type DiscoveryUpdate =
  | { type: "load" }
  | {
      type: "page";
      request: DiscoveryRequest;
      rowKeys: readonly string[];
      nextCursor: string | null;
    }
  | {
      type: "denied" | "unavailable" | "restart";
      request: DiscoveryRequest;
    };

/** Start a fresh generation on scope replacement or explicit traversal restart. */
export function createDiscoveryState(scope: DiscoveryScope): DiscoveryState {
  return Object.freeze({
    scope: Object.freeze({
      tenantId: scope.tenantId,
      actorId: scope.actorId,
      selectedClientId: scope.selectedClientId,
    }),
    status: "idle",
    rowKeys: Object.freeze([]),
    nextCursor: null,
    consumedCursors: Object.freeze([]),
    request: null,
  });
}

/** Owns display progress only; cached row keys never admit selection or writes. */
export function reduceDiscovery(
  state: DiscoveryState,
  update: DiscoveryUpdate,
): DiscoveryState {
  if (update.type === "load") {
    if (
      state.status === "loading" ||
      state.status === "complete" ||
      state.status === "empty" ||
      state.status === "restart-required"
    )
      return state;
    return Object.freeze({
      ...state,
      status: "loading",
      request: Object.freeze({ scope: state.scope, cursor: state.nextCursor }),
    });
  }
  // Repeated delivery, older retries and every previous scope generation lose.
  if (state.status !== "loading" || state.request !== update.request)
    return state;
  if (update.type === "unavailable")
    return Object.freeze({ ...state, status: "unavailable", request: null });
  if (update.type !== "page")
    return Object.freeze({
      ...createDiscoveryState(state.scope),
      status: update.type === "denied" ? "denied" : "restart-required",
    });
  const consumedCursors = [...state.consumedCursors, update.request.cursor];
  if (
    update.nextCursor !== null &&
    (!update.nextCursor || consumedCursors.includes(update.nextCursor))
  )
    return Object.freeze({
      ...createDiscoveryState(state.scope),
      status: "restart-required",
    });
  const rowKeys = Object.freeze([
    ...new Set([...state.rowKeys, ...update.rowKeys]),
  ]);
  return Object.freeze({
    ...state,
    status:
      update.nextCursor !== null
        ? "more"
        : rowKeys.length
          ? "complete"
          : "empty",
    rowKeys,
    nextCursor: update.nextCursor,
    consumedCursors: Object.freeze(consumedCursors),
    request: null,
  });
}
