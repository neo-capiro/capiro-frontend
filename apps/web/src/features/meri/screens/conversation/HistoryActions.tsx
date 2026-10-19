"use client";
import { useState } from "react";
import { LinkAction } from "../../ui/LinkAction";
import { DeleteConversationDialog } from "./DeleteConversationDialog";
import ui from "../../ui/meri-ui.module.css";
import styles from "./conversation.module.css";

/** Actions on the selected conversation; all are disabled while nothing is selected (01.04H). */
export function HistoryActions({
  selected,
  manageHref,
  unavailable,
}: {
  selected: boolean;
  manageHref?: string | undefined;
  unavailable: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const noSelection = "Select a conversation first.";
  return (
    <div
      className={`${ui.row} ${styles.historyActions}`}
      aria-label="Selected conversation actions"
      data-selection={selected ? undefined : "none"}
    >
      <button
        type="button"
        className={ui.primary}
        disabled
        title={selected ? unavailable : noSelection}
      >
        Open conversation
      </button>
      <LinkAction
        variant="outline"
        href={selected ? manageHref : undefined}
        unavailable={selected ? unavailable : noSelection}
      >
        Rename
      </LinkAction>
      <button
        type="button"
        className={ui.outline}
        disabled
        title={selected ? unavailable : noSelection}
      >
        Archive
      </button>
      <button
        type="button"
        className={ui.ghost}
        disabled={!selected}
        title={selected ? undefined : noSelection}
        aria-haspopup="dialog"
        onClick={() => setConfirming(true)}
      >
        Delete
      </button>
      <DeleteConversationDialog
        open={confirming}
        onOpenChange={setConfirming}
        explanation="This conversation is removed only if workspace policy permits. Filed client records, recorded action receipts and legally retained records follow their own retention rules."
        confirmLabel="Delete conversation"
        unavailable={unavailable}
      />
    </div>
  );
}
