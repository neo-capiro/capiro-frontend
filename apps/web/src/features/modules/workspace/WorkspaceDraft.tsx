"use client";

import { useState } from "react";
import type { WorkspaceDraftDocument } from "../../../shared/capiro/operations/workspace-documents";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import {
  manualDraftInput,
  assertProspectDraft,
} from "./prospects/manual-draft";
import { useProspectDraftSave } from "./prospects/useProspectDraftSave";
import type { ProspectWriter } from "./prospects/recovery-authority";
import { ProspectSaveRecovery } from "./prospects/ProspectSaveRecovery";
import { NewsletterWorkflow } from "./newsletter/NewsletterWorkflow";
import { DocumentPreview } from "./rich-document/DocumentPreview";
import { SectionEditor } from "./rich-document/SectionEditor";
import { sectionSizeError } from "./rich-document/content";
import styles from "./workspace.module.css";
import presentation from "./ordinary-presentation.module.css";
import { CopiedTabs } from "./brief-copy/CopiedTabs";
import { DraftClientAssociation } from "./DraftClientAssociation";
import { VersionHistory } from "./version-history/VersionHistory";
import { WorkspaceCollaboratorsPanel } from "./collaboration/WorkspaceCollaboratorsPanel";
import { OrdinaryDraftExport } from "./ordinary-export/OrdinaryDraftExport";
import {
  OrdinaryDraftSave,
  OrdinarySaveRecovery,
  type OrdinarySave,
} from "./ordinary-save/OrdinaryDraftSave";
import { GenerationPanelHost } from "./generation/GenerationPanelHost";

function DraftEditor({
  draft,
  onClose,
  prospectSave,
  ordinarySave,
  onOrdinaryBound,
}: {
  draft: WorkspaceDraftDocument;
  onClose: () => void;
  prospectSave?: ReturnType<typeof useProspectDraftSave>;
  ordinarySave?: OrdinarySave;
  onOrdinaryBound?: (draft: WorkspaceDraftDocument) => void;
}) {
  const initial = prospectSave?.retained?.input ?? manualDraftInput(draft);
  const [localTitle, setLocalTitle] = useState(initial.title);
  const [localSections, setLocalSections] = useState(initial.sections);
  const [boundDraft, setBoundDraft] = useState<WorkspaceDraftDocument>();
  const currentDraft = ordinarySave?.currentDraft ?? boundDraft ?? draft;
  const title = ordinarySave?.input?.title ?? localTitle;
  const sections = ordinarySave?.input?.sections ?? localSections;
  const names = ordinarySave?.input?.names ?? initial.names;
  const setTitle = (value: string) =>
    ordinarySave
      ? ordinarySave.setInput({ title: value, sections, names })
      : setLocalTitle(value);
  const setSection = (name: string, content: string) =>
    ordinarySave
      ? ordinarySave.setInput({
          title,
          names,
          sections: { ...sections, [name]: content },
        })
      : setLocalSections((previous) => ({ ...previous, [name]: content }));
  const invalidSection = Object.values(sections).some((content) =>
    sectionSizeError(content),
  );
  const pending = Boolean(prospectSave?.pending || ordinarySave?.pending);
  async function save() {
    if (pending || invalidSection) return;
    if (draft.prospectId) {
      await prospectSave?.save({ title, sections, names });
      return;
    }
    await ordinarySave?.save();
  }
  return (
    <section className={styles.screen}>
      {!draft.prospectId && (
        <ActionButton className={presentation.back} onClick={onClose}>
          ← Workspace
        </ActionButton>
      )}
      <header
        className={draft.prospectId ? styles.heading : presentation.header}
      >
        <div className={draft.prospectId ? undefined : presentation.title}>
          {draft.prospectId && (
            <ActionButton onClick={onClose}>← Workspace</ActionButton>
          )}
          <h1>{ordinarySave ? currentDraft.docTitle : draft.docTitle}</h1>
          {currentDraft.config.documentAgent?.blueprintPin && (
            <p>
              Document blueprint · pinned v
              {currentDraft.config.documentAgent.blueprintPin.version}
            </p>
          )}
          <p>
            {currentDraft.product ?? "Document"}
            {currentDraft.client
              ? ` · ${currentDraft.client}`
              : draft.prospectId
                ? " · Firm"
                : ""}
          </p>
        </div>
        <div
          className={
            draft.prospectId ? styles.actions : presentation.headerActions
          }
        >
          {!draft.prospectId && (
            <WorkspaceCollaboratorsPanel draftId={currentDraft.id} />
          )}
          <VersionHistory
            key={`${currentDraft.id}:${currentDraft.clientId ?? ""}:${ordinarySave ? currentDraft.updatedAt : ""}`}
            draft={currentDraft}
          />
          {/* Safe preview of the supported section projection only. An ordinary
              document whose stored body is not a supported projection is
              refused with a reason, and a mixed projection is qualified, rather
              than shown as the whole document. Prospect behavior is unchanged. */}
          {(draft.prospectId || names.length > 0) && (
            <DocumentPreview title={title} names={names} sections={sections} />
          )}
          <ActionButton
            primary
            disabled={
              (ordinarySave && !ordinarySave.canSave) ||
              (prospectSave && !prospectSave.canSave) ||
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
      {!draft.prospectId && (
        <>
          <p className={presentation.qualifier}>
            {names.length
              ? "This preview shows only the supported sections; other saved content, if present, is preserved read-only and is not shown."
              : "Preview unavailable: there is no supported section content to preview; stored body content is preserved read-only and is not shown."}
          </p>
          <OrdinaryDraftExport
            key={`${currentDraft.id}:${currentDraft.clientId ?? ""}`}
            draft={currentDraft}
            disabled={pending}
          />
        </>
      )}
      <DraftClientAssociation
        draft={currentDraft}
        disabled={pending || Boolean(ordinarySave?.frozen)}
        onBound={onOrdinaryBound ?? setBoundDraft}
      />
      {/* The WS-22 document-agent panel. Ordinary saved drafts only: a prospect
          origin is an immutable manual-only document, and the newsletter
          workflow owns its own screen. The panel resolves its own role from the
          canonical collaborators list and refuses anything not activated. */}
      {!draft.prospectId && <GenerationPanelHost draftId={currentDraft.id} />}
      <CopiedTabs draft={currentDraft} />
      {ordinarySave && <OrdinarySaveRecovery save={ordinarySave} />}
      {draft.prospectId && prospectSave && (
        <ProspectSaveRecovery draft={draft} save={prospectSave} />
      )}
      <Field label="Document title" htmlFor="workspace-document-title">
        <TextInput
          id="workspace-document-title"
          value={title}
          maxLength={500}
          disabled={pending || Boolean(ordinarySave?.frozen)}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      {names.length ? (
        names.map((name) => (
          <Panel key={name} title={name}>
            <SectionEditor
              name={name}
              value={sections[name] ?? ""}
              disabled={pending || Boolean(ordinarySave?.frozen)}
              onChange={(content) => setSection(name, content)}
            />
          </Panel>
        ))
      ) : (
        <Panel title="Document contents">
          {currentDraft.documents
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
      key={`${save.retained?.requestId ?? "current"}:${save.currentDraft.updatedAt}`}
      draft={save.currentDraft}
      onClose={onClose}
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
    {
      enabled: Boolean(
        prospectId ||
        (query.data &&
          (query.data.prospectId || query.data.product !== "Newsletter")),
      ),
    },
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
        (query.data.prospectId
          ? me.data && (
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
          : me.data && (
              <OrdinaryDraftSave
                key={`${me.data.tenant.id}:${me.data.user.id}:${me.data.user.clerkUserId}:${query.data.id}:${query.data.clientId ?? ""}`}
                draft={query.data}
                actor={{
                  tenantId: me.data.tenant.id,
                  userId: me.data.user.id,
                  actorId: me.data.user.clerkUserId,
                }}
                onClose={onClose}
                editor={DraftEditor}
              />
            ))}
    </StatusPanel>
  );
}
