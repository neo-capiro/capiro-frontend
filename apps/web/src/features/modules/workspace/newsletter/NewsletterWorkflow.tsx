"use client";

import type {
  NewsletterBlock,
  NewsletterBody,
  WorkspaceDraftDocument,
} from "../../../../shared/capiro/operations/workspace-documents";
import {
  ActionButton,
  Badge,
  Field,
  Modal,
  Panel,
  SelectInput,
  TextInput,
  UnavailableAction,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
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
    <aside className={styles.newsletterTools}>
      <strong>Add content</strong>
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
      <p className={styles.footnote}>
        Images and links are reviewed before use.
      </p>
    </aside>
  );
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
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        className={styles.screen}
        data-design-node={
          step === "template"
            ? "976:190063"
            : step === "builder"
              ? "976:190222"
              : step === "review"
                ? "976:190381"
                : "976:190540"
        }
      >
        <nav className={styles.breadcrumb}>
          <button
            className={styles.link}
            onClick={() =>
              saved || step === "template" ? onClose() : setConfirmClose(true)
            }
          >
            Workspace
          </button>
          <span>/ {step === "template" ? "Create a newsletter" : title}</span>
        </nav>
        <header className={styles.heading}>
          <div>
            <h1>
              {step === "template"
                ? "Create a newsletter"
                : step === "review"
                  ? "Newsletter preview & review"
                  : step === "stage"
                    ? "Stage newsletter in Outreach"
                    : title}
            </h1>
            <p>
              {step === "template"
                ? "Select a starting point. Customize every section in the builder."
                : step === "stage"
                  ? "Select a saved revision and an existing Outreach session."
                  : "Newsletter builder"}
            </p>
          </div>
          {step !== "template" && (
            <div className={styles.actions}>
              {step === "builder" ? (
                <>
                  <ActionButton
                    disabled={pending || (saveOwner && !saveOwner.canSave)}
                    onClick={() => save(true)}
                  >
                    Save and exit
                  </ActionButton>
                  <ActionButton onClick={() => setStep("review")}>
                    Preview & review
                  </ActionButton>
                </>
              ) : (
                <ActionButton onClick={() => setStep("builder")}>
                  Edit newsletter
                </ActionButton>
              )}
              <ActionButton
                primary
                disabled={draft?.clientAssociation === "held"}
                onClick={() => setStep("stage")}
              >
                Stage in Outreach
              </ActionButton>
            </div>
          )}
        </header>
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
            <div className={styles.actions}>
              <Badge tone={saved ? "success" : "warning"}>
                {pending
                  ? "Saving…"
                  : saved
                    ? "All changes saved"
                    : "Unsaved changes"}
              </Badge>
              {step !== "stage" && (
                <>
                  <ActionButton
                    disabled={pending || (saveOwner && !saveOwner.canSave)}
                    onClick={() => save()}
                  >
                    Save draft
                  </ActionButton>
                  <ActionButton
                    onClick={() => setMobile(false)}
                    aria-pressed={!mobile}
                  >
                    Desktop
                  </ActionButton>
                  <ActionButton
                    onClick={() => setMobile(true)}
                    aria-pressed={mobile}
                  >
                    Mobile
                  </ActionButton>
                </>
              )}
            </div>
            {step === "builder" && (
              <>
                <div className={styles.grid}>
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
                  <Field label="Preview text" htmlFor="newsletter-preview-text">
                    <TextInput
                      id="newsletter-preview-text"
                      value={body.preview}
                      maxLength={500}
                      onChange={(event) =>
                        edit({ ...body, preview: event.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className={styles.actions}>
                  <ActionButton disabled={!history.length} onClick={undo}>
                    Undo
                  </ActionButton>
                  <ActionButton disabled={!future.length} onClick={redo}>
                    Redo
                  </ActionButton>
                </div>
                <div className={styles.newsletterGrid}>
                  <BuilderTools body={body} onChange={edit} />
                  <NewsletterPaper
                    body={body}
                    mobile={mobile}
                    editable
                    onChange={edit}
                  />
                  <aside className={styles.info}>
                    <h3>Newsletter settings</h3>
                    <div className={styles.form}>
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
                      <ActionButton onClick={() => setStep("template")}>
                        Change template
                      </ActionButton>
                      <UnavailableAction reason="Newsletter template publication does not have a verified backend contract.">
                        Save as a template
                      </UnavailableAction>
                    </div>
                  </aside>
                </div>
              </>
            )}
            {step === "review" && (
              <div className={styles.sponsorLayout}>
                <Panel>
                  <p>SUBJECT {body.subject || "Not set"}</p>
                  <p className={styles.footnote}>
                    PREVIEW {body.preview || "Not set"}
                  </p>
                  <NewsletterPaper body={body} mobile={mobile} />
                </Panel>
                <NewsletterComments documentId={documentId} />
              </div>
            )}
            {step === "stage" && (
              <Panel>
                <Badge tone={saved ? "success" : "warning"}>
                  {saved ? "Revision saved" : "Save required"}
                </Badge>
                <h2 style={{ marginTop: 20 }}>{title}</h2>
                <div className={styles.stageCards}>
                  <Panel title="Client">
                    {draft?.client ??
                      clients.data?.items.find((value) => value.id === clientId)
                        ?.name ??
                      "Firm"}
                  </Panel>
                  <Panel title="Status">
                    {saved ? "Draft saved" : "Unsaved changes"}
                  </Panel>
                  <Panel title="Delivery">Outreach</Panel>
                </div>
                {draft?.clientAssociation === "held" ? (
                  <p>Choose a client to continue.</p>
                ) : draft ? (
                  <NewsletterStaging draftId={draft.id} saved={saved} />
                ) : (
                  <p>
                    Save the newsletter before selecting a saved revision for
                    Outreach.
                  </p>
                )}
                <div className={styles.actions} style={{ marginTop: 20 }}>
                  <ActionButton onClick={() => setStep("builder")}>
                    Back to editor
                  </ActionButton>
                  {!saved && (
                    <ActionButton
                      primary
                      disabled={pending}
                      onClick={() => save()}
                    >
                      Save newsletter
                    </ActionButton>
                  )}
                </div>
              </Panel>
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
