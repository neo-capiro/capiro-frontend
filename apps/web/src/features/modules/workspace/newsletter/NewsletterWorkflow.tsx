"use client";

import { useState } from "react";

import type {
  NewsletterBlock,
  NewsletterBody,
  WorkspaceDraftDocument,
} from "../../../../shared/capiro/operations/workspace-documents";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
  Tabs,
  TextInput,
} from "../../../../shared/module-ui";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import styles from "../workspace.module.css";
import parity from "./newsletter-figma.module.css";
import { NewsletterComments } from "./NewsletterComments";
import { NewsletterPaper } from "./NewsletterPaper";
import { SelectTemplate } from "./NewsletterTemplates";
import { useNewsletter } from "./use-newsletter";
import { NewsletterStaging } from "./NewsletterStaging";
import { DraftClientAssociation } from "../DraftClientAssociation";
import { OrdinarySaveRecovery } from "../ordinary-save/OrdinaryDraftSave";
import {
  ExistingNewsletterSave,
  type NewsletterEditorProps,
} from "./ExistingNewsletterSave";
import { newsletterInput } from "./newsletter-atomic-save";
import {
  BasicConversionButton,
  type BasicConversionCandidate,
} from "./BasicConversion";
import { RichNewsletterEditor } from "../rich-newsletter/RichNewsletterEditor";

function BuilderTools({
  body,
  onChange,
}: {
  body: NewsletterBody;
  onChange: (body: NewsletterBody) => void;
}) {
  const kinds: NewsletterBlock["kind"][] = [
    "heading",
    "paragraph",
    "image",
    "button",
    "divider",
    "spacer",
    "social",
    "logo",
    "code",
  ];
  return (
    <aside className={parity.blockRail}>
      <p className={parity.blockRailTitle}>Add content</p>
      <p className={parity.blockLabel}>Blocks</p>
      <div className={parity.blockList}>
        {kinds.map((kind) => (
          <button
            key={kind}
            disabled={body.blocks.length >= 100}
            onClick={() =>
              onChange({
                ...body,
                blocks: [
                  ...body.blocks,
                  {
                    id: crypto.randomUUID(),
                    kind,
                    text: ["divider", "spacer"].includes(kind)
                      ? ""
                      : `New ${kind}`,
                    href: undefined,
                  },
                ],
              })
            }
          >
            {kind[0]!.toUpperCase() + kind.slice(1)}
          </button>
        ))}
        <button
          disabled={body.blocks.length >= 100}
          onClick={() =>
            onChange({
              ...body,
              blocks: [
                ...body.blocks,
                {
                  id: crypto.randomUUID(),
                  kind: "paragraph",
                  text: `Issue date: ${new Date().toISOString().slice(0, 10)}`,
                },
              ],
            })
          }
        >
          Issue date
        </button>
      </div>
    </aside>
  );
}

function stepDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

export function NewsletterWorkflow(props: NewsletterEditorProps) {
  return props.existing ? (
    <ExistingNewsletterSave
      {...props}
      existing={props.existing}
      editor={NewsletterEditor}
    />
  ) : (
    <NewsletterEditor {...props} />
  );
}
function NewsletterEditor({
  onClose,
  existing,
  initialClientId = "",
  saveOwner,
  onAtomicBound,
}: NewsletterEditorProps) {
  const [conversion, setConversion] = useState<BasicConversionCandidate>();
  const {
    step,
    setStep,
    clients,
    clientId,
    setClientId,
    title,
    setTitle,
    body,
    draft,
    saved,
    setSaved,
    mobile,
    setMobile,
    history,
    future,
    confirmClose,
    setConfirmClose,
    pending,
    error,
    edit,
    select,
    undo,
    redo,
    save,
    documentId,
    acceptClientAssociation,
  } = useNewsletter({
    onClose,
    existing,
    initialClientId,
    saveOwner,
    onAtomicBound,
  });
  const [commentView, setCommentView] = useState("open");
  const commentRead = useCapiroQuery(
    "workspace.comments",
    { params: { documentId: documentId ?? "" } },
    { enabled: step === "review" && Boolean(documentId) },
  );
  if (conversion)
    return (
      <RichNewsletterEditor
        conversionCandidate={conversion}
        onClose={() => setConversion(undefined)}
      />
    );
  const leave = () =>
    saved || step === "template" ? onClose() : setConfirmClose(true);
  const saveState = pending
    ? "Saving…"
    : saved
      ? "Changes saved"
      : "Unsaved changes";
  const crumbs = [
    "Modules",
    "Workspace",
    "Workflows",
    "Newsletter",
    step === "template"
      ? "Templates"
      : step === "review"
        ? "Newsletter · Review & delivery"
        : "Builder",
  ];
  return (
    <>
      {saveOwner && (
        <OrdinarySaveRecovery save={saveOwner}>
          {saveOwner.readback && (
            <NewsletterSavedContent draft={saveOwner.readback.draft} />
          )}
        </OrdinarySaveRecovery>
      )}
      <fieldset
        disabled={pending || saveOwner?.frozen}
        style={{ border: 0, padding: 0, minWidth: 0 }}
        className={parity.page}
        data-design-node={
          step === "template"
            ? "1064:260850"
            : step === "review"
              ? "1064:261027"
              : step === "stage"
                ? "1064:261084"
                : "1064:260936"
        }
      >
        <nav className={parity.breadcrumb} aria-label="Breadcrumb">
          {crumbs.map((crumb, index) => (
            <span
              key={crumb}
              style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
            >
              {index > 0 && <span aria-hidden>/</span>}
              {crumb === "Workspace" ? (
                <button className={parity.breadcrumbLink} onClick={leave}>
                  Workspace
                </button>
              ) : (
                <span>{crumb}</span>
              )}
            </span>
          ))}
        </nav>
        <header className={parity.heading}>
          <h1>
            {step === "template"
              ? "Select a template"
              : step === "review"
                ? "Newsletter review"
                : title}
          </h1>
          <p>
            {step === "template"
              ? "Create a client briefing that is ready to share."
              : step === "review"
                ? title
                : `${stepDate()} · ${saveState}`}
          </p>
        </header>
        <div className={parity.actionsBar}>
          <span className={parity.trailing} />
          {step === "template" ? (
            <>
              <ActionButton onClick={onClose}>Back to Workspace</ActionButton>
              <ActionButton primary onClick={() => select("blank")}>
                Start from scratch
              </ActionButton>
            </>
          ) : step === "review" ? (
            <>
              <ActionButton onClick={leave}>Workspace</ActionButton>
              <ActionButton onClick={() => setMobile(true)}>
                Mobile review
              </ActionButton>
              <ActionButton
                disabled={draft?.clientAssociation === "held"}
                onClick={() => setStep("stage")}
              >
                Stage in Outreach
              </ActionButton>
              <ActionButton primary onClick={() => setStep("builder")}>
                Edit newsletter
              </ActionButton>
            </>
          ) : (
            <>
              <ActionButton onClick={() => setStep("review")}>
                Preview
              </ActionButton>
              <ActionButton
                disabled={pending || (saveOwner && !saveOwner.canSave)}
                onClick={() => save()}
              >
                Save draft
              </ActionButton>
              <ActionButton
                disabled={pending || (saveOwner && !saveOwner.canSave)}
                onClick={() => save(true)}
              >
                Save and exit
              </ActionButton>
              <ActionButton
                primary
                disabled={draft?.clientAssociation === "held"}
                onClick={() => setStep("stage")}
              >
                Stage in Outreach
              </ActionButton>
            </>
          )}
        </div>
        {draft && (
          <DraftClientAssociation
            draft={draft}
            disabled={pending}
            onBound={acceptClientAssociation}
          />
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error.message}
          </p>
        )}
        {step === "template" ? (
          <SelectTemplate onSelect={select} />
        ) : (
          <>
            {(step === "builder" || step === "stage") && (
              <div className={parity.builderGrid}>
                <BuilderTools body={body} onChange={edit} />
                <div className={parity.canvasViewport}>
                  <div className={parity.canvasControls}>
                    <div className={parity.tabs}>
                      <Tabs
                        items={[
                          { id: "desktop", label: "Desktop" },
                          { id: "mobile", label: "Mobile" },
                        ]}
                        value={mobile ? "mobile" : "desktop"}
                        onChange={(value) => setMobile(value === "mobile")}
                        label="Preview width"
                        wrap
                      />
                    </div>
                    <ActionButton disabled={!history.length} onClick={undo}>
                      Undo
                    </ActionButton>
                    <ActionButton disabled={!future.length} onClick={redo}>
                      Redo
                    </ActionButton>
                  </div>
                  <div className={parity.emailCanvas}>
                    <NewsletterPaper
                      body={body}
                      mobile={mobile}
                      editable
                      onChange={edit}
                    />
                  </div>
                </div>
                <aside className={parity.inspector}>
                  <div className={parity.panel}>
                    <h3 className={parity.inspectorTitle}>
                      Newsletter settings
                    </h3>
                    <div className={parity.fields}>
                      <Field label="Subject" htmlFor="newsletter-subject">
                        <TextInput
                          id="newsletter-subject"
                          value={body.subject}
                          maxLength={400}
                          onChange={(event) =>
                            edit({ ...body, subject: event.target.value })
                          }
                        />
                      </Field>
                      <Field
                        label="Preview text"
                        htmlFor="newsletter-preview-text"
                      >
                        <TextInput
                          id="newsletter-preview-text"
                          value={body.preview}
                          maxLength={500}
                          onChange={(event) =>
                            edit({ ...body, preview: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="Document name" htmlFor="newsletter-title">
                        <TextInput
                          id="newsletter-title"
                          value={title}
                          maxLength={500}
                          onChange={(event) => {
                            setTitle(event.target.value);
                            setSaved(false);
                          }}
                        />
                      </Field>
                      <Field label="Client" htmlFor="newsletter-client">
                        <SelectInput
                          id="newsletter-client"
                          disabled={Boolean(draft)}
                          value={clientId}
                          onValueChange={setClientId}
                          options={[
                            { value: "", label: "Firm newsletter" },
                            ...(clients.data?.items ?? []).map((client) => ({
                              value: client.id,
                              label: client.name,
                            })),
                          ]}
                        />
                      </Field>
                      <Field label="Firm name" htmlFor="newsletter-firm">
                        <TextInput
                          id="newsletter-firm"
                          value={body.firmName}
                          maxLength={200}
                          onChange={(event) =>
                            edit({ ...body, firmName: event.target.value })
                          }
                        />
                      </Field>
                      <Field
                        label="Mailing address"
                        htmlFor="newsletter-address"
                      >
                        <TextInput
                          id="newsletter-address"
                          value={body.mailingAddress}
                          maxLength={500}
                          onChange={(event) =>
                            edit({
                              ...body,
                              mailingAddress: event.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>
                    <div className={parity.railActions}>
                      <ActionButton onClick={() => setStep("template")}>
                        Change template
                      </ActionButton>
                      <BasicConversionButton
                        name={title}
                        body={body}
                        clientId={clientId || null}
                        disabled={
                          pending ||
                          Boolean(saveOwner?.frozen) ||
                          draft?.clientAssociation === "held"
                        }
                        onReview={setConversion}
                      />
                    </div>
                    <p className={parity.panelHint}>
                      Recipients and sender are selected in Outreach.
                    </p>
                  </div>
                </aside>
              </div>
            )}
            {step === "review" && (
              <div className={parity.tabs}>
                <Tabs
                  items={[
                    {
                      id: "open",
                      label: `Open · ${(commentRead.data ?? []).filter((comment) => !comment.resolved).length}`,
                    },
                    {
                      id: "resolved",
                      label: `Resolved · ${(commentRead.data ?? []).filter((comment) => comment.resolved).length}`,
                    },
                  ]}
                  value={commentView}
                  onChange={setCommentView}
                  label="Comment status"
                  wrap
                />
              </div>
            )}
            {step === "review" && (
              <div className={parity.reviewGrid}>
                <div className={parity.previewColumn}>
                  <div className={parity.canvasControls}>
                    <div className={parity.tabs}>
                      <Tabs
                        items={[
                          { id: "desktop", label: "Desktop" },
                          { id: "mobile", label: "Mobile" },
                        ]}
                        value={mobile ? "mobile" : "desktop"}
                        onChange={(value) => setMobile(value === "mobile")}
                        label="Preview width"
                        wrap
                      />
                    </div>
                  </div>
                  <div className={parity.emailCanvas}>
                    <p>SUBJECT {body.subject || "Not set"}</p>
                    <p className={parity.footnote}>
                      PREVIEW {body.preview || "Not set"}
                    </p>
                    <NewsletterPaper body={body} mobile={mobile} />
                  </div>
                </div>
                <NewsletterComments
                  documentId={documentId}
                  view={commentView}
                  onViewChange={setCommentView}
                  query={commentRead}
                />
              </div>
            )}
          </>
        )}
        <Modal
          open={confirmClose}
          onOpenChange={setConfirmClose}
          title="Leave this newsletter?"
          description="Your unsaved edits will be lost."
          footer={
            <>
              <ActionButton onClick={() => setConfirmClose(false)}>
                Keep editing
              </ActionButton>
              <ActionButton primary onClick={onClose}>
                Discard unsaved edits
              </ActionButton>
            </>
          }
        >
          <p>Save the newsletter before closing to keep this revision.</p>
        </Modal>
      </fieldset>
      <NewsletterStaging
        draftId={draft?.id}
        saved={saved}
        title={title}
        clientName={
          (clients.data?.items ?? []).find((client) => client.id === clientId)
            ?.name ?? ""
        }
        open={step === "stage"}
        onClose={() => setStep("builder")}
        disabled={pending || Boolean(saveOwner?.frozen)}
      />
    </>
  );
}
function NewsletterSavedContent({ draft }: { draft: WorkspaceDraftDocument }) {
  let body: NewsletterBody;
  try {
    body = newsletterInput(draft).body;
  } catch {
    return (
      <p>
        The current saved body is not a supported basic newsletter. It cannot be
        adopted through this editor.
      </p>
    );
  }
  return (
    <>
      <h3>{body.subject || "No subject"}</h3>
      <p>{body.preview}</p>
      {body.blocks.map((block) => (
        <section key={block.id}>
          <strong>{block.kind}</strong>
          <p style={{ whiteSpace: "pre-wrap" }}>{block.text}</p>
          {block.href && <p>{block.href}</p>}
        </section>
      ))}
      <p>
        {body.firmName} · {body.mailingAddress}
      </p>
    </>
  );
}
