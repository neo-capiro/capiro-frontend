import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import { MetadataList } from "./MetadataList";
import { TaskFrame } from "./TaskFrame";
import type { MetadataRow } from "./types";
import tooling from "./tooling.module.css";

export type TaskReceiptView = {
  proposal: MetadataRow;
  receipt: readonly MetadataRow[];
  task: readonly MetadataRow[];
  canonicalHref?: string | undefined;
  doneHref?: string | undefined;
};

/** Task · Source creation receipt: source acceptance is recorded separately from the approval. */
export function TaskReceiptScreen({
  view,
  unavailable,
}: {
  view: TaskReceiptView;
  unavailable: string;
}) {
  return (
    <TaskFrame
      title="Task created"
      description="Source acceptance is recorded separately from the approval decision."
      status="Illustrative receipt"
    >
      <section
        className={tooling.box}
        data-tone="muted"
        aria-labelledby="approval-decision"
      >
        <h2 id="approval-decision" className={tooling.boxTitle}>
          Decision recorded · Approved
        </h2>
        <MetadataList
          label="Approval decision"
          rows={[view.proposal]}
          strongLabels
        />
        <p className={tooling.caption}>
          Approval alone is not a source creation receipt.
        </p>
      </section>
      <section className={tooling.box} aria-labelledby="source-receipt">
        <h2 id="source-receipt" className={tooling.boxTitle}>
          Task source accepted
        </h2>
        <MetadataList
          label="Authoritative source receipt"
          rows={view.receipt}
          strongLabels
        />
      </section>
      <MetadataList label="Created task" rows={view.task} strongLabels />
      <p className={tooling.caption}>
        The accepted source record is the result of this action. Repeating the
        same request returns this receipt. Current permissions still govern
        opening the canonical task.
      </p>
      <div className={ui.row}>
        <LinkAction
          variant="primary"
          href={view.canonicalHref}
          unavailable={unavailable}
        >
          Open canonical task
        </LinkAction>
        <LinkAction
          variant="ghost"
          href={view.doneHref}
          unavailable={unavailable}
        >
          Done
        </LinkAction>
      </div>
    </TaskFrame>
  );
}

export type TaskRecordView = {
  record: readonly MetadataRow[];
  status: string;
  doneHref?: string | undefined;
};

/** Task · Canonical source record: an illustrative view of the authoritative task. */
export function TaskRecordScreen({
  view,
  unavailable,
}: {
  view: TaskRecordView;
  unavailable: string;
}) {
  return (
    <TaskFrame
      title="Task record"
      description="Illustrative authoritative source view"
    >
      <MetadataList
        label="Task record"
        rows={view.record}
        labelWidth={120}
        strongLabels
      />
      <p className={tooling.boxTitle}>{view.status}</p>
      <LinkAction
        variant="outline"
        href={view.doneHref}
        unavailable={unavailable}
      >
        Done
      </LinkAction>
    </TaskFrame>
  );
}
