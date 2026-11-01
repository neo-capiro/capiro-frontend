"use client";
import { useState } from "react";
import { useConversationHistory } from "../../../shared/meri-conversations/history-queries";
import { savedTurns } from "../conversation/saved-turns";
import { ConversationTurn } from "../conversation/ConversationTurn";
import type { ConversationSummary } from "../../../shared/meri-conversations/history-client";

/** Archived content uses the existing read-only history owner, never session admission. */
export function SavedChatTranscript({
  row,
  account,
}: {
  row: ConversationSummary;
  account: { tenantId: string; actorId: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Read saved chat</summary>
      {open && <SavedChatContent row={row} account={account} />}
    </details>
  );
}

/** Collapsing a disclosure is not access revocation; mount the reader only while open. */
function SavedChatContent({
  row,
  account,
}: {
  row: ConversationSummary;
  account: { tenantId: string; actorId: string };
}) {
  const history = useConversationHistory(
    account,
    row.clientId,
    row.conversationId,
    true,
    row.scopeKind === "research_portfolio" ? row : undefined,
  );
  const turns =
    history.unavailable ||
    history.query.isFetching ||
    history.tail.isFetching ||
    history.tail.error
      ? []
      : savedTurns(history.saved);
  return (
    <>
      {history.query.isFetching || history.tail.isFetching ? (
        <p role="status">Loading saved chat…</p>
      ) : history.unavailable || history.tail.error ? (
        <p role="alert">
          This saved chat could not be verified.{" "}
          <button onClick={history.refresh}>Retry</button>
        </p>
      ) : (
        turns.map((turn, index) => (
          <ConversationTurn
            key={turn.runId}
            turn={turn}
            label={`Saved turn ${index + 1}`}
          />
        ))
      )}
      {history.empty && <p>This chat has no saved turns.</p>}
      {history.query.hasNextPage && !history.unavailable && (
        <button
          disabled={history.query.isFetching}
          onClick={() => void history.query.fetchNextPage()}
        >
          Load more saved updates
        </button>
      )}
    </>
  );
}
