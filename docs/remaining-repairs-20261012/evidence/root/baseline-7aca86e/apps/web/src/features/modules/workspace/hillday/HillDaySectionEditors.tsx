"use client";

import { useState } from "react";
import type { HillDayDocument } from "../../../../shared/capiro/operations/workspace-schemas";
import { useCapiroMutation } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  TextArea,
  TextInput,
  UnavailableAction,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";

export function FirstPageEditor({
  document,
  onClose,
  onSaved,
}: {
  document: HillDayDocument;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(document.cover.title);
  const [dateline, setDateline] = useState(document.cover.dateline);
  const update = useCapiroMutation("workspace.hillday.update");
  async function save() {
    try {
      await update.run({
        params: { id: document.id },
        body: {
          firstPage: { ...document.firstPage, title, dateline },
          expectedUpdatedAt: document.updatedAt,
        },
      });
      onSaved();
      onClose();
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
      footer={
        <>
          <ActionButton disabled={update.pending} onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton
            primary
            disabled={update.pending || !title.trim()}
            onClick={save}
          >
            Save first page
          </ActionButton>
        </>
      }
    >
      <div className={styles.form}>
        <Field label="Title" htmlFor="hillday-cover-title">
          <TextInput
            id="hillday-cover-title"
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field label="Dateline" htmlFor="hillday-cover-dateline">
          <TextArea
            id="hillday-cover-dateline"
            value={dateline}
            maxLength={1000}
            onChange={(event) => setDateline(event.target.value)}
          />
        </Field>
        {update.error && (
          <p role="alert" className={styles.error}>
            {update.error.message}
          </p>
        )}
      </div>
    </Modal>
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
