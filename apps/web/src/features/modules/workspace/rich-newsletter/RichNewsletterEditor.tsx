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
import { NewsletterReview } from "./review/NewsletterReview";
import { useRichDocument } from "./use-rich-document";
import { useNewsletterLibrary } from "./library/use-newsletter-library";
import { SavedSections } from "./library/SavedSections";
import { SavedTemplates } from "./library/SavedTemplates";
import { LibraryDialog, LibraryNotice } from "./library/LibraryDialog";
import libraryStyles from "./library/sections.module.css";
import styles from "./rich-newsletter.module.css";
import {
  BasicConversionApply,
  type BasicConversionCandidate,
} from "../newsletter/BasicConversion";

export function RichNewsletterEditor({
  onClose,
  documentId,
  conversionCandidate,
}: {
  onClose: () => void;
  documentId?: string;
  conversionCandidate?: BasicConversionCandidate;
}) {
  const { owner, state: history } = useRichDocument();
  const library = useNewsletterLibrary(owner, history.saved?.id);
  const libraryOpener = useRef<HTMLButtonElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [plainText, setPlainText] = useState(false);
  const [closing, setClosing] = useState(false);
  const [previousOwner, setPreviousOwner] = useState(owner);
  const [dismissedPreview, setDismissedPreview] = useState<NewsletterPreview>();
  const previewButton = useRef<HTMLButtonElement>(null);
  const commentsButton = useRef<HTMLButtonElement>(null);
  const [reviewId, setReviewId] = useState<string>();
  const initialRead = useRef<{ owner: typeof owner; id: string } | undefined>(
    undefined,
  );
  const commentsReturnFocus = useRef(false);
  const returnFocus = useRef(false);
  const savedPreview =
    history.preview !== dismissedPreview ? history.preview : undefined;
  useEffect(() => {
    if (!savedPreview && returnFocus.current) {
      returnFocus.current = false;
      previewButton.current?.focus();
    }
  }, [savedPreview]);
  useEffect(() => {
    if (
      !documentId ||
      history.pending ||
      history.recovery.phase === "loading" ||
      (initialRead.current?.owner === owner &&
        initialRead.current.id === documentId)
    )
      return;
    initialRead.current = { owner, id: documentId };
    void owner.openKnown(documentId);
  }, [documentId, owner, history.pending, history.recovery.phase]);
  useEffect(() => {
    if (!reviewId && !history.pending && commentsReturnFocus.current) {
      commentsReturnFocus.current = false;
      commentsButton.current?.focus();
    }
  }, [reviewId, history.pending]);
  if (previousOwner !== owner) {
    setPreviousOwner(owner);
    setSelectedId(null);
    setMobile(false);
    setPlainText(false);
    setClosing(false);
    setDismissedPreview(undefined);
    setReviewId(undefined);
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
  const closeNotice = closing && (
    <div role="alert" className={styles.notice}>
      <p>
        Leave this preview? Unsubmitted local edits will be discarded. A
        retained create/save request and its submitted edits remain available
        for recovery; leaving does not undo it.
      </p>
      <ActionButton disabled={Boolean(history.pending)} onClick={onClose}>
        Discard and leave
      </ActionButton>
      <ActionButton onClick={() => setClosing(false)}>
        Keep editing
      </ActionButton>
    </div>
  );
  if (reviewId)
    return (
      <>
        <NewsletterReview
          documentId={reviewId}
          onClose={() => setClosing(true)}
          onEditableAccessLost={owner.clearEditableAccess}
          onEdit={(id) => {
            // Keep the local draft/undo stack. The existing current-detail review
            // and explicit adopt/rebase actions remain the only editable admission.
            void owner.openKnown(id);
            commentsReturnFocus.current = true;
            setReviewId(undefined);
          }}
        />
        {closeNotice}
      </>
    );
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
        description="Edit locally, then explicitly create or review a saved rich document. Submitted create/save requests remain in this browser for recovery; current saved content is reviewed separately. Comments opens a saved-content review; comment writing, sharing changes and delivery remain unavailable."
        actions={
          <ActionButton
            disabled={Boolean(history.pending)}
            onClick={() => setClosing(true)}
          >
            Close preview
          </ActionButton>
        }
      />
      {closeNotice}
      {conversionCandidate && (
        <BasicConversionApply
          candidate={conversionCandidate}
          owner={owner}
          state={history}
        />
      )}
      <RichDocumentActions
        state={history}
        owner={owner}
        previewButtonRef={previewButton}
        commentsButtonRef={commentsButton}
        onReview={setReviewId}
        entryDocumentId={documentId}
      />
      <LibraryNotice library={library} />
      {library.dialog && library.action && <LibraryDialog library={library} />}
      {(!documentId ||
        history.saved?.id.toLowerCase() === documentId.toLowerCase()) && (
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
            <ActionButton
              disabled={!history.future.length}
              onClick={owner.redo}
            >
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
            <ActionButton
              className={libraryStyles.button}
              onClick={(event) => {
                libraryOpener.current = event.currentTarget;
                void library.browse("template");
              }}
            >
              Saved templates
            </ActionButton>
            <ActionButton
              className={libraryStyles.button}
              disabled={!history.saved || library.writing}
              onClick={() => library.startSave()}
            >
              Save current server newsletter as template
            </ActionButton>
          </div>
          {library.browsing === "template" ? (
            <SavedTemplates
              library={library}
              close={() => {
                library.closeBrowse();
                libraryOpener.current?.focus();
              }}
              apply={(item) => {
                if (library.apply(item)) {
                  setSelectedId(null);
                  libraryOpener.current?.focus();
                }
              }}
            />
          ) : (
            <>
              <CampaignFields draft={draft} change={commit} />
              <div
                className={`${styles.editor} ${library.browsing === "section" ? libraryStyles.libraryLayout : ""}`}
              >
                <RichStructure
                  design={draft.design}
                  selectedId={selectedId}
                  select={setSelectedId}
                  add={add}
                  savedSectionIds={
                    history.saved?.design.sections.map(
                      (section) => section.id,
                    ) ?? []
                  }
                  saveSection={library.startSave}
                  browse={(opener) => {
                    libraryOpener.current = opener;
                    void library.browse();
                  }}
                />
                <RichPreview
                  draft={draft}
                  mobile={mobile}
                  plainText={plainText}
                />
                {library.browsing === "section" ? (
                  <SavedSections
                    library={library}
                    close={() => {
                      library.closeBrowse();
                      libraryOpener.current?.focus();
                    }}
                    insert={(item) => {
                      if (library.insert(item)) libraryOpener.current?.focus();
                    }}
                  />
                ) : selected ? (
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
            </>
          )}
        </fieldset>
      )}
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
