"use client";
import type { useMailboxes } from "./useMailboxes";
import { QueryState } from "@/shared/portfolio/ui/QueryState";

export function MailboxField({
  state,
  disabled,
}: {
  state: ReturnType<typeof useMailboxes>;
  disabled: boolean;
}) {
  return (
    <div className="stack">
      <label>
        From mailbox
        <select
          value={state.selectedId}
          disabled={
            disabled ||
            state.loading ||
            state.lockedToThread ||
            !state.rows.length
          }
          onChange={(event) => state.select(event.target.value)}
        >
          <option value="">
            {state.loading ? "Loading mailboxes…" : "Choose a sending mailbox"}
          </option>
          {state.selectedId &&
            !state.rows.some((row) => row.id === state.selectedId) && (
              <option value={state.selectedId} disabled>
                Selected mailbox unavailable
              </option>
            )}
          {state.rows.map((row) => (
            <option value={row.id} key={row.id}>
              {row.displayName ? `${row.displayName} · ` : ""}
              {row.accountEmail}
            </option>
          ))}
        </select>
      </label>
      <small>
        {state.lockedToThread
          ? "Replies use the original thread mailbox. "
          : ""}
        Your saved signature belongs to your user account, not to a mailbox.
        Availability does not guarantee provider consent or delivery.
      </small>
      {!state.loading && !state.selected && (
        <p role="status">
          {state.rows.length && !state.selectedId
            ? "Choose a sending mailbox before reviewing this email."
            : "A current sending mailbox is unavailable. The draft is retained; another mailbox will not be substituted."}
        </p>
      )}
      <QueryState error={state.error} />
      <button
        type="button"
        className="button"
        disabled={disabled || state.loading}
        onClick={() => void state.refresh()}
      >
        Refresh mailboxes
      </button>
    </div>
  );
}
