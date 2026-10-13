"use client";
import Link from "next/link";
import { useCapiroQuery } from "@/shared/capiro/queries";
import {
  briefCopyCreateBodySchema,
  type BriefCopySource,
} from "@/shared/capiro/operations/workspace-brief-copy";
import { useSelectedClient } from "@/shared/session/SelectedClient";
import { ActionButton, StatusPanel } from "@/shared/module-ui";
import { assertCopyDetail, assertCopyScope, type CopyScope } from "./admission";
import { useBriefCopyCommand, type CurrentCopy } from "./useBriefCopyCommand";
import { CopyRecovery } from "./CopyRecovery";
import { CopyEditor } from "./CopyEditor";
import styles from "../workspace.module.css";

function CopyWorkflow({
  scope,
  source,
  initial,
  documentId,
  onClose,
}: {
  scope: CopyScope;
  source: BriefCopySource;
  initial: CurrentCopy;
  documentId?: string;
  onClose: () => void;
}) {
  const command = useBriefCopyCommand(scope, source, initial, documentId);
  const created = !documentId ? command.current.detail : undefined;
  if (!command.ready)
    return (
      <section className={styles.screen}>
        <h1>Workspace copy recovery</h1>
        <p role={command.recoveryError ? "alert" : "status"}>
          {command.recoveryError ??
            "Checking current access and retained Workspace intent…"}
        </p>
        <p>
          A previous submitted command may remain retained. No write is retried
          by reopening or reading this view.
        </p>
        {command.recoveryError && (
          <ActionButton onClick={command.retryRecovery}>
            Retry current access and recovery
          </ActionButton>
        )}
        <ActionButton onClick={onClose}>← Workspace</ActionButton>
      </section>
    );
  return (
    <section className={styles.screen}>
      <ActionButton onClick={onClose}>← Workspace</ActionButton>
      <CopyRecovery command={command} />
      {documentId && command.current.detail ? (
        <CopyEditor
          key={`${command.generation}:${command.record?.command.body.requestId ?? "current"}`}
          detail={command.current.detail}
          command={command}
        />
      ) : created ? (
        <>
          <h1>Core brief copied</h1>
          <p>
            The independently editable tab is bound to original Core version{" "}
            {source.versionNumber}.
          </p>
          <Link
            href={`/modules/workspace?${new URLSearchParams({ prospectId: scope.prospectId, draftId: scope.draftId, copyDocumentId: created.document.id })}`}
          >
            Open copied tab
          </Link>
        </>
      ) : (
        <>
          <h1>Copy saved Core brief to Workspace</h1>
          <p>
            Core brief {source.briefId} · version {source.versionNumber} (
            {source.versionId})
          </p>
          <p>
            Destination draft: {scope.draftId}. A new tab named “Core brief copy
            — version {source.versionNumber}” and its saved version will be
            created together.
          </p>
          <p>
            Workspace owns subsequent edits and history. Core stays unchanged.
            This action does not generate, send or share content.
          </p>
          <ActionButton
            primary
            disabled={command.pending || Boolean(command.record)}
            onClick={() => {
              if (command.pending || command.record) return;
              void command.submit({
                source,
                command: {
                  kind: "copy",
                  body: briefCopyCreateBodySchema.parse({
                    requestId: crypto.randomUUID(),
                    expectedStateHash: command.current.state.stateHash,
                    expectedClientId: scope.clientId,
                    source,
                  }),
                },
              });
            }}
          >
            Create independent Workspace copy
          </ActionButton>
        </>
      )}
    </section>
  );
}

export function BriefCopyFlow({
  prospectId,
  draftId,
  source: requestedSource,
  documentId,
  onClose,
}: {
  prospectId: string;
  draftId: string;
  source?: BriefCopySource;
  documentId?: string;
  onClose: () => void;
}) {
  const me = useCapiroQuery("me.read", {});
  const state = useCapiroQuery("workspace.brief-copy.state", {
    params: { draftId },
  });
  const detail = useCapiroQuery(
    "workspace.brief-copy.detail",
    { params: { draftId, docId: documentId ?? draftId } },
    { enabled: Boolean(documentId) },
  );
  const selected = useSelectedClient();
  const source = requestedSource ?? detail.data?.document.sourceBriefVersion;
  let scope: CopyScope | undefined;
  let mismatch: Error | undefined;
  if (me.data && state.data) {
    scope = {
      actor: {
        tenantId: me.data.tenant.id,
        userId: me.data.user.id,
        ownerId: me.data.user.clerkUserId,
      },
      draftId,
      prospectId,
      clientId: state.data.clientId,
    };
    try {
      assertCopyScope(state.data, scope);
      if (
        selected.state !== "no-selection" &&
        (selected.state !== "authorized-client" ||
          selected.client.id !== state.data.clientId)
      )
        throw new Error(
          "The destination does not match the current selected client.",
        );
      if (source && source.prospectId !== prospectId)
        throw new Error(
          "The selected Core source belongs to a different prospect.",
        );
      if (documentId && source && detail.data)
        assertCopyDetail(detail.data, state.data, scope, documentId, source);
    } catch (cause) {
      mismatch =
        cause instanceof Error
          ? cause
          : new Error("Copied document association unavailable.");
    }
  }
  const loading = me.loading || state.loading || detail.loading;
  const error = me.error ?? state.error ?? detail.error ?? mismatch;
  return (
    <StatusPanel
      loading={loading}
      error={error}
      onRetry={() => {
        me.reload();
        state.reload();
        detail.reload();
      }}
    >
      {!loading &&
        !error &&
        scope &&
        state.data &&
        source &&
        (!documentId || detail.data) && (
          <CopyWorkflow
            key={JSON.stringify([scope, source, documentId])}
            scope={scope}
            source={source}
            initial={{ state: state.data, detail: detail.data }}
            documentId={documentId}
            onClose={onClose}
          />
        )}
    </StatusPanel>
  );
}
