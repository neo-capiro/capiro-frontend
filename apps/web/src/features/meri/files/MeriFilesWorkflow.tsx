"use client";

import { useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import type { DocumentWorkflowPort } from "../../../shared/meri-documents/workflow-port";
import {
  DocumentFilesController,
  type DocumentOperation,
} from "./document-workflow-state";
import { DocumentEditor } from "./DocumentEditor";
import { WorkbookEditor } from "./WorkbookEditor";
import { DocumentVersionPanel } from "./DocumentVersionPanel";
import { DocumentNotice } from "./DocumentNotice";
import styles from "./files.module.css";

/** The host supplies a disposal identity and operation, never browser-selected authority. */
export function MeriFilesWorkflow({
  port,
  lifetimeKey,
  contextLabel,
  operation,
}: {
  port: DocumentWorkflowPort | null;
  lifetimeKey: string;
  contextLabel: string;
  operation: DocumentOperation;
}) {
  return (
    <div className={styles.files}>
      <header className={styles.heading}>
        <h1>Files</h1>
        <p className={styles.muted}>{contextLabel}</p>
      </header>
      {port ? (
        <ConnectedFiles
          key={`${lifetimeKey}:${operation}`}
          port={port}
          operation={operation}
        />
      ) : (
        <section
          className={styles.notice}
          aria-label="Document service unavailable"
        >
          <h2>Document service unavailable</h2>
          <p>
            A configured document service and a verified connection are required
            to create, revise, inspect or download a version.
          </p>
          <p>
            No document operation runs when you open this page. The connection
            controls are provided by the host.
          </p>
        </section>
      )}
    </div>
  );
}

function ConnectedFiles({
  port,
  operation,
}: {
  port: DocumentWorkflowPort;
  operation: DocumentOperation;
}) {
  const controller = useMemo(
    () => new DocumentFilesController(port, operation),
    [port, operation],
  );
  // Revoke browser resources synchronously with the mounted view's replacement.
  useLayoutEffect(() => controller.attach(), [controller]);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const disabled = Boolean(
    state.busy ||
    state.problem === "access-lost" ||
    state.writeBlocked ||
    state.attempt.status !== "idle",
  );
  const parentVersionId = state.revision?.metadata.versionId ?? null;
  return (
    <>
      <DocumentNotice state={state} />
      <div className={styles.columns}>
        {operation === "create_word" ? (
          <DocumentEditor
            draft={state.word}
            parentVersionId={parentVersionId}
            acknowledged={state.acknowledged}
            disabled={disabled}
            onEdit={controller.editWord}
            onAcknowledge={controller.acknowledge}
            onCreate={() => void controller.submit()}
            onRevise={() => void controller.submit()}
            onCancelRevision={controller.cancelRevision}
          />
        ) : (
          <WorkbookEditor
            draft={state.workbook}
            parentVersionId={parentVersionId}
            acknowledged={state.acknowledged}
            disabled={disabled}
            onEdit={controller.editWorkbook}
            onAcknowledge={controller.acknowledge}
            onSubmit={() => void controller.submit()}
            onCancelRevision={controller.cancelRevision}
          />
        )}
        <DocumentVersionPanel
          state={state}
          onSelect={controller.select}
          onInspectId={controller.setInspectId}
          onInspectKnown={() => void controller.inspectKnownVersion()}
          onInspect={() => void controller.inspect()}
          onRevise={controller.beginRevision}
          onDownload={() => void controller.download()}
        />
      </div>
    </>
  );
}
