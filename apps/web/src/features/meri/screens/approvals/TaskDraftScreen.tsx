"use client";
import { useState } from "react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { InlineDialog } from "../../ui/InlineDialog";
import { FormField } from "../../ui/FormField";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import panel from "../../ui/panel.module.css";
import styles from "./approvals.module.css";

export type TaskDraft = {
  title: string;
  description: string;
  owner: string;
  dueDate: string;
};
export type TaskDraftView = {
  heading: string;
  context: string;
  draft: TaskDraft;
  /** Bound context shown for review; the browser never selects client authority. */
  client: string;
  evidence: string;
  closeHref?: string;
};

/** 06.03 Draft a client task: editing the draft locally never creates a task. */
export function TaskDraftScreen({
  view,
  unavailable,
}: {
  view: TaskDraftView;
  unavailable: string;
}) {
  const [draft, setDraft] = useState(view.draft);
  const edit = (key: keyof TaskDraft) => (value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Create a task proposal"
        description="Meri prepares the task for review."
      />
      <InlineDialog
        title={view.heading}
        context={view.context}
        closeHref={view.closeHref}
        unavailable={unavailable}
      >
        <form
          className={styles.form}
          aria-label="Task draft"
          onSubmit={(event) => event.preventDefault()}
        >
          <FormField
            label="Title"
            value={draft.title}
            onChange={edit("title")}
          />
          <FormField
            label="Description"
            value={draft.description}
            onChange={edit("description")}
            multiline
          />
          <div className={panel.fieldRow}>
            <FormField
              label="Owner"
              value={draft.owner}
              onChange={edit("owner")}
            />
            <FormField
              label="Due date"
              value={draft.dueDate}
              onChange={edit("dueDate")}
            />
          </div>
          <FormField label="Client" value={view.client} />
          <FormField label="Evidence" value={view.evidence} />
          <div className={ui.row}>
            <LinkAction
              variant="outline"
              href={view.closeHref}
              unavailable={unavailable}
            >
              Cancel
            </LinkAction>
            <button
              type="submit"
              className={ui.primary}
              disabled
              title={unavailable}
            >
              Review task proposal
            </button>
          </div>
        </form>
      </InlineDialog>
    </div>
  );
}
