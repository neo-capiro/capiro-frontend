"use client";
import { MeriDialog } from "../ui/MeriDialog";
import { FormField } from "../ui/FormField";
import ui from "../ui/meri-ui.module.css";
import styles from "../screens/conversation/conversation.module.css";

/** Overlay · Rename conversation (Figma 3147:41265): the title changes, the scope, history and receipts do not. */
export function RenameConversationDialog({
  open,
  onOpenChange,
  current,
  draft,
  onDraft,
  disabled,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Saved title; Save stays unavailable until the draft differs from it. */
  current: string;
  draft: string;
  onDraft: (value: string) => void;
  disabled: boolean;
  onSave: (title: string) => void;
}) {
  const title = draft.trim();
  return (
    <MeriDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rename conversation"
      description="The new title applies to this conversation only. Its scope, history and receipts do not change."
      width="compact"
    >
      <FormField
        label="Title"
        value={draft}
        onChange={onDraft}
        maxLength={200}
        autoFocus
      />
      <div className={styles.stackedActions}>
        <button
          type="button"
          className={ui.primary}
          disabled={disabled || !title || title === current}
          onClick={() => onSave(title)}
        >
          Save title
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
