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
import type { ProspectWriter } from "./prospects/recovery-authority";
import { ProspectDraftExport } from "./prospects/ProspectDraftExport";
import { NewsletterWorkflow } from "./newsletter/NewsletterWorkflow";
import { DocumentPreview } from "./rich-document/DocumentPreview";
import { SectionEditor } from "./rich-document/SectionEditor";
import { SectionPreview } from "./rich-document/SectionPreview";
import { sectionSizeError } from "./rich-document/content";
import styles from "./workspace.module.css";
import { CopiedTabs } from "./brief-copy/CopiedTabs";
import { DraftClientAssociation } from "./DraftClientAssociation";
import { VersionHistory } from "./version-history/VersionHistory";

function DraftEditor({
  draft,
  onClose,
  reload,
  prospectSave,
}: {
  draft: WorkspaceDraftDocument;
  onClose: () => void;
  reload: () => void;
  prospectSave?: ReturnType<typeof useProspectDraftSave>;
}) {
  const initial = prospectSave?.retained?.input ?? manualDraftInput(draft);
  const [title, setTitle] = useState(initial.title);
  const [sections, setSections] = useState(initial.sections);
  const [boundDraft, setBoundDraft] = useState<WorkspaceDraftDocument>();
  const currentDraft = boundDraft ?? draft;
  const names = initial.names;
  const update = useCapiroMutation("workspace.draft.update");
  const snapshot = useCapiroMutation("workspace.draft.snapshot");
  const invalidSection = Object.values(sections).some((content) =>
    sectionSizeError(content),
  );
  const pending = Boolean(
    prospectSave?.pending || update.pending || snapshot.pending,
  );
  async function save() {
    if (pending || invalidSection) return;
    if (draft.prospectId) {
      await prospectSave?.save({ title, sections, names });
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
            {currentDraft.product ?? "Document"} ·{" "}
            {currentDraft.client ?? "Firm"}
          </p>
        </div>
        <div className={styles.actions}>
          <VersionHistory
            key={`${currentDraft.id}:${currentDraft.clientId ?? ""}`}
            draft={currentDraft}
          />
          {draft.prospectId && (
            <DocumentPreview title={title} names={names} sections={sections} />
          )}
          <ActionButton
            primary
            disabled={
              update.pending ||
              snapshot.pending ||
              prospectSave?.pending ||
              Boolean(prospectSave?.retained?.uncertain) ||
              invalidSection ||
              !title.trim()
            }
            onClick={save}
          >
            Save draft
          </ActionButton>
        </div>
      </header>
      <DraftClientAssociation
        draft={currentDraft}
        disabled={pending}
        onBound={setBoundDraft}
      />
      <CopiedTabs draft={currentDraft} />
      {draft.prospectId && prospectSave && (
        <>
          <p>
            Immutable prospect origin: {draft.prospectId}. Manual edits only.
          </p>
          {prospectSave?.error && <p role="alert">{prospectSave?.error}</p>}
          {prospectSave?.readback && (
            <details>
              <summary>Current saved content</summary>
              <h2>{prospectSave?.readback.docTitle}</h2>
              {Object.entries(
                prospectSave?.readback.config.sectionContent ?? {},
              ).map(([name, content]) => (
                <section key={name}>
                  <h3>{name}</h3>
                  <SectionPreview value={content} />
                </section>
              ))}
            </details>
          )}
          {prospectSave?.message && (
            <p role="status">{prospectSave?.message}</p>
          )}
          {prospectSave?.retained?.uncertain && (
            <p role="status">
              The previous save is not confirmed. No automatic retry will run.
              Read current document before another save.
            </p>
          )}
          <ActionButton
            disabled={prospectSave?.pending}
            onClick={() => void prospectSave?.readCurrent()}
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
              prospectSave?.pending ||
              Boolean(prospectSave?.retained?.uncertain)
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
          disabled={pending}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      {names.length ? (
        names.map((name) => (
          <Panel key={name} title={name}>
            {draft.prospectId ? (
              <SectionEditor
                name={name}
                value={sections[name] ?? ""}
                disabled={pending}
                onChange={(content) =>
                  setSections((previous) => ({ ...previous, [name]: content }))
                }
              />
            ) : (
              <TextArea
                aria-label={`${name} content`}
                value={sections[name] ?? ""}
                disabled={pending}
                onChange={(event) =>
                  setSections((previous) => ({
                    ...previous,
                    [name]: event.target.value,
                  }))
                }
              />
            )}
          </Panel>
        ))
      ) : (
        <Panel title="Document contents">
          {draft.documents
            .filter((document) => !document.sourceBriefVersion)
            .map((document) => (
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
    </section>
  );
}

function ProspectDraftEditor({
  draft,
  actor,
  onClose,
  reload,
}: {
  draft: WorkspaceDraftDocument;
  actor: ProspectWriter;
  onClose: () => void;
  reload: () => void;
}) {
  const save = useProspectDraftSave(draft, actor, reload);
  if (!save.ready)
    return (
      <section role={save.recoveryError ? "alert" : "status"}>
        <p>{save.recoveryError ?? "Checking saved prospect edits…"}</p>
        {save.recoveryError && (
          <ActionButton onClick={save.retry}>
            Retry saved document recovery
          </ActionButton>
        )}
        <ActionButton onClick={onClose}>← Workspace</ActionButton>
      </section>
    );
  return (
    <DraftEditor
      key={save.retained?.requestId ?? "current"}
      draft={draft}
      onClose={onClose}
      reload={reload}
      prospectSave={save}
    />
  );
}

export function WorkspaceDraft({
  id,
  prospectId,
  expectedClientId,
  onClose,
}: {
  id: string;
  prospectId?: string;
  expectedClientId?: string;
  onClose: () => void;
}) {
  const query = useCapiroQuery("workspace.draft", { params: { id } });
  const me = useCapiroQuery(
    "me.read",
    {},
    { enabled: Boolean(prospectId || query.data?.prospectId) },
  );
  if (
    query.data &&
    (query.data.id.toLowerCase() !== id.toLowerCase() ||
      (!query.data.prospectId &&
        expectedClientId &&
        (query.data.clientAssociation === "held" ||
          query.data.clientId?.toLowerCase() !==
            expectedClientId.toLowerCase())))
  )
    return (
      <section className={styles.screen}>
        <header className={styles.heading}>
          <h1>Document unavailable</h1>
        </header>
        <StatusPanel
          error={
            query.data.id.toLowerCase() !== id.toLowerCase()
              ? "The returned document does not match this link."
              : "The returned document no longer matches this client scope."
          }
          onRetry={query.reload}
        />
      </section>
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
      {query.data &&
        (query.data.prospectId ? (
          me.data && (
            <ProspectDraftEditor
              key={`${me.data.tenant.id}:${me.data.user.id}:${me.data.user.clerkUserId}:${query.data.id}`}
              actor={{
                tenantId: me.data.tenant.id,
                userId: me.data.user.id,
                ownerId: me.data.user.clerkUserId,
              }}
              draft={query.data}
              onClose={onClose}
              reload={query.reload}
            />
          )
        ) : (
          <DraftEditor
            key={query.data.id}
            draft={query.data}
            onClose={onClose}
            reload={query.reload}
          />
        ))}
    </StatusPanel>
  );
}
