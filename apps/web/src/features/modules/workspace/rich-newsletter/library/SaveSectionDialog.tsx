"use client";
import { useId, useState } from "react";
import { ActionButton, Field, Modal, TextInput } from "@/shared/module-ui";
import type { SectionLibrary } from "./use-section-library";
import styles from "./sections.module.css";

export function SaveSectionDialog({ library }: { library: SectionLibrary }) {
  const selected = library.save!;
  const [name, setName] = useState(selected.sectionName);
  const [folder, setFolder] = useState("");
  const formId = useId();
  const pending = selected.phase === "pending";
  const unknown = selected.phase === "unknown";
  return (
    <Modal
      open={library.dialog}
      onOpenChange={(open) => {
        if (!open) library.closeSave();
      }}
      title="Save section"
      description="Reuse this section in a future newsletter."
      className={styles.dialog}
      closeDisabled={pending}
      footer={
        <div className={styles.actions}>
          <ActionButton
            className={styles.button}
            disabled={pending}
            onClick={library.closeSave}
          >
            {unknown ? "Close" : "Cancel"}
          </ActionButton>
          {unknown ? (
            <ActionButton
              className={styles.button}
              onClick={() => void library.browse()}
            >
              View saved sections
            </ActionButton>
          ) : (
            <ActionButton
              className={styles.button}
              primary
              type="submit"
              form={formId}
              disabled={
                pending ||
                !library.editable ||
                !name.trim() ||
                name.trim().length > 200 ||
                folder.trim().length > 100
              }
            >
              {pending ? "Saving…" : "Save"}
            </ActionButton>
          )}
        </div>
      }
    >
      <p>
        Save the section currently stored in this newsletter. Unsaved editor
        changes are not included.
      </p>
      <p>
        Stored section: <strong>{selected.sectionName}</strong>
      </p>
      {unknown ? (
        <p className={styles.notice} role="status">
          Save was not confirmed. The section may have been added to your saved
          sections. Viewing the list cannot confirm this request and will not
          repeat it.
        </p>
      ) : (
        <form
          id={formId}
          className={styles.details}
          onSubmit={(event) => {
            event.preventDefault();
            void library.submitSave(name, folder);
          }}
        >
          <h3>Section details</h3>
          <fieldset
            disabled={pending || !library.editable}
            className={styles.fields}
          >
            <Field label="Name" htmlFor={`${formId}-name`}>
              <TextInput
                id={`${formId}-name`}
                required
                maxLength={200}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field label="Folder" htmlFor={`${formId}-folder`}>
              <TextInput
                id={`${formId}-folder`}
                maxLength={100}
                value={folder}
                onChange={(event) => setFolder(event.target.value)}
              />
            </Field>
          </fieldset>
        </form>
      )}
    </Modal>
  );
}
