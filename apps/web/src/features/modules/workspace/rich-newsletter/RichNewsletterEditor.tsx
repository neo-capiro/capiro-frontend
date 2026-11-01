"use client";
import { useEffect, useRef, useState } from "react";
import {
  findNewsletterBlock,
  type NewsletterBlock,
  type NewsletterPreview,
} from "@capiro/shared/newsletter";
import { ActionButton, Field, TextInput } from "../../../../shared/module-ui";
import {
  editRichBlock,
  editRichConfig,
  removeRichBlock,
  type RichDraft,
} from "./draft";
import { RichBlockControls } from "./RichBlockControls";
import { renderDraft } from "./RichPreview";
import { WorkspacePreview } from "./WorkspacePreview";
import { RichStructure } from "./RichStructure";
import {
  LayoutGrid,
  Layers,
  Paintbrush,
  Sparkles,
  Monitor,
  Smartphone,
  Undo2,
  Redo2,
  Eye,
  X,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import { NewsletterCanvas } from "./NewsletterCanvas";
import { WorkspacePalette } from "./WorkspacePalette";
import { WorkspaceSections } from "./WorkspaceSections";
import { PreviewLinks } from "./PreviewLinks";
import { newsletterPreviewLinks } from "./content/preview-links";
import { hasRichChanges } from "./document-controller";
import workspace from "./workspace.module.css";
import { RichDocumentActions } from "./RichDocumentActions";
import { NewsletterReview } from "./review/NewsletterReview";
import { useRichDocument } from "./use-rich-document";
import { useNewsletterLibrary } from "./library/use-newsletter-library";
import { SavedSections } from "./library/SavedSections";
import { SavedTemplates } from "./library/SavedTemplates";
import { LibraryDialog, LibraryNotice } from "./library/LibraryDialog";
import { changeStructure, type StructureAction } from "./content/structure";
import { AIColumnPresets } from "./providers/AIColumnPresets";
import { DesignStyles, SectionSettings } from "./content/DesignStyles";
import contentStyles from "./content/content.module.css";
import { useBrandKit } from "./brand/use-brand-kit";
import { BrandWorkspace } from "./brand/BrandWorkspace";
import { useSurveyDrafts } from "./surveys/use-survey-drafts";
import { SurveyWorkspace } from "./surveys/SurveyWorkspace";
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
  const brand = useBrandKit(owner);
  const surveys = useSurveyDrafts(owner, history.saved?.id);
  const [ownerEpoch, setOwnerEpoch] = useState(0);
  const library = useNewsletterLibrary(owner, history.saved?.id);
  const libraryOpener = useRef<HTMLButtonElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [rail, setRail] = useState("Blocks");
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [structureError, setStructureError] = useState("");
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
    setOwnerEpoch((value) => value + 1);
    setSelectedId(null);
    setSectionId(null);
    setRail("Blocks");
    setStructureError("");
    setMobile(false);
    setPlainText(false);
    setClosing(false);
    setLifecycleOpen(false);
    setDetailsOpen(false);
    setPreviewOpen(false);
    setDismissedPreview(undefined);
    setReviewId(undefined);
  }
  const draft = history.draft;
  const selected = selectedId
    ? findNewsletterBlock(draft.design, selectedId)
    : null;
  const selectedSection = draft.design.sections.find(
    (section) => section.id === sectionId,
  );
  const selectBlock = (id: string) => {
    setSelectedId(id);
    setSectionId(null);
    setRail("Blocks");
  };
  const commit = owner.edit;
  const update = (change: Partial<NewsletterBlock>) =>
    commit((current) => ({
      ...current,
      design: editRichBlock(current.design, selectedId!, (block) =>
        Object.assign(block, change),
      ),
    }));
  const structure = (action: StructureAction) => {
    setStructureError("");
    try {
      let selection: string | undefined;
      commit((current) => {
        const result = changeStructure(current.design, action);
        selection = result.selectedId;
        return { ...current, design: result.design };
      });
      if (selection) selectBlock(selection);
    } catch (error) {
      setStructureError(
        error instanceof Error
          ? error.message
          : "This structure change is unavailable.",
      );
    }
  };
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
  const editSection = (id: string) => {
    setSectionId(id);
    setSelectedId(null);
    setRail("Blocks");
  };
  const clearSelection = () => {
    setSelectedId(null);
    setSectionId(null);
  };
  const remove = (id: string) => {
    commit((current) => ({
      ...current,
      design: removeRichBlock(current.design, id),
    }));
    clearSelection();
  };
  const disabled =
    Boolean(history.pending) || history.recovery.phase !== "ready";
  const recoveryVisible = Boolean(
    history.error ||
    history.review ||
    history.fence ||
    history.recovery.phase !== "ready" ||
    history.writes.stages.some(
      (attempt) =>
        attempt.status === "unknown" &&
        attempt.documentId.toLowerCase() === history.saved?.id.toLowerCase(),
    ),
  );
  const available =
    !documentId || history.saved?.id.toLowerCase() === documentId.toLowerCase();
  const ai = (
    <AIColumnPresets
      key={`ai-columns:${ownerEpoch}`}
      expanded
      documentId={
        history.current && !history.fence ? history.saved?.id : undefined
      }
      design={draft.design}
      proposalScope={JSON.stringify([history.editorRevision, draft])}
      change={structure}
    />
  );
  return (
    <>
      <BrandWorkspace key={`brand:${ownerEpoch}`} kit={brand} owner={owner} />
      <SurveyWorkspace key={`surveys:${ownerEpoch}`} survey={surveys} />
      <div hidden={brand.open}>
        <section className={workspace.root} aria-label="Newsletter workspace">
          <header className={workspace.header}>
            <button
              aria-label="Back to Workspace"
              disabled={Boolean(history.pending)}
              onClick={() => setClosing(true)}
            >
              <ArrowLeft size={20} />
            </button>
            <div className={workspace.title}>
              <input
                aria-label="Newsletter name"
                value={draft.name}
                maxLength={200}
                disabled={disabled || !available}
                onChange={(event) =>
                  commit((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
              <span role="status">
                {history.pending
                  ? "Working…"
                  : history.recovery.phase !== "ready"
                    ? "Review saved request"
                    : history.saved
                      ? hasRichChanges(history)
                        ? "Unsaved changes"
                        : "Saved newsletter"
                      : "Local draft"}
              </span>
            </div>
            <div className={workspace.headerActions}>
              <button
                disabled={!available}
                onClick={() => {
                  setPreviewOpen(true);
                }}
              >
                <Eye size={16} />
                Preview
              </button>
              <button onClick={() => setLifecycleOpen(true)}>Save…</button>
              <details className={workspace.menu}>
                <summary>Actions ▾</summary>
                <div>
                  <button disabled={disabled} onClick={brand.enter}>
                    Brand Kit
                  </button>
                  <button
                    disabled={!history.saved || library.writing}
                    onClick={() => library.startSave()}
                  >
                    Save as a template
                  </button>
                  <button
                    disabled={disabled}
                    onClick={(event) => {
                      libraryOpener.current = event.currentTarget;
                      void library.browse("template");
                    }}
                  >
                    Change template
                  </button>
                  <button onClick={() => setDetailsOpen((value) => !value)}>
                    Newsletter details
                  </button>
                  <button
                    onClick={() => {
                      setPlainText(true);
                      setPreviewOpen(true);
                    }}
                  >
                    Plain-text version
                  </button>
                  <button disabled={!history.saved} onClick={surveys.enter}>
                    Survey drafts
                  </button>
                  <button onClick={() => setLifecycleOpen(true)}>
                    Saved documents and recovery
                  </button>
                </div>
              </details>
              <button
                className={workspace.primary}
                onClick={() => setLifecycleOpen(true)}
              >
                Stage in Outreach →
              </button>
            </div>
          </header>
          {closeNotice}
          {conversionCandidate && (
            <BasicConversionApply
              candidate={conversionCandidate}
              owner={owner}
              state={history}
            />
          )}
          <details
            className={workspace.lifecycle}
            open={lifecycleOpen || recoveryVisible}
            onToggle={(event) => {
              if (!recoveryVisible) setLifecycleOpen(event.currentTarget.open);
            }}
          >
            <summary>Saved documents and recovery</summary>
            <RichDocumentActions
              state={history}
              owner={owner}
              previewButtonRef={previewButton}
              commentsButtonRef={commentsButton}
              onReview={setReviewId}
              entryDocumentId={documentId}
            />
          </details>
          <LibraryNotice library={library} />
          {structureError && (
            <p role="alert" className={contentStyles.error}>
              {structureError}
            </p>
          )}
          {library.dialog && library.action && (
            <LibraryDialog library={library} />
          )}
          {detailsOpen && (
            <div className={workspace.details}>
              <CampaignFields
                draft={draft}
                change={commit}
                disabled={disabled}
              />
            </div>
          )}
          {(previewOpen || savedPreview) && (
            <WorkspacePreview
              key={
                savedPreview
                  ? `${savedPreview.documentId}:${savedPreview.revision}`
                  : "local"
              }
              draft={draft}
              saved={savedPreview}
              initialMode={
                plainText ? "Plain text" : mobile ? "Mobile" : "Desktop"
              }
              checkHtml={() => {
                setPreviewOpen(false);
                if (savedPreview) setDismissedPreview(savedPreview);
                setLifecycleOpen(true);
              }}
              close={() => {
                setPreviewOpen(false);
                if (savedPreview) {
                  returnFocus.current = true;
                  setDismissedPreview(savedPreview);
                }
              }}
              stage={() => {
                setPreviewOpen(false);
                if (savedPreview) setDismissedPreview(savedPreview);
                setLifecycleOpen(true);
              }}
            />
          )}
          {available && (
            <fieldset
              className={workspace.workbench}
              disabled={disabled}
              inert={disabled}
            >
              <nav className={workspace.rail} aria-label="Newsletter tools">
                {(
                  [
                    ["Blocks", LayoutGrid],
                    ["Sections", Layers],
                    ["Styles", Paintbrush],
                    ["Optimize", Sparkles],
                  ] as const
                ).map(([name, Icon]) => (
                  <button
                    key={name}
                    aria-pressed={rail === name}
                    onClick={() => {
                      setRail(name);
                      clearSelection();
                      library.closeBrowse();
                    }}
                  >
                    <Icon size={22} />
                    <span>{name}</span>
                  </button>
                ))}
              </nav>
              <aside
                className={workspace.sidebar}
                aria-label="Newsletter settings"
              >
                {library.browsing === "template" ? (
                  <SavedTemplates
                    library={library}
                    close={() => {
                      library.closeBrowse();
                      libraryOpener.current?.focus();
                    }}
                    apply={(item) => {
                      if (library.apply(item)) {
                        clearSelection();
                        setRail("Blocks");
                        libraryOpener.current?.focus();
                      }
                    }}
                  />
                ) : library.browsing === "section" && rail !== "Sections" ? (
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
                ) : rail === "Styles" ? (
                  <DesignStyles
                    design={draft.design}
                    change={(styles) =>
                      commit((current) => ({
                        ...current,
                        design: { ...current.design, styles },
                      }))
                    }
                  />
                ) : rail === "Optimize" ? (
                  <>
                    <h2>Optimize</h2>
                    <p className={workspace.muted}>
                      Review links and check your saved email before staging.
                    </p>
                    <PreviewLinks
                      links={newsletterPreviewLinks(renderDraft(draft))}
                    />
                    <button onClick={() => setLifecycleOpen(true)}>
                      Review saved HTML checks
                    </button>
                    <p>
                      Save and verify the newsletter before running a
                      compatibility check.
                    </p>
                  </>
                ) : rail === "Sections" ? (
                  <WorkspaceSections
                    design={draft.design}
                    change={structure}
                    edit={editSection}
                    save={library.startSave}
                    savedIds={
                      history.saved?.design.sections.map(
                        (section) => section.id,
                      ) ?? []
                    }
                    browse={(opener) => {
                      libraryOpener.current = opener;
                      void library.browse();
                    }}
                    saved={
                      <SavedSections
                        library={library}
                        close={() => {
                          library.closeBrowse();
                          setRail("Blocks");
                        }}
                        insert={(item) => {
                          library.insert(item);
                        }}
                      />
                    }
                    tree={
                      <RichStructure
                        design={draft.design}
                        selectedId={selectedId}
                        select={selectBlock}
                        change={structure}
                        editSection={editSection}
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
                    }
                  />
                ) : selected || selectedSection ? (
                  <>
                    <div className={workspace.panelBack}>
                      <button
                        aria-label="Back to blocks"
                        onClick={clearSelection}
                      >
                        <X size={20} />
                      </button>
                    </div>
                    {selectedSection ? (
                      <SectionSettings
                        key={selectedSection.id}
                        section={selectedSection}
                        change={(next) =>
                          commit((current) => ({
                            ...current,
                            design: {
                              ...current.design,
                              sections: current.design.sections.map(
                                (section) =>
                                  section.id === next.id ? next : section,
                              ),
                            },
                          }))
                        }
                      />
                    ) : (
                      selected && (
                        <RichBlockControls
                          key={`${history.editorRevision}:${selected.id}`}
                          block={selected}
                          documentId={
                            history.current && !history.fence
                              ? history.saved?.id
                              : undefined
                          }
                          design={draft.design}
                          structure={structure}
                          update={update}
                          remove={() => remove(selected.id)}
                        />
                      )
                    )}
                  </>
                ) : null}
                <div
                  hidden={Boolean(
                    library.browsing ||
                    rail !== "Blocks" ||
                    selected ||
                    selectedSection,
                  )}
                >
                  <WorkspacePalette
                    design={draft.design}
                    change={structure}
                    ai={ai}
                  />
                </div>
              </aside>
              <main className={workspace.canvasArea}>
                <div className={workspace.canvasTools}>
                  <div>
                    <button
                      aria-label="Desktop canvas"
                      aria-pressed={!mobile}
                      onClick={() => setMobile(false)}
                    >
                      <Monitor size={18} />
                    </button>
                    <button
                      aria-label="Mobile canvas"
                      aria-pressed={mobile}
                      onClick={() => setMobile(true)}
                    >
                      <Smartphone size={18} />
                    </button>
                    <button
                      aria-label="Undo"
                      disabled={!history.past.length}
                      onClick={owner.undo}
                    >
                      <Undo2 size={18} />
                    </button>
                    <button
                      aria-label="Redo"
                      disabled={!history.future.length}
                      onClick={owner.redo}
                    >
                      <Redo2 size={18} />
                    </button>
                  </div>
                  <div>
                    <button
                      disabled={!history.saved}
                      onClick={() =>
                        history.saved && setReviewId(history.saved.id)
                      }
                    >
                      <MessageSquare size={17} />
                      Comments
                    </button>
                    <button
                      onClick={() => {
                        setPreviewOpen(true);
                        setPlainText(false);
                      }}
                    >
                      <Eye size={17} />
                      Preview
                    </button>
                  </div>
                </div>
                <NewsletterCanvas
                  key={ownerEpoch}
                  draft={draft}
                  mobile={mobile}
                  selectedId={selected?.id ?? null}
                  actions={{
                    select: selectBlock,
                    editSection,
                    change: structure,
                    remove,
                  }}
                />
              </main>
            </fieldset>
          )}
        </section>
      </div>
    </>
  );
}

function CampaignFields({
  draft,
  change,
  disabled,
}: {
  draft: RichDraft;
  disabled: boolean;
  change: (update: (draft: RichDraft) => RichDraft) => void;
}) {
  return (
    <fieldset disabled={disabled} className={styles.fields}>
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
    </fieldset>
  );
}
