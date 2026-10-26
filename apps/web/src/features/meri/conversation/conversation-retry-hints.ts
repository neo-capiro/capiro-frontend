/**
 * Hints for one explicit retry of a conversation connection.
 *
 * Meri re-prepares an original whose first turn never started only on an issuance with NO exact
 * run (`INITIAL_BINDING_EXPIRED` is refused while a run is pinned, and anything that started is
 * never rebound). So a session the service refused as access-lost can only be recovered by
 * re-opening the SAME conversation at conversation scope; every other retry keeps its exact
 * binding. Returns `undefined` when the caller must keep the binding it already holds, so a
 * missing conversation can never broaden a selection.
 */
export function conversationRetryHints(options: {
  accessLost: boolean;
  clientId: string | null;
  conversationId: string | undefined;
}): { clientId: string | null; conversationId: string } | undefined {
  const { accessLost, clientId, conversationId } = options;
  if (!accessLost || !conversationId) return undefined;
  return { clientId, conversationId };
}
