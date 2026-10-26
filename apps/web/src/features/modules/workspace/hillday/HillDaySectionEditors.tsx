"use client";

import { useState } from "react";
import {
  firstPage,
  type HillDayDocument,
} from "../../../../shared/capiro/operations/workspace-schemas";
import { CapiroApiError } from "../../../../shared/capiro/http";
import { useCapiroMutation } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Field,
  Modal,
  TextArea,
  TextInput,
  UnavailableAction,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import presentation from "./first-page-editor.module.css";
import {
  captureFirstPage,
  editSummaryCell,
  firstPageChanges,
  summaryCellLimits,
  summaryColumns,
  toggleSummaryColumn,
  visibleSummaryColumns,
  type FirstPageDraft,
  type SummaryColumn,
} from "./first-page-draft";

const columnLabels: Record<SummaryColumn, string> = {
  time: "Time",
  member: "Member",
  office: "Office",
  room: "Room",
  minutes: "Minutes",
  staffLead: "Staff lead",
};

export function FirstPageEditor({
  document,
  onClose,
  onSaved,
}: {
  document: HillDayDocument;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(() => captureFirstPage(document));
  const update = useCapiroMutation("workspace.hillday.update");
  const replacement = firstPageChanges(draft);
  const validation = replacement ? firstPage.safeParse(replacement) : null;
  const invalid = validation?.success === false;
  const conflict =
    update.error instanceof CapiroApiError && update.error.status === 409;
  const reload = () => {
    onSaved();
    onClose();
  };
  async function save() {
    if (!replacement || invalid || conflict || update.pending) return;
    try {
      await update.run({
        params: { id: draft.captured.id },
        body: {
          firstPage: replacement,
          expectedUpdatedAt: draft.captured.updatedAt,
        },
      });
      reload();
    } catch {
      /* Preserve the displayed concurrency pin and draft on conflict. */
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !update.pending) onClose();
      }}
      title="Edit first page"
      description="Presentation changes apply to this document."
      className={presentation.editor}
      closeDisabled={update.pending}
      footer={
        <>
          <ActionButton disabled={update.pending} onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton
            primary
            disabled={update.pending || !replacement || invalid || conflict}
            onClick={save}
          >
            {update.pending ? "Saving…" : "Save first page"}
          </ActionButton>
        </>
      }
    >
      <div className={presentation.form}>
        <FirstPageFields
          draft={draft}
          onChange={setDraft}
          pending={update.pending}
        />
        {invalid && (
          <p role="alert" className={styles.error}>
            {validation.error.issues.some((issue) => issue.path[0] === "rows")
              ? "Keep at most 80 edited schedule rows. Your changes have not been saved."
              : "An edit exceeds its allowed length. Your changes have not been saved."}
          </p>
        )}
        {update.error && (
          <p role="alert" className={styles.error}>
            {update.error.message}
          </p>
        )}
        {conflict && (
          <div className={presentation.recovery}>
            <p>
              Reload the document to see the latest version. This discards your
              unsaved first-page edits.
            </p>
            <ActionButton onClick={reload}>Reload document</ActionButton>
          </div>
        )}
      </div>
    </Modal>
  );
}

function FirstPageFields({
  draft,
  onChange,
  pending,
}: {
  draft: FirstPageDraft;
  onChange: (draft: FirstPageDraft) => void;
  pending: boolean;
}) {
  const visible = visibleSummaryColumns(draft);
  return (
    <>
      <fieldset
        className={presentation.visibility}
        disabled={pending}
        aria-describedby="hillday-columns-help"
        data-design-node="1064:260168"
      >
        <legend>Columns shown in the schedule</legend>
        <div className={presentation.choices}>
          {summaryColumns.map((column) => {
            const shown = visible.includes(column);
            return (
              <label key={column}>
                <input
                  type="checkbox"
                  checked={shown}
                  disabled={pending || (shown && visible.length === 1)}
                  onChange={() => onChange(toggleSummaryColumn(draft, column))}
                />
                {columnLabels[column]}
              </label>
            );
          })}
        </div>
        <p id="hillday-columns-help">
          Uncheck a column to remove it from the first page. You can show it
          again later. Keep at least one column.
        </p>
      </fieldset>
      <div className={presentation.cover} data-design-node="1064:260185">
        <Field label="Title" htmlFor="hillday-cover-title">
          <TextInput
            id="hillday-cover-title"
            value={draft.title}
            maxLength={200}
            disabled={pending}
            onChange={(event) =>
              onChange({ ...draft, title: event.target.value })
            }
          />
        </Field>
        <Field label="Dateline" htmlFor="hillday-cover-dateline">
          <TextArea
            id="hillday-cover-dateline"
            value={draft.dateline}
            maxLength={1000}
            disabled={pending}
            onChange={(event) =>
              onChange({ ...draft, dateline: event.target.value })
            }
          />
        </Field>
      </div>
      <div className={presentation.summary} data-design-node="1064:260219">
        <h3>The day at a glance</h3>
        <DataTable<HillDayDocument["summary"][number]>
          rows={draft.rows}
          rowKey={(row) => row.meetingId}
          caption="Edit schedule summary"
          emptyMessage="No meetings in this document."
          columns={visible.map((column) => ({
            key: column,
            label: columnLabels[column],
            render: (row) => (
              <TextInput
                aria-label={`${columnLabels[column]} for meeting ${draft.rows.indexOf(row) + 1}`}
                className={presentation[column]}
                value={row[column]}
                maxLength={
                  summaryCellLimits[column].unwrap().maxLength ?? undefined
                }
                disabled={pending}
                onChange={(event) =>
                  onChange(
                    editSummaryCell(
                      draft,
                      row.meetingId,
                      column,
                      event.target.value,
                    ),
                  )
                }
              />
            ),
          }))}
        />
      </div>
    </>
  );
}

export function SectionEditor({
  id,
  section,
  onClose,
  onSaved,
}: {
  id: string;
  section: HillDayDocument["sections"][number];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [focus, setFocus] = useState(section.focus ?? "");
  const [background, setBackground] = useState(section.background ?? "");
  const update = useCapiroMutation("workspace.hillday.update");
  async function save() {
    try {
      await update.run({
        params: { id },
        body: { section: { sectionId: section.sectionId, focus, background } },
      });
      onSaved();
      onClose();
    } catch {
      /* User input remains available after failed save. */
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !update.pending) onClose();
      }}
      title={`Edit ${section.member}`}
      footer={
        <>
          <ActionButton disabled={update.pending} onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton primary disabled={update.pending} onClick={save}>
            {update.pending ? "Saving…" : "Save section"}
          </ActionButton>
        </>
      }
    >
      <div className={styles.form}>
        <Field label="Focus" htmlFor="hillday-section-focus">
          <TextArea
            id="hillday-section-focus"
            value={focus}
            maxLength={20000}
            onChange={(event) => setFocus(event.target.value)}
          />
        </Field>
        <Field label="Background" htmlFor="hillday-section-background">
          <TextArea
            id="hillday-section-background"
            value={background}
            maxLength={20000}
            onChange={(event) => setBackground(event.target.value)}
          />
        </Field>
        <UnavailableAction reason="Greenfield Meri has not exposed a verified section refinement contract.">
          Refine with Meri
        </UnavailableAction>
        {update.error && (
          <p role="alert" className={styles.error}>
            {update.error.message}
          </p>
        )}
      </div>
    </Modal>
  );
}
