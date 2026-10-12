"use client";

import { useState } from "react";
import type { WorkspaceDraftDocument } from "../../../shared/capiro/operations/workspace-documents";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  Panel,
  StatusPanel,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import {
  manualDraftInput,
  assertProspectDraft,
} from "./prospects/manual-draft";
import { useProspectDraftSave } from "./prospects/useProspectDraftSave";
import { ProspectDraftExport } from "./prospects/ProspectDraftExport";
import { NewsletterWorkflow } from "./newsletter/NewsletterWorkflow";
import styles from "./workspace.module.css";

function DraftEditor({
  draft,
  onClose,
  reload,
}: {
  draft: WorkspaceDraftDocument;
  onClose: () => void;
  reload: () => void;
}) {
  const prospectSave = useProspectDraftSave(draft, reload);
  const initial = prospectSave.retained?.input ?? manualDraftInput(draft);
  const [title, setTitle] = useState(initial.title);
  const [sections, setSections] = useState(initial.sections);
  const names = initial.names;
  const [history, setHistory] = useState(false);
  const update = useCapiroMutation("workspace.draft.update");
  const snapshot = useCapiroMutation("workspace.draft.snapshot");
  const versions = useCapiroQuery(
    "workspace.draft.versions",
    { params: { draftId: draft.id } },
    { enabled: history },
  );
  async function save() {
    if (draft.prospectId) {
      await prospectSave.save({ title, sections, names });
      return;
    }
    try {
      await update.run({
        params: { id: draft.id },
        body: { docTitle: title, config: { sectionContent: sections } },
      });
      await snapshot.run({
        params: { draftId: draft.id },
        body: { label: "Manual save" },
      });
      reload();
    } catch {
      /* Server error remains visible. */
    }
  }
  return (
    <section className={styles.screen}>
      <header className={styles.heading}>
        <div>
          <ActionButton onClick={onClose}>← Workspace</ActionButton>
          <h1>{draft.docTitle}</h1>
          <p>
            {draft.product ?? "Document"} · {draft.client ?? "Firm"}
          </p>
        </div>
        <div className={styles.actions}>
          <ActionButton onClick={() => setHistory(true)}>History</ActionButton>
          <ActionButton
            primary
            disabled={
              update.pending ||
              snapshot.pending ||
              prospectSave.pending ||
              Boolean(prospectSave.retained?.uncertain) ||
              !title.trim()
            }
            onClick={save}
          >
            Save draft
          </ActionButton>
        </div>
      </header>
      {draft.prospectId && (
        <>
          <p>
            Immutable prospect origin: {draft.prospectId}. Manual edits only.
          </p>
          {prospectSave.error && <p role="alert">{prospectSave.error}</p>}
          {prospectSave.readback && (
            <details>
              <summary>Current saved content</summary>
              <h2>{prospectSave.readback.docTitle}</h2>
              {Object.entries(
                prospectSave.readback.config.sectionContent ?? {},
              ).map(([name, content]) => (
                <section key={name}>
                  <h3>{name}</h3>
                  <p style={{ whiteSpace: "pre-wrap" }}>{content}</p>
                </section>
              ))}
            </details>
          )}
          {prospectSave.message && <p role="status">{prospectSave.message}</p>}
          {prospectSave.retained?.uncertain && (
            <p role="status">
              The previous save is not confirmed. No automatic retry will run.
              Read current document before another save.
            </p>
          )}
          <ActionButton
            disabled={prospectSave.pending}
            onClick={() => void prospectSave.readCurrent()}
          >
            Read current document
          </ActionButton>
          <ProspectDraftExport
            scope={{
              id: draft.id,
              tenantId: draft.tenantId!,
              prospectId: draft.prospectId,
            }}
            disabled={
              prospectSave.pending || Boolean(prospectSave.retained?.uncertain)
            }
          />
        </>
      )}
      {(update.error || snapshot.error) && (
        <p role="alert" className={styles.error}>
          {(update.error ?? snapshot.error)?.message}
        </p>
      )}
      <Field label="Document title" htmlFor="workspace-document-title">
        <TextInput
          id="workspace-document-title"
          value={title}
          maxLength={500}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      {names.length ? (
        names.map((name) => (
          <Panel key={name} title={name}>
            <TextArea
              aria-label={`${name} content`}
              value={sections[name] ?? ""}
              onChange={(event) =>
                setSections((previous) => ({
                  ...previous,
                  [name]: event.target.value,
                }))
              }
            />
          </Panel>
        ))
      ) : (
        <Panel title="Document contents">
          {draft.documents.map((document) => (
            <article key={document.id}>
              <h3>{document.name}</h3>
              {document.body.blocks?.map((block) => (
                <p key={block.id}>
                  {block.content ?? block.title ?? block.type}
                </p>
              ))}
            </article>
          ))}
        </Panel>
      )}
      <Modal open={history} onOpenChange={setHistory} title="Document history">
        <StatusPanel
          loading={versions.loading}
          error={
            versions.error ??
            (versions.data?.some((version) => version.draftId !== draft.id)
              ? new Error("History belongs to another document.")
              : undefined)
          }
          onRetry={versions.reload}
        >
          <div className={styles.form}>
            {versions.data?.map((version) => (
              <p key={version.id}>
                <strong>{version.label ?? "Saved version"}</strong>
                <span className={styles.secondary}>
                  {new Date(version.createdAt).toLocaleString()} ·{" "}
                  {version.authorKind}
                </span>
              </p>
            ))}
          </div>
        </StatusPanel>
      </Modal>
    </section>
  );
}

export function WorkspaceDraft({
  id,
  prospectId,
  onClose,
}: {
  id: string;
  prospectId?: string;
  onClose: () => void;
}) {
  const query = useCapiroQuery("workspace.draft", { params: { id } });
  const me = useCapiroQuery(
    "me.read",
    {},
    { enabled: Boolean(prospectId || query.data?.prospectId) },
  );
  let originError: Error | undefined;
  if (query.data && (prospectId || query.data.prospectId) && me.data) {
    try {
      assertProspectDraft(query.data, {
        id,
        prospectId: prospectId ?? query.data.prospectId!,
        tenantId: me.data.tenant.id,
      });
    } catch (cause) {
      originError =
        cause instanceof Error
          ? cause
          : new Error("Prospect origin unavailable.");
    }
  }
  if (
    !prospectId &&
    !query.data?.prospectId &&
    query.data?.product === "Newsletter"
  )
    return <NewsletterWorkflow onClose={onClose} existing={query.data} />;
  return (
    <StatusPanel
      loading={query.loading || me.loading}
      error={query.error ?? me.error ?? originError}
      onRetry={() => {
        query.reload();
        me.reload();
      }}
    >
      {query.data && (
        <DraftEditor
          key={query.data.id}
          draft={query.data}
          onClose={onClose}
          reload={query.reload}
        />
      )}
    </StatusPanel>
  );
}
