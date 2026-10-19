import type { TurnView } from "./conversation-view";

/** Display identity only, derived from public-receiver-admitted lineage by the history adapter. */
export const logicalPromptKey = (
  conversationId: string,
  logicalRequestId: string,
) => JSON.stringify([conversationId, logicalRequestId]);

/** Missing lineage never permits deduplication by request text or a guessed request identity. */
export function shouldShowPrompt(
  turn: Pick<TurnView, "promptKey">,
  earlier: readonly Pick<TurnView, "promptKey">[],
) {
  return (
    turn.promptKey === undefined ||
    !earlier.some((previous) => previous.promptKey === turn.promptKey)
  );
}
