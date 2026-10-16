"use client";
import { MeriDialog } from "../../ui/MeriDialog";
import ui from "../../ui/meri-ui.module.css";
import styles from "./conversation.module.css";

/**
 * Overlay · Delete this conversation? (from history 3035:33134, from management 3022:32527).
 * Deletion follows workspace policy on the trusted service, so confirming is never executed here.
 */
export function DeleteConversationDialog({
  open,
  onOpenChange,
  explanation,
  confirmLabel,
  unavailable,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  explanation: string;
  confirmLabel: string;
  unavailable: string;
}) {
  return (
    <MeriDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete this conversation?"
      description={explanation}
      width="compact"
    >
      <div className={styles.stackedActions}>
        <button
          type="button"
          className={ui.primary}
          disabled
          title={unavailable}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          className={ui.outline}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </button>
      </div>
    </MeriDialog>
  );
}
