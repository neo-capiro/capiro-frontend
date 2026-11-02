"use client";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { ActionButton } from "../../../../shared/module-ui";
import { OfficeAskMeri } from "../../../meri/office/OfficeAskMeri";
import { OfficeDownloadLink } from "../../../meri/office/OfficeDownloadLink";
import type { OfficeAskTarget } from "../../../meri/office/OfficeAskMeri";
import type { OfficeBrowserPort } from "../../../../shared/meri-office/file-access";
import type { OfficeDocument } from "@capiro/meri-contracts/office-application";
import { OfficeDraftControls } from "./OfficeDraftControls";
import { OfficeRevisionHistory } from "./OfficeRevisionHistory";
import {
  useOfficeWorkbench,
  type OfficeWorkspaceTarget,
} from "./useOfficeWorkbench";
import styles from "./office-workspace.module.css";

/** One Office document opened in the Workspace: Collabora's full workbench in the page, the host's revision and
 * draft actions beside it, the immutable revision history and the Ask Meri entry. CODE's Save, Save As and close
 * controls post to the host and run the confirmed Save, publish and release sequences. Leaving with an open
 * editor goes through the same close: pending changes are saved and published before the page is left. */
export function OfficeDocumentScreen({
  account,
  target,
  onClose,
  onOpenVersion,
}: {
  account: { tenantId: string; actorId: string };
  target: OfficeWorkspaceTarget;
  /** Back to the Workspace documents. */
  onClose(): void;
  /** Reopen the Workspace on another revision of this document. */
  onOpenVersion(versionId: string): void;
}) {
  const { host, state, connection, container, head, history } =
    useOfficeWorkbench(account, target, {
      onPublished: (document) => onOpenVersion(document.version.versionId),
      onClosed: onClose,
      onDiscarded: onClose,
    });
  const draft = state.snapshot?.draft;
  const filename = draft?.filename ?? "Office document";
  const published = draft?.state === "published";
  const readOnly = head !== null && !head.latest;
  // Leaving with unsaved or in-flight work: the browser asks before unload; the host's own exits save first.
  const guarded = state.frame && (state.modified || state.busy !== null);
  useEffect(() => {
    if (!guarded) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [guarded]);
  const leave = () => {
    if (state.frame && state.ready) void host.editor.close();
    else onClose();
  };
  const askBlocked = state.frame
    ? "Close the editor and publish the revision before asking Meri: Meri reads the published revision, not an open editor."
    : draft && draft.sequence > 0 && !published
      ? "Publish the saved draft first; Meri reads revisions, not private drafts."
      : null;
  const askTarget =
    connection.status === "ready"
      ? askTargetFor(connection.port, target.versionId, state.publication)
      : null;
  return (
    <section className={styles.screen} aria-label="Office document">
      <header className={styles.heading}>
        <div>
          <button
            type="button"
            className={styles.back}
            disabled={state.busy !== null}
            onClick={leave}
          >
            <ArrowLeft size={14} aria-hidden="true" /> Documents
          </button>
          <h1>{filename}</h1>
          <p>
            {readOnly
              ? "An earlier revision, shown read-only."
              : draft
                ? draft.sequence > 0
                  ? `Private draft saved ${new Date(draft.savedAt).toLocaleString()} · expires ${new Date(draft.expiresAt).toLocaleString()}`
                  : "No private save yet. Save keeps a private draft; Publish revision creates the next immutable revision."
                : "Checking the current document…"}
          </p>
        </div>
        <div className={styles.actions}>
          <OfficeDraftControls
            editor={host.editor}
            state={state}
            readOnly={readOnly}
          />
          <ActionButton
            aria-pressed={history.open}
            onClick={() => history.setOpen(!history.open)}
          >
            Revisions
          </ActionButton>
        </div>
      </header>
      <div className={styles.status}>
        {readOnly && (
          <p role="status">
            A newer revision of this document exists. Open the latest revision
            to edit it.{" "}
            <ActionButton
              disabled={state.busy !== null}
              onClick={() => onOpenVersion(head!.headVersionId)}
            >
              Open latest
            </ActionButton>
          </p>
        )}
        {!state.connected && (
          <p role="status">
            {connection.status === "connecting" || connection.status === "idle"
              ? "Checking current document access…"
              : "Current editor access is unavailable."}
            {connection.status !== "connecting" &&
              connection.status !== "idle" && (
                <>
                  {" "}
                  <ActionButton onClick={() => void host.session.connect()}>
                    Check access again
                  </ActionButton>
                </>
              )}
          </p>
        )}
        {state.busy && <p role="status">{state.busy}</p>}
        {state.notice && <p role="status">{state.notice}</p>}
        {state.frame && !state.ready && (
          <p role="status">Loading the editor…</p>
        )}
        {state.modified && (
          <p role="status">
            Changes not yet saved. Save in the editor keeps them as your private
            draft; closing saves and publishes them.
          </p>
        )}
        {published && state.publication && (
          <p role="status">
            Revision published. Open it from the revision list; this draft is
            complete.
          </p>
        )}
        {state.publication?.inspection.format === "xlsx" && (
          <p className={styles.muted}>
            Formula values: {state.publication.inspection.details.formulaCache}
          </p>
        )}
      </div>
      <div className={styles.body} data-history={history.open}>
        <div>
          <div ref={container} className={styles.frame} hidden={!state.frame} />
          {!state.frame && (
            <div className={styles.placeholder}>
              <p>
                {state.busy
                  ? state.busy
                  : readOnly
                    ? "This earlier revision is closed. Open the latest revision to edit the document."
                    : published
                      ? "This revision is published. Open the newest revision to keep editing."
                      : "The editor is closed. Open it to continue editing this private draft."}
              </p>
            </div>
          )}
        </div>
        {history.open && connection.status === "ready" && (
          <OfficeRevisionHistory
            port={connection.port}
            versionId={target.versionId}
            refreshKey={state.publication?.version.versionId ?? ""}
            onOpen={onOpenVersion}
          />
        )}
      </div>
      <footer className={styles.footer}>
        {askTarget && (
          <OfficeAskMeri
            key={`ask:${state.publication?.version.versionId ?? target.versionId}`}
            context={{
              tenantId: account.tenantId,
              actorId: account.actorId,
              conversationId: target.conversationId,
              selectedClientId: target.clientId,
            }}
            inspect={askTarget}
            blocked={askBlocked}
            disabled={state.busy !== null}
          />
        )}
        {connection.status === "ready" && (
          <OfficeDownloadLink
            key={`${connection.lifetimeKey}:${draft?.publishedVersionId ?? target.versionId}`}
            port={connection.port}
            versionId={draft?.publishedVersionId ?? target.versionId}
          />
        )}
      </footer>
    </section>
  );
}

/** The exact version Meri will read: the one just published here, else the opened version re-inspected now. */
function askTargetFor(
  port: OfficeBrowserPort,
  versionId: string,
  publication: OfficeDocument | null,
): (signal: AbortSignal) => Promise<OfficeAskTarget> {
  return async (signal) => {
    const version = publication
      ? publication.version
      : await (async () => {
          const reply = await port.request("inspect", { versionId }, signal);
          if ("error" in reply.value) throw new Error(reply.value.error.code);
          return reply.value.document.version;
        })();
    return {
      artifactId: version.artifactId,
      versionId: version.versionId,
      objectSha256: version.object.sha256,
      filename: version.filename,
    };
  };
}
