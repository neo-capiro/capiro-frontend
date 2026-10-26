/**
 * Hints for one explicit retry of a conversation connection after the service refused its session.
 *
 * Meri re-prepares an original whose first turn never started only on an issuance with NO exact
 * run: a pinned run is refused (`INITIAL_BINDING_EXPIRED` / `_SUPERSEDED`) and is never rebound.
 * But an issuance without a run on a conversation whose latest run already finished RESERVES
 * that run's successor (the next-run owner), while the exact run binds it read-only. So the run
 * pin may be dropped only when the durable owner says the conversation never started:
 * `unstarted` is the history route's `NOT_FOUND` (the conversation has no run at all, answered
 * before access was lost) with no submission retained for the pinned run in this tab. Every
 * started or ambiguous case, and every retry that did not lose access, keeps its exact binding.
 * Returns `undefined` when the caller must keep the binding it already holds, so a missing
 * conversation can never broaden a selection.
 */
export function conversationRetryHints(options: {
  accessLost: boolean;
  unstarted: boolean;
  clientId: string | null;
  conversationId: string | undefined;
}): { clientId: string | null; conversationId: string } | undefined {
  const { accessLost, unstarted, clientId, conversationId } = options;
  if (!accessLost || !unstarted || !conversationId) return undefined;
  return { clientId, conversationId };
}
