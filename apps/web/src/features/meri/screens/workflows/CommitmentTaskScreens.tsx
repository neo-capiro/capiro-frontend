"use client";
import { useState } from "react";
import { LinkAction } from "../../ui/LinkAction";
import { Notice } from "../../ui/Notice";
import ui from "../../ui/meri-ui.module.css";
import panel from "../../ui/panel.module.css";
import { ActionRow } from "./ActionRow";
import { MetadataList } from "./MetadataList";
import { TaskFrame } from "./TaskFrame";
import { WorkflowField } from "./WorkflowField";
import type { ActionSpec, MetadataRow } from "./types";
import tooling from "./tooling.module.css";

export type TaskDraftView = {
  title: string;
  client: string;
  owner: string;
  due: string;
  evidence: string;
  reviewHref?: string | undefined;
  cancelHref?: string | undefined;
};

/** Editable draft fields; unknown owner and date stay unset unless explicitly supplied. */
function TaskDraftFields({ view }: { view: TaskDraftView }) {
  const [title, setTitle] = useState(view.title);
  const [owner, setOwner] = useState(view.owner);
  const [due, setDue] = useState(view.due);
  return (
    <>
      <WorkflowField
        field={{
          label: "Task title",
          value: view.title,
          helper: "Review the exact title before creating the source task.",
        }}
        value={title}
        onChange={setTitle}
      />
      <WorkflowField
        field={{
          label: "Client",
          value: view.client,
          helper:
            "The current authorized client remains attached to the proposal.",
        }}
      />
      <div className={panel.fieldRow}>
        <WorkflowField
          field={{
            label: "Owner · optional",
            value: view.owner,
            helper:
              "Unknown leaves the task unassigned unless you explicitly choose an owner.",
          }}
          value={owner}
          onChange={setOwner}
        />
        <WorkflowField
          field={{
            label: "Due date · optional",
            value: view.due,
            helper:
              "Not stated leaves the date unset. Meri does not invent a deadline.",
          }}
          value={due}
          onChange={setDue}
        />
      </div>
    </>
  );
}

/** Task · Draft from commitment: editable local draft; reviewing it creates nothing. */
export function TaskDraftFromCommitmentScreen({
  view,
  unavailable,
}: {
  view: TaskDraftView;
  unavailable: string;
}) {
  return (
    <TaskFrame
      title="Draft a task"
      description="Use the explicit promise and preserve details the source does not state."
      status="Draft only · No task created"
    >
      <TaskDraftFields view={view} />
      <section
        className={tooling.box}
        data-tone="muted"
        aria-labelledby="promise-source"
      >
        <h2 id="promise-source" className={tooling.boxTitle}>
          Promise source
        </h2>
        <p className={`${tooling.small} ${tooling.muted}`}>{view.evidence}</p>
      </section>
      <p className={tooling.caption}>
        The source is an explicit promise. Missing tracking does not prove that
        no action occurred outside the checked records. Reviewing this draft
        does not create a task.
      </p>
      <div className={ui.row}>
        <LinkAction
          variant="primary"
          href={view.reviewHref}
          unavailable={unavailable}
        >
          Review exact task
        </LinkAction>
        <LinkAction
          variant="ghost"
          href={view.cancelHref}
          unavailable={unavailable}
        >
          Cancel
        </LinkAction>
      </div>
    </TaskFrame>
  );
}

export type TaskReviewView = {
  payload: readonly MetadataRow[];
  editHref?: string | undefined;
  cancelHref?: string | undefined;
};

/** Task · Review exact source action: approval covers only this displayed payload. */
export function TaskReviewScreen({
  view,
  unavailable,
}: {
  view: TaskReviewView;
  unavailable: string;
}) {
  return (
    <TaskFrame
      title="Review task creation"
      description="Confirm the exact client, task details and source evidence before approving."
      status="Pending review · No source task created"
    >
      <MetadataList
        label="Exact task payload"
        rows={view.payload}
        strongLabels
      />
      <Notice title="Unknown values remain unset">
        “Unknown” means no owner was stated; “Not stated” means no due date was
        stated. You may explicitly supply permitted values in the draft. Changed
        details require a new exact review.
      </Notice>
      <p className={`${tooling.small} ${tooling.muted}`}>
        Approval authorizes only this displayed task action. Current client and
        action permissions are checked again before source creation. A repeated
        request key returns the existing source receipt instead of creating
        another task.
      </p>
      <ActionRow
        label="Task decision actions"
        actions={
          [
            { label: "Approve & create task", variant: "primary" },
            { label: "Edit draft", variant: "outline", href: view.editHref },
            { label: "Cancel", variant: "ghost", href: view.cancelHref },
          ] satisfies readonly ActionSpec[]
        }
        unavailable={unavailable}
      />
    </TaskFrame>
  );
}
