"use client";
import { ActionButton, UnavailableAction } from "../../../../shared/module-ui";
import {
  hasRichChanges,
  stageAttempt,
  type RichDocumentController,
  type RichDocumentState,
} from "./document-controller";
import { RichPreview, SavedRichPreview } from "./RichPreview";
import { pendingSavedWrite } from "./write-journal";
import styles from "./rich-newsletter.module.css";

export function RichDocumentActions({
  state,
  owner,
}: {
  state: RichDocumentState;
  owner: RichDocumentController;
}) {
  const ready =
    state.current &&
    Boolean(state.saved) &&
    !state.fence &&
    !pendingSavedWrite(state.writes, state.saved!.id);
  const attempted = stageAttempt(state);
  return (
    <section
      className={styles.controls}
      aria-label="Saved newsletter documents"
    >
      <h2>Saved newsletter documents</h2>
      <p>
        Loading the library or opening a document may activate an access
        invitation. These requests run only when you choose an action below.
        Library access does not imply that every document belongs to the
        selected client.
      </p>
      <fieldset
        disabled={Boolean(state.pending)}
        className={styles.lifecycleActions}
      >
        <div className={styles.toolbar}>
          <ActionButton onClick={() => void owner.list()}>
            Load saved newsletters
          </ActionButton>
          <ActionButton
            disabled={Boolean(
              state.saved || state.fence || state.writes.create,
            )}
            onClick={() => void owner.create()}
          >
            Create saved document
          </ActionButton>
          <ActionButton
            disabled={!state.saved}
            onClick={() => void owner.readback()}
          >
            Read current saved document
          </ActionButton>
          <ActionButton
            disabled={!ready || !hasRichChanges(state)}
            onClick={() => void owner.save()}
          >
            Save newsletter
          </ActionButton>
          <ActionButton disabled={!ready} onClick={() => void owner.preview()}>
            Preview saved state
          </ActionButton>
          <ActionButton
            disabled={!ready || hasRichChanges(state) || Boolean(attempted)}
            onClick={() => void owner.stage()}
          >
            Stage newsletter
          </ActionButton>
        </div>
        {state.items && (
          <div>
            <h3>Current library response</h3>
            {!state.items.length && (
              <p>
                No documents were returned. This does not establish the outcome
                of an uncertain creation.
              </p>
            )}
            <ul>
              {state.items.map((item) => (
                <li key={item.id}>
                  {item.name} · revision {item.revision} ·{" "}
                  {item.config.clientName ||
                    (item.config.clientId
                      ? "Assigned client"
                      : "No primary client")}
                  <ActionButton onClick={() => void owner.open(item.id)}>
                    Review {item.name}
                  </ActionButton>
                </li>
              ))}
            </ul>
          </div>
        )}
        {state.review && (
          <section aria-label="Review current saved newsletter">
            <h3>
              {state.review.name} · revision {state.review.revision}
            </h3>
            <p>Subject: {state.review.config.subject || "No subject"}</p>
            <p>
              Primary client:{" "}
              {state.review.config.clientName ||
                state.review.config.clientId ||
                "None"}
            </p>
            <p>
              This is current owner state, not proof that an earlier attempt
              created or saved it. Rebase keeps your complete local draft; the
              next save replaces the full name, configuration and design.
            </p>
            <ActionButton onClick={owner.adopt}>
              Adopt saved document and replace local draft
            </ActionButton>
            <ActionButton onClick={owner.rebase}>
              Rebase local draft onto reviewed revision
            </ActionButton>
            <RichPreview
              draft={state.review}
              mobile={false}
              plainText={false}
            />
          </section>
        )}
      </fieldset>
      {state.saved && (
        <p>
          {state.current
            ? "Current saved baseline"
            : "Previous saved baseline; current read and review required"}
          : {state.saved.name} · revision {state.saved.revision}.
          {hasRichChanges(state)
            ? " Local edits are unsaved."
            : " Local content matches this baseline."}
        </p>
      )}
      {state.pending && <p role="status">{state.pending} in progress…</p>}
      {state.writes.create && (
        <p role="alert">
          Creation remains uncertain. Reviewing and adopting a known document
          resumes work on that document; it cannot confirm the lost creation.
        </p>
      )}
      {(state.fence === "save" || state.fence === "conflict") && (
        <p role="alert">
          Saving remains blocked until a current owner read is explicitly
          adopted or used to rebase your local draft.
        </p>
      )}
      {state.error && <p role="alert">{state.error}</p>}
      {state.notice && <p role="status">{state.notice}</p>}
      {(attempted?.status === "unknown" || attempted?.status === "pending") && (
        <p role="alert">
          This saved revision has an uncertain stage attempt. Document readback
          cannot recover its missing stage ID; this revision will not be staged
          again here.
        </p>
      )}
      {attempted?.status === "confirmed" && (
        <p>
          This saved revision already has a confirmed stage attempt in this
          session and client scope.
        </p>
      )}
      {state.stage && (
        <div role="status">
          Stage {state.stage.id} received for document {state.stage.documentId},
          revision {state.stage.revision}.
          <p>
            Returned destination: <code>{state.stage.route}</code>. No
            destination was opened and nothing was prepared or sent.
          </p>
        </div>
      )}
      {state.preview && <SavedRichPreview preview={state.preview} />}
      <div className={styles.toolbar}>
        <UnavailableAction reason="Collaboration and asset operations are not included in this saved-document contract.">
          Collaboration and uploads
        </UnavailableAction>
        <UnavailableAction reason="Generation, account review, prepare, test and delivery require separate supported operations and explicit intent.">
          Generate or send newsletter
        </UnavailableAction>
      </div>
    </section>
  );
}
