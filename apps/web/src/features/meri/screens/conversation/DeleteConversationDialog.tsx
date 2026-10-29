"use client";
import { MeriDialog } from "../../ui/MeriDialog";
import ui from "../../ui/meri-ui.module.css";
import styles from "./conversation.module.css";

/**
 * Overlay · Delete this conversation? (from history 3035:33134, from management 3022:32527).
 * Confirmation is presentation only; a supplied canonical owner handles the request and receipt.
 * Fixture callers omit onConfirm and remain unavailable.
 */
export function DeleteConversationDialog({
  open,
  onOpenChange,
  explanation,
  confirmLabel,
  unavailable,
  onConfirm,
  disabled = false,
  title = "Delete this conversation?",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  explanation: string;
  confirmLabel: string;
  unavailable?: string;
  onConfirm?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <MeriDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={explanation}
      width="compact"
    >
      <p className={ui.muted}>
        Private Office drafts are discarded immediately and cannot be restored.
      </p>
      <div className={styles.stackedActions}>
        <button
          type="button"
          className={ui.primary}
          disabled={disabled || !onConfirm}
          onClick={onConfirm}
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
