"use client";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { NewsletterBody } from "../../../../shared/capiro/operations/workspace-documents";
import { useSelectedClient } from "../../../../shared/session/SelectedClient";
import { ActionButton, Modal } from "../../../../shared/module-ui";
import type { RichDraft } from "../rich-newsletter/draft";
import type {
  createRichDocumentController,
  RichDocumentState,
} from "../rich-newsletter/document-controller";
import { convertBasicNewsletter } from "./basic-rich-conversion";
import styles from "./basic-fidelity.module.css";
import libraryStyles from "../rich-newsletter/library/sections.module.css";

export type BasicConversionCandidate = {
  draft: RichDraft;
  identity: string;
};

export function BasicConversionButton({
  name,
  body,
  clientId,
  disabled,
  onReview,
}: {
  name: string;
  body: NewsletterBody;
  clientId: string | null;
  disabled: boolean;
  onReview: (candidate: BasicConversionCandidate) => void;
}) {
  const { userId, sessionId, orgId } = useAuth();
  const selected = useSelectedClient();
  const [open, setOpen] = useState(false);
  const result = open
    ? convertBasicNewsletter(name, body, clientId)
    : undefined;
  const currentClient =
    selected.state === "authorized-client" ? selected.client.id : null;
  const available =
    (selected.state === "authorized-client" ||
      selected.state === "no-selection") &&
    currentClient === clientId;
  return (
    <>
      <ActionButton disabled={disabled} onClick={() => setOpen(true)}>
        Convert to rich newsletter
      </ActionButton>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Review rich conversion"
        className={`${libraryStyles.dialog} ${styles.reviewModal}`}
        description="Review the current local newsletter before opening a separate rich draft."
        footer={
          <>
            <ActionButton onClick={() => setOpen(false)}>Cancel</ActionButton>
            <ActionButton
              primary
              disabled={disabled || !result?.draft || !available || !userId}
              onClick={() => {
                if (!result?.draft || disabled || !available || !userId) return;
                onReview({
                  draft: result.draft,
                  identity: JSON.stringify([userId, sessionId, orgId]),
                });
                setOpen(false);
              }}
            >
              Open rich editor
            </ActionButton>
          </>
        }
      >
        <div className={styles.review}>
          <div className={styles.summary}>
            <h3>{name}</h3>
            <p>Subject: {body.subject || "Not set"}</p>
            <p>{body.blocks.length} content blocks · Current local content</p>
          </div>
          <ul>
            {result?.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          {!!result?.issues.length && (
            <div role="alert">
              <h3>Resolve these items before converting</h3>
              <ul>
                {result.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
          {!available && (
            <p role="alert">
              Open this newsletter in its associated client context before
              converting. Firm newsletters require the General context.
            </p>
          )}
          <p>
            Review and apply in the rich editor, then explicitly save the rich
            document. Its saved content can use the existing rich template
            library.
          </p>
        </div>
      </Modal>
    </>
  );
}

/** A candidate is never adopted on mount or into a recovered/saved document. */
export function BasicConversionApply({
  candidate,
  owner,
  state,
}: {
  candidate: BasicConversionCandidate;
  owner: ReturnType<typeof createRichDocumentController>;
  state: RichDocumentState;
}) {
  const { userId, sessionId, orgId } = useAuth();
  const selected = useSelectedClient();
  const [appliedOwner, setAppliedOwner] = useState<typeof owner>();
  const currentClient =
    selected.state === "authorized-client" ? selected.client.id : null;
  const available =
    (selected.state === "authorized-client" ||
      selected.state === "no-selection") &&
    currentClient === candidate.draft.config.clientId &&
    Boolean(userId) &&
    JSON.stringify([userId, sessionId, orgId]) === candidate.identity;
  const canApply =
    available &&
    !state.pending &&
    !state.saved &&
    !state.review &&
    !state.fence &&
    state.recovery.phase === "ready" &&
    appliedOwner !== owner;
  return (
    <section className={styles.apply} aria-label="Converted basic newsletter">
      <strong>
        {appliedOwner === owner
          ? "Converted draft applied locally"
          : "Apply converted basic newsletter"}
      </strong>
      <p>
        {appliedOwner === owner
          ? "Review the rich preview and save explicitly. Undo restores the previous local rich draft. Your basic newsletter is unchanged."
          : "Applying replaces only this local rich draft and keeps its undo history. A saved document or retained write must be resolved separately."}
      </p>
      {!available && (
        <p role="alert">
          This conversion is unavailable in the current session or client
          context. Return to the basic newsletter.
        </p>
      )}
      <ActionButton
        disabled={!canApply}
        onClick={() => {
          const current = owner.getSnapshot();
          if (!canApply || current !== state) return;
          owner.edit(() => structuredClone(candidate.draft));
          setAppliedOwner(owner);
        }}
      >
        Apply converted draft
      </ActionButton>
    </section>
  );
}
