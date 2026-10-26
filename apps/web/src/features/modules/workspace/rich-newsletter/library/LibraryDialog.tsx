"use client";
import { useId, useState } from "react";
import { ActionButton, Field, Modal, TextInput } from "@/shared/module-ui";
import type { NewsletterLibrary } from "./use-newsletter-library";
import styles from "./sections.module.css";

export function LibraryDialog({ library }: { library: NewsletterLibrary }) {
  const selected = library.action!;
  const [name, setName] = useState(selected.name);
  const [folder, setFolder] = useState(selected.folder);
  const formId = useId();
  const pending = selected.phase === "pending";
  const unknown = selected.phase === "unknown";
  const deleting = selected.operation === "delete";
  const saving = selected.operation === "save";
  const kind = selected.collection;
  const title = `${saving ? "Save" : deleting ? "Delete" : "Rename/move"} ${kind}`;
  return (
    <Modal
      open={library.dialog}
      onOpenChange={(open) => {
        if (!open) library.closeDialog();
      }}
      title={title}
      description={
        saving
          ? `Reuse this ${kind} in a future newsletter.`
          : deleting
            ? `Remove this saved ${kind} from your library.`
            : `Update the saved ${kind} name and folder.`
      }
      className={styles.dialog}
      closeDisabled={pending}
      footer={
        <div className={styles.actions}>
          <ActionButton
            className={styles.button}
            disabled={pending}
            onClick={library.closeDialog}
          >
            {unknown ? "Close" : "Cancel"}
          </ActionButton>
          {unknown ? (
            <ActionButton
              className={styles.button}
              onClick={() => void library.browse(kind)}
            >
              View saved {kind}s
            </ActionButton>
          ) : (
            <ActionButton
              className={`${styles.button} ${deleting ? styles.destructive : ""}`}
              primary={!deleting}
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
              {pending
                ? deleting
                  ? "Deleting…"
                  : "Saving…"
                : deleting
                  ? `Delete ${kind}`
                  : "Save"}
            </ActionButton>
          )}
        </div>
      }
    >
      {saving ? (
        <>
          <p>
            {kind === "section"
              ? "Save the section currently stored in this newsletter."
              : "Save the full newsletter currently stored on the server as a template."}{" "}
            Unsaved editor changes are not included.
          </p>
          {selected.name && (
            <p>
              Stored {kind === "section" ? "section" : "newsletter"}:{" "}
              <strong>{selected.name}</strong>
            </p>
          )}
        </>
      ) : deleting ? (
        <p>
          Your existing newsletter drafts keep their current design. This
          removes only the saved library item.
        </p>
      ) : (
        <p>
          This changes library metadata only. It does not rename the current
          newsletter or change its content.
        </p>
      )}
      {unknown ? (
        <p className={styles.notice} role="status">
          {saving ? "Save" : deleting ? "Delete" : "Rename/move"} was not
          confirmed. The library may have changed. Viewing the list cannot
          confirm this request and will not repeat it.
        </p>
      ) : (
        <form
          id={formId}
          className={styles.details}
          onSubmit={(event) => {
            event.preventDefault();
            void library.submit(name, folder);
          }}
        >
          <h3>{kind === "section" ? "Section" : "Template"} details</h3>
          {deleting ? (
            <>
              <strong>{selected.name}</strong>
              <p>{selected.folder || "No folder"}</p>
            </>
          ) : (
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
          )}
        </form>
      )}
    </Modal>
  );
}

export function LibraryNotice({ library }: { library: NewsletterLibrary }) {
  const unknown = library.action?.phase === "unknown";
  if (library.dialog || (!unknown && !library.notice)) return null;
  const action = library.action;
  return (
    <div className={styles.notice} role="status">
      <p>
        {unknown
          ? `${action?.operation === "save" ? "Save" : action?.operation === "delete" ? "Delete" : "Rename/move"} was not confirmed. The library may have changed. This mounted view will not repeat that ${action?.operation === "save" ? "save" : "request"}.`
          : library.notice}
      </p>
      {unknown && (
        <ActionButton
          className={styles.button}
          onClick={() => void library.browse(action!.collection)}
        >
          View saved {action!.collection}s
        </ActionButton>
      )}
    </div>
  );
}
