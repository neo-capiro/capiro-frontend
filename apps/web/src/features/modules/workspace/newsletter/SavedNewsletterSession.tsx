"use client";
import { useState } from "react";
import type {
  NewsletterBody,
  WorkspaceDraftDocument,
} from "@/shared/capiro/operations/workspace-documents";
import { useCapiroQuery } from "@/shared/capiro/queries";
import { ActionButton, Modal } from "@/shared/module-ui";
import {
  NewsletterWorkspace,
  NewsletterWorkbench,
} from "../rich-newsletter/NewsletterWorkspace";
import { DraftClientAssociation } from "../DraftClientAssociation";
import { OrdinarySaveRecovery } from "../ordinary-save/OrdinaryDraftSave";
import type { NewsletterEditorProps } from "./ExistingNewsletterSave";
import {
  newsletterInput,
  newsletterMatchesSaved,
} from "./newsletter-atomic-save";
import { NewsletterPaper } from "./NewsletterPaper";
import { SavedNewsletterPanel } from "./SavedNewsletterPanel";
import { NewsletterComments } from "./NewsletterComments";
import { NewsletterStaging } from "./NewsletterStaging";
import workspace from "../rich-newsletter/workspace.module.css";
import { RichNewsletterSession } from "../rich-newsletter/RichNewsletterSession";
import type { BasicConversionCandidate } from "./BasicConversion";

/** Compatibility session only: editing the original body never creates a rich campaign. */
export function SavedNewsletterSession({
  existing,
  onClose,
  saveOwner,
  onAtomicBound,
}: NewsletterEditorProps) {
  const [rail, setRail] = useState("Blocks");
  const [conversion, setConversion] = useState<BasicConversionCandidate>();
  const [selectedId, select] = useState<string>();
  const [details, setDetails] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [preview, setPreview] = useState(false);
  const [comments, setComments] = useState(false);
  const [stage, setStage] = useState(false);
  const [closing, setClosing] = useState(false);
  const [commentView, setCommentView] = useState("open");
  const [past, setPast] = useState<NewsletterBody[]>([]);
  const [future, setFuture] = useState<NewsletterBody[]>([]);
  const input = saveOwner?.input;
  const draft = saveOwner?.currentDraft ?? existing;
  const commentRead = useCapiroQuery(
    "workspace.comments",
    { params: { documentId: input?.documentId ?? "" } },
    { enabled: comments && Boolean(input?.documentId) },
  );
  const recovery = saveOwner && (
    <OrdinarySaveRecovery save={saveOwner}>
      {saveOwner.readback && <SavedContent draft={saveOwner.readback.draft} />}
    </OrdinarySaveRecovery>
  );
  if (!saveOwner || !input)
    return (
      <>
        {recovery}
        <p role="status">
          Read and review the saved newsletter before editing.
        </p>
        <ActionButton onClick={onClose}>Back to Workspace</ActionButton>
      </>
    );
  const disabled = Boolean(saveOwner.pending) || saveOwner.frozen;
  const saved = newsletterMatchesSaved(saveOwner);
  const edit = (body: NewsletterBody) => {
    if (disabled) return;
    setPast((values) => [...values.slice(-49), input.body]);
    setFuture([]);
    saveOwner.setInput({ ...input, body });
  };
  const undo = () => {
    const prior = past.at(-1);
    if (!prior || disabled) return;
    setFuture((values) => [...values, input.body]);
    setPast((values) => values.slice(0, -1));
    saveOwner.setInput({ ...input, body: prior });
  };
  const redo = () => {
    const next = future.at(-1);
    if (!next || disabled) return;
    setPast((values) => [...values, input.body]);
    setFuture((values) => values.slice(0, -1));
    saveOwner.setInput({ ...input, body: next });
  };
  // Keep the original atomic owner and its unsaved input mounted during a
  // separately reviewed rich copy. Returning never reloads or replaces it.
  if (conversion)
    return (
      <RichNewsletterSession
        conversionCandidate={conversion}
        onClose={() => setConversion(undefined)}
      />
    );
  return (
    <>
      <NewsletterWorkspace
        name={input.title}
        nameLimit={500}
        rename={
          disabled
            ? undefined
            : (title) => saveOwner.setInput({ ...input, title })
        }
        status={
          saveOwner.pending
            ? "Saving…"
            : saved
              ? "Changes saved"
              : "Unsaved changes"
        }
        close={() => (saved ? onClose() : setClosing(true))}
        closingDisabled={Boolean(saveOwner.pending)}
        actions={
          <>
            <button onClick={() => setPreview(true)}>Preview</button>
            <button
              disabled={!saveOwner.canSave || disabled}
              onClick={() => void saveOwner.save()}
            >
              Save draft
            </button>
            <details className={workspace.menu}>
              <summary>Actions ▾</summary>
              <div>
                <button
                  onClick={() => {
                    setDetails(true);
                    select(undefined);
                  }}
                >
                  Newsletter details
                </button>
                <button
                  disabled={!saveOwner.canSave || disabled}
                  onClick={async () => {
                    if (await saveOwner.save()) onClose();
                  }}
                >
                  Save and exit
                </button>
              </div>
            </details>
            <button
              className={workspace.primary}
              aria-label="Stage in Outreach"
              disabled={disabled || draft.clientAssociation === "held"}
              onClick={() => setStage(true)}
            >
              Stage in Outreach →
            </button>
          </>
        }
      >
        {recovery}
        <DraftClientAssociation
          draft={draft}
          disabled={disabled}
          onBound={(bound) => {
            if (
              bound.id === draft.id &&
              bound.clientId &&
              bound.clientAssociation !== "held"
            )
              onAtomicBound?.(bound);
          }}
        />
        <NewsletterWorkbench
          disabled={disabled}
          rail={rail}
          selectRail={(next) => {
            setRail(next);
            select(undefined);
            setDetails(false);
          }}
          mobile={mobile}
          setMobile={setMobile}
          undo={past.length ? undo : undefined}
          redo={future.length ? redo : undefined}
          preview={() => setPreview(true)}
          comments={() => setComments(true)}
          sidebar={
            <SavedNewsletterPanel
              body={input.body}
              edit={edit}
              rail={rail}
              selectedId={selectedId}
              select={(id) => {
                select(id);
                setRail("Blocks");
              }}
              details={details}
              closeDetails={() => setDetails(false)}
              name={input.title}
              clientId={draft.clientId ?? null}
              onConvert={setConversion}
              conversionDisabled={
                disabled || draft.clientAssociation === "held"
              }
            />
          }
        >
          <div className={workspace.canvasScroll}>
            <NewsletterPaper
              body={input.body}
              mobile={mobile}
              selectedId={selectedId}
              select={(id) => {
                select(id);
                setDetails(false);
                setRail("Blocks");
              }}
            />
          </div>
        </NewsletterWorkbench>
      </NewsletterWorkspace>
      <Modal
        open={preview}
        onOpenChange={setPreview}
        title="Newsletter preview"
      >
        <p>Subject: {input.body.subject || "Not set"}</p>
        <p>Preview text: {input.body.preview || "Not set"}</p>
        <NewsletterPaper body={input.body} mobile={mobile} />
      </Modal>
      <Modal
        open={comments}
        onOpenChange={setComments}
        title="Newsletter comments"
      >
        <NewsletterComments
          documentId={input.documentId}
          view={commentView}
          onViewChange={setCommentView}
          query={commentRead}
        />
      </Modal>
      <Modal
        open={closing}
        onOpenChange={setClosing}
        title="Leave this newsletter?"
        description="Your unsaved edits will be lost."
        footer={
          <>
            <ActionButton onClick={() => setClosing(false)}>
              Keep editing
            </ActionButton>
            <ActionButton onClick={onClose}>Discard unsaved edits</ActionButton>
          </>
        }
      >
        <p>
          Save the newsletter before closing to keep this revision. Retained
          save requests remain available for recovery.
        </p>
      </Modal>
      {draft.clientAssociation !== "held" && (
        <NewsletterStaging
          draftId={draft.id}
          saved={saved}
          title={input.title}
          open={stage}
          onClose={() => setStage(false)}
          disabled={disabled}
        />
      )}
    </>
  );
}

function SavedContent({ draft }: { draft: WorkspaceDraftDocument }) {
  let body: NewsletterBody;
  try {
    body = newsletterInput(draft).body;
  } catch (error) {
    return (
      <p role="alert">
        {error instanceof Error ? error.message : "Saved content unavailable."}
      </p>
    );
  }
  return (
    <>
      <h3>{draft.docTitle}</h3>
      <p>{body.subject}</p>
      <p>{body.preview}</p>
      <NewsletterPaper body={body} />
    </>
  );
}
