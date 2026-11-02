"use client";
import { useState } from "react";
import { Button } from "@capiro/ui/button";
import type { OfficeDocument } from "@capiro/meri-contracts/office-application";
import { MeriDialog } from "../ui/MeriDialog";
import { OfficeEditorControls } from "./OfficeEditorControls";
import { useOfficeEditor } from "./useOfficeEditor";
import { OfficeDownloadLink } from "./OfficeDownloadLink";
import { OfficeAskMeri, type OfficeAskTarget } from "./OfficeAskMeri";
import type { OfficeTarget } from "./OfficeEditing";
import type { OfficeBrowserPort } from "../../../shared/meri-office/file-access";
import styles from "./office.module.css";

export function OfficeEditor({
  account,
  version,
  onClose,
  onPublished,
  sessionRunId,
}: {
  account: { tenantId: string; actorId: string };
  version: OfficeTarget;
  onClose(): void;
  onPublished?: ((document: OfficeDocument) => void) | undefined;
  sessionRunId?: string;
}) {
  const [closing, setClosing] = useState(false);
  const { host, state, connection, container, origin } = useOfficeEditor(
    account,
    version,
    onClose,
    onPublished,
    sessionRunId,
  );
  const close = () => {
    if (state.frame || state.busy) setClosing(true);
    else onClose();
  };
  const draft = state.snapshot?.draft;
  // Meri must read the version the person actually edited: an open editor or a saved but unpublished
  // private draft is withheld explicitly instead of silently pointing Meri at the older version.
  const askBlocked = state.frame
    ? "Save and release the editor, then Publish, before asking Meri: Meri reads the published version, not an open editor."
    : draft && draft.sequence > 0 && draft.state !== "published"
      ? "Publish your saved private draft first; Meri reads file versions, not private drafts."
      : null;
  const askTarget =
    connection.status === "ready"
      ? askTargetFor(connection.port, version.versionId, state.publication)
      : null;
  return (
    <MeriDialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={version.filename ?? "Office document"}
      description="Save keeps a private draft. Release the editor, then Publish to create a new file version."
      width="extra-wide"
      placement="top"
    >
      <div className={styles.editor}>
        {version.note && <p role="status">{version.note}</p>}
        {closing && (
          <div className={styles.confirm} role="alert">
            <p>
              Close this editor? Only work already saved to the service can be
              recovered.
            </p>
            <div className={styles.controls}>
              <Button variant="outline" onClick={() => setClosing(false)}>
                Keep editing
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close editor
              </Button>
            </div>
          </div>
        )}
        {!state.connected && (
          <div role="status">
            <p>
              {connection.status === "connecting" ||
              connection.status === "idle"
                ? "Checking current file access…"
                : "Current editor access is unavailable."}
            </p>
            {connection.status !== "connecting" &&
              connection.status !== "idle" && (
                <Button
                  variant="outline"
                  onClick={() => void host.session.connect()}
                >
                  Check access again
                </Button>
              )}
          </div>
        )}
        <OfficeEditorControls editor={host.editor} state={state} />
        {connection.status === "ready" && (
          <OfficeDownloadLink
            key={`${connection.lifetimeKey}:${state.snapshot?.draft.publishedVersionId ?? version.versionId}`}
            port={connection.port}
            versionId={
              state.snapshot?.draft.publishedVersionId ?? version.versionId
            }
          />
        )}
        {askTarget && (
          <OfficeAskMeri
            key={`ask:${state.publication?.version.versionId ?? version.versionId}`}
            context={{
              tenantId: account.tenantId,
              actorId: account.actorId,
              conversationId: origin.conversationId,
              selectedClientId: origin.clientId,
            }}
            inspect={askTarget}
            blocked={askBlocked}
            disabled={state.busy !== null}
          />
        )}
        <div ref={container} className={styles.frame} hidden={!state.frame} />
        <p className={styles.note}>
          Closing keeps the saved draft private. Discard removes it. Saved
          drafts expire after seven days.
        </p>
      </div>
    </MeriDialog>
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
