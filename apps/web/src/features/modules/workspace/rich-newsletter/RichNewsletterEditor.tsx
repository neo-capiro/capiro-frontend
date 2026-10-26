"use client";
import { useEffect, useRef, useState } from "react";
import {
  findNewsletterBlock,
  type NewsletterBlock,
  type NewsletterBlockKind,
  type NewsletterPreview,
} from "@capiro/shared/newsletter";
import {
  ActionButton,
  Field,
  PageHeader,
  TextInput,
} from "../../../../shared/module-ui";
import {
  addRichBlock,
  editRichBlock,
  editRichConfig,
  removeRichBlock,
  type RichDraft,
} from "./draft";
import { RichBlockControls } from "./RichBlockControls";
import { RichPreview, SavedRichPreview } from "./RichPreview";
import { RichStructure } from "./RichStructure";
import { RichDocumentActions } from "./RichDocumentActions";
import { useRichDocument } from "./use-rich-document";
import styles from "./rich-newsletter.module.css";

export function RichNewsletterEditor({ onClose }: { onClose: () => void }) {
  const { owner, state: history } = useRichDocument();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [plainText, setPlainText] = useState(false);
  const [closing, setClosing] = useState(false);
  const [previousOwner, setPreviousOwner] = useState(owner);
  const [dismissedPreview, setDismissedPreview] = useState<NewsletterPreview>();
  const previewButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const savedPreview =
    history.preview !== dismissedPreview ? history.preview : undefined;
  useEffect(() => {
    if (!savedPreview && returnFocus.current) {
      returnFocus.current = false;
      previewButton.current?.focus();
    }
  }, [savedPreview]);
  if (previousOwner !== owner) {
    setPreviousOwner(owner);
    setSelectedId(null);
    setMobile(false);
    setPlainText(false);
    setClosing(false);
    setDismissedPreview(undefined);
  }
  const draft = history.draft;
  const selected = selectedId
    ? findNewsletterBlock(draft.design, selectedId)
    : null;
  const commit = owner.edit;
  const update = (change: Partial<NewsletterBlock>) =>
    commit((current) => ({
      ...current,
      design: editRichBlock(current.design, selectedId!, (block) =>
        Object.assign(block, change),
      ),
    }));
  const add = (section: string, kind: NewsletterBlockKind) =>
    commit((current) => ({
      ...current,
      design: addRichBlock(current.design, section, kind).design,
    }));
  if (savedPreview)
    return (
      <section className={styles.screen}>
        <SavedRichPreview
          preview={savedPreview}
          name={
            history.saved?.id === savedPreview.documentId &&
            history.saved.revision === savedPreview.revision
              ? history.saved.name
              : undefined
          }
          onClose={() => {
            returnFocus.current = true;
            setDismissedPreview(savedPreview);
          }}
        />
      </section>
    );
  return (
    <section className={styles.screen}>
      <PageHeader
        title="Rich newsletter editor preview"
        description="Edit locally, then explicitly create or review a saved rich document. Submitted create/save requests remain in this browser for recovery; current saved content is reviewed separately. Collaboration and delivery remain unavailable."
        actions={
          <ActionButton
            disabled={Boolean(history.pending)}
            onClick={() => setClosing(true)}
          >
            Close preview
          </ActionButton>
        }
      />
      {closing && (
        <div role="alert" className={styles.notice}>
          <p>
            Leave this preview? Unsubmitted local edits will be discarded. A
            retained create/save request and its submitted edits remain
            available for recovery; leaving does not undo it.
          </p>
          <ActionButton disabled={Boolean(history.pending)} onClick={onClose}>
            Discard and leave
          </ActionButton>
          <ActionButton onClick={() => setClosing(false)}>
            Keep editing
          </ActionButton>
        </div>
      )}
      <RichDocumentActions
        state={history}
        owner={owner}
        previewButtonRef={previewButton}
      />
      <fieldset
        disabled={
          Boolean(history.pending) || history.recovery.phase !== "ready"
        }
        inert={Boolean(history.pending) || history.recovery.phase !== "ready"}
        className={styles.draftEditor}
      >
        <div className={styles.toolbar}>
          <ActionButton disabled={!history.past.length} onClick={owner.undo}>
            Undo
          </ActionButton>
          <ActionButton disabled={!history.future.length} onClick={owner.redo}>
            Redo
          </ActionButton>
          <ActionButton
            aria-pressed={mobile}
            onClick={() => setMobile((value) => !value)}
          >
            Mobile preview
          </ActionButton>
          <ActionButton
            aria-pressed={plainText}
            onClick={() => setPlainText((value) => !value)}
          >
            Plain text
          </ActionButton>
        </div>
        <CampaignFields draft={draft} change={commit} />
        <div className={styles.editor}>
          <RichStructure
            design={draft.design}
            selectedId={selectedId}
            select={setSelectedId}
            add={add}
          />
          <RichPreview draft={draft} mobile={mobile} plainText={plainText} />
          {selected ? (
            <RichBlockControls
              key={`${history.editorRevision}:${selected.id}`}
              block={selected}
              update={update}
              remove={() => {
                commit((current) => ({
                  ...current,
                  design: removeRichBlock(current.design, selected.id),
                }));
                setSelectedId(null);
              }}
            />
          ) : (
            <aside className={styles.controls}>
              <h2>Block settings</h2>
              <p>Select a block to edit its content and style.</p>
            </aside>
          )}
        </div>
      </fieldset>
    </section>
  );
}

function CampaignFields({
  draft,
  change,
}: {
  draft: RichDraft;
  change: (update: (draft: RichDraft) => RichDraft) => void;
}) {
  return (
    <div className={styles.fields}>
      <Field label="Newsletter name" htmlFor="rich-name">
        <TextInput
          id="rich-name"
          maxLength={200}
          value={draft.name}
          onChange={(event) =>
            change((current) => ({ ...current, name: event.target.value }))
          }
        />
      </Field>
      {(["subject", "previewText", "fromName", "replyTo"] as const).map(
        (key) => (
          <Field
            key={key}
            label={
              {
                subject: "Subject",
                previewText: "Preview text",
                fromName: "From name",
                replyTo: "Reply-to email",
              }[key]
            }
            htmlFor={`rich-${key}`}
          >
            <TextInput
              id={`rich-${key}`}
              value={draft.config[key]}
              onChange={(event) =>
                change((current) => ({
                  ...current,
                  config: editRichConfig(
                    current.config,
                    key,
                    event.target.value,
                  ),
                }))
              }
            />
          </Field>
        ),
      )}
    </div>
  );
}
