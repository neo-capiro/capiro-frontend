"use client";
import type { Ref } from "react";
import { ActionButton, UnavailableAction } from "../../../../shared/module-ui";
import {
  hasRichChanges,
  stageAttempt,
  type RichDocumentController,
  type RichDocumentState,
} from "./document-controller";
import { RichPreview } from "./RichPreview";
import { pendingSavedWrite } from "./write-journal";
import styles from "./rich-newsletter.module.css";

export function RichDocumentActions({
  state,
  owner,
  previewButtonRef,
}: {
  state: RichDocumentState;
  owner: RichDocumentController;
  previewButtonRef?: Ref<HTMLButtonElement>;
}) {
  const ready =
    state.current &&
    Boolean(state.saved) &&
    !state.fence &&
    !pendingSavedWrite(state.writes, state.saved!.id);
  const attempted = stageAttempt(state);
  const uncertainStages = state.writes.stages.filter(
    (entry) =>
      entry.status === "unknown" &&
      entry.documentId.toLowerCase() === state.saved?.id.toLowerCase(),
  );
  return (
    <section
      className={styles.savedActions}
      aria-label="Saved newsletter documents"
    >
      <header>
        <h2>Saved newsletter documents</h2>
        <p>
          Loading or opening saved newsletters may activate an access
          invitation. Each document keeps its own client access.
        </p>
      </header>
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
          <ActionButton
            ref={previewButtonRef}
            disabled={!ready}
            onClick={() => void owner.preview()}
          >
            Preview saved state
          </ActionButton>
          <ActionButton
            disabled={!ready || hasRichChanges(state) || Boolean(attempted)}
            onClick={() => void owner.stage()}
          >
            Stage newsletter
          </ActionButton>
        </div>
        {uncertainStages.map((entry) => (
          <div className={styles.savedNotice} key={entry.attempt}>
            <p>
              Stage outcome for revision {entry.revision} remains uncertain.
              This revision will not be staged again. Checking reads only that
              exact revision and does not adopt it as your editable baseline.
            </p>
            <ActionButton
              onClick={() => void owner.recoverStage(entry.attempt)}
            >
              Check stage for revision {entry.revision}
            </ActionButton>
          </div>
        ))}
        {state.items && (
          <div className={styles.savedCard}>
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
          <section
            className={styles.savedCard}
            aria-label="Review current saved newsletter"
          >
            <h3>
              {state.review.name} · revision {state.review.revision}
            </h3>
            <p>Subject: {state.review.config.subject || "No subject"}</p>
            <p>
              Primary client:{" "}
              {state.review.config.clientName ||
                (state.review.config.clientId ? "Assigned client" : null) ||
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
            <details>
              <summary>Review saved content</summary>
              <RichPreview
                draft={state.review}
                mobile={false}
                plainText={false}
                savedReview
              />
            </details>
          </section>
        )}
      </fieldset>
      {state.saved && (
        <p className={styles.savedBaseline}>
          {state.current
            ? "Current saved baseline"
            : "Previous saved baseline; current read and review required"}
          : {state.saved.name} · revision {state.saved.revision}.
          {hasRichChanges(state)
            ? " Local edits are unsaved."
            : " Local content matches this baseline."}
        </p>
      )}
      {state.pending && (
        <p role="status">
          {state.pending === "recoverStage" ? "Stage lookup" : state.pending} in
          progress…
        </p>
      )}
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
          This saved revision has an uncertain stage attempt; this revision will
          not be staged again here.
        </p>
      )}
      {attempted?.status === "confirmed" && (
        <p>
          This saved revision already has a confirmed stage record in this
          session and client scope.
        </p>
      )}
      {state.stage && (
        <div className={styles.savedCard} role="status">
          <h3>Saved revision {state.stage.revision} staged</h3>
          <p>
            The saved stage record confirms this revision. No destination was
            opened and nothing was prepared or sent.
          </p>
        </div>
      )}
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
