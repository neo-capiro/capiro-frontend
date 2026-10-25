import { useState } from "react";
import type { OperationRequest } from "../../../shared/capiro/contracts";
import type { workspaceHillDayOperations } from "../../../shared/capiro/operations/workspace-hillday";

type LibraryQuery = NonNullable<
  OperationRequest<
    (typeof workspaceHillDayOperations)["workspace.documents"]
  >["query"]
>;
type Filters = Pick<
  LibraryQuery,
  "q" | "scope" | "kind" | "clientId" | "status"
>;

/** React state owns only user filters and the opaque continuation, never access. */
export function useLibraryQuery(clientId?: string) {
  const [state, setState] = useState<{
    routeClientId?: string;
    query: LibraryQuery;
  }>({
    routeClientId: clientId,
    query: { q: "", scope: "all", kind: "all", limit: 50 },
  });
  // Reset before the query hook can issue a request for a changed receiver.
  const current =
    state.routeClientId === clientId
      ? state
      : {
          routeClientId: clientId,
          query: { ...state.query, clientId: undefined, cursor: undefined },
        };
  if (current !== state) setState(current);
  const setFilters = (filters: Filters) =>
    setState((value) => ({
      ...value,
      query: { ...value.query, ...filters, cursor: undefined },
    }));
  const setCursor = (cursor?: string) =>
    setState((value) => ({ ...value, query: { ...value.query, cursor } }));
  return {
    query: { ...current.query, clientId: clientId ?? current.query.clientId },
    setFilters,
    setCursor,
  };
}
