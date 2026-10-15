"use client";
import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { MeriDialog } from "../../ui/MeriDialog";
import { Notice } from "../../ui/Notice";
import { FormField } from "../../ui/FormField";
import ui from "../../ui/meri-ui.module.css";
import rows from "../../ui/detail-row.module.css";
import styles from "./conversation.module.css";

export type ManagementView = {
  title: string;
  suggestedTitle: string;
  /** Earlier prompts, one per response branch, oldest first. */
  branches: readonly { id: string; prompt: string }[];
  archived?: { title: string; detail: string };
};

/** 09.08 Conversation management and branches: rename and branch navigation stay local. */
export function ConversationManagementScreen({
  view,
  unavailable,
}: {
  view: ManagementView;
  unavailable: string;
}) {
  const [open, setOpen] = useState(true);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Manage this conversation"
        description="Change its title or continue from a different response."
      />
      {open ? (
        <div className={styles.dialogSpace} aria-hidden />
      ) : (
        <div className={ui.row}>
          <span className={rows.rowTitle}>{view.title}</span>
          <button
            type="button"
            className={ui.outline}
            ref={trigger}
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            <Pencil aria-hidden /> Rename conversation
          </button>
        </div>
      )}
      <MeriDialog
        open={open}
        onOpenChange={setOpen}
        returnFocus={trigger}
        title="Rename conversation"
        description="Your conversation content stays available."
      >
        <RenameForm
          initial={view.suggestedTitle}
          unavailable={unavailable}
          onCancel={() => setOpen(false)}
        />
      </MeriDialog>
      <BranchPanel view={view} unavailable={unavailable} />
    </div>
  );
}

function RenameForm({
  initial,
  unavailable,
  onCancel,
}: {
  initial: string;
  unavailable: string;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial);
  return (
    <>
      <FormField label="Name" value={name} autoFocus onChange={setName} />
      <div className={ui.row}>
        <button type="button" className={ui.outline} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={ui.primary}
          disabled
          title={unavailable}
        >
          Save name
        </button>
      </div>
    </>
  );
}

function BranchPanel({
  view,
  unavailable,
}: {
  view: ManagementView;
  unavailable: string;
}) {
  const last = view.branches.length - 1;
  const [index, setIndex] = useState(last);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const branch = view.branches[index];
  if (!branch) return null;
  return (
    <section className={styles.branchPanel} aria-labelledby="branch-title">
      <h2 id="branch-title" className={styles.sectionTitle} aria-live="polite">
        Response {index + 1} of {view.branches.length}
      </h2>
      <div className={ui.row} aria-label="Response branches">
        <button
          type="button"
          className={ui.outline}
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          Previous response
        </button>
        <button
          type="button"
          className={ui.outline}
          disabled={index === last}
          onClick={() => setIndex(index + 1)}
        >
          Next response
        </button>
      </div>
      <FormField
        label="Edit your previous message"
        value={edits[branch.id] ?? branch.prompt}
        onChange={(value) => setEdits({ ...edits, [branch.id]: value })}
      />
      <button type="button" className={ui.primary} disabled title={unavailable}>
        Resubmit as new branch
      </button>
      {view.archived ? (
        <Notice tone="success" title={view.archived.title}>
          {view.archived.detail}
        </Notice>
      ) : null}
    </section>
  );
}
