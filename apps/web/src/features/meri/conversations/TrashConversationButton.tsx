"use client";
import { useState } from "react";
import { DeleteConversationDialog } from "../screens/conversation/DeleteConversationDialog";

/** Uses the existing Figma deletion dialog; confirmation never invents a success receipt. */
export function TrashConversationButton({
  disabled,
  onConfirm,
}: {
  disabled: boolean;
  onConfirm(): void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        disabled={disabled}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        Move to Trash
      </button>
      <DeleteConversationDialog
        open={open}
        onOpenChange={setOpen}
        disabled={disabled}
        title="Move this conversation to Trash?"
        confirmLabel="Confirm move to Trash"
        explanation="You can restore this conversation for 30 days. After that, permanent deletion follows your workspace retention rules. Filed client records, action receipts and legally retained records follow their own rules."
        onConfirm={() => {
          if (disabled) return;
          setOpen(false);
          onConfirm();
        }}
      />
    </>
  );
}
