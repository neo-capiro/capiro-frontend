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
  const [title, setTitle] = useState(draft.docTitle);
  const [sections, setSections] = useState(draft.config.sectionContent ?? {});
  const [history, setHistory] = useState(false);
  const update = useCapiroMutation("workspace.draft.update");
  const snapshot = useCapiroMutation("workspace.draft.snapshot");
  const versions = useCapiroQuery(
    "workspace.draft.versions",
    { params: { draftId: draft.id } },
    { enabled: history },
  );
  async function save() {
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
  const names =
    draft.config.sections ??
    draft.documents.flatMap((document) =>
      (document.body.blocks ?? []).flatMap((block) =>
        block.title ? [block.title] : [],
      ),
    );
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
            disabled={update.pending || snapshot.pending}
            onClick={save}
          >
            Save draft
          </ActionButton>
        </div>
      </header>
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
          error={versions.error}
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
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const query = useCapiroQuery("workspace.draft", { params: { id } });
  if (query.data?.product === "Newsletter")
    return <NewsletterWorkflow onClose={onClose} existing={query.data} />;
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
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
