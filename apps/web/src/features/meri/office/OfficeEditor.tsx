"use client";
import { useState } from "react";
import { Button } from "@capiro/ui/button";
import { MeriDialog } from "../ui/MeriDialog";
import type { LibraryVersion } from "../../../shared/meri-documents/library-access";
import { OfficeEditorControls } from "./OfficeEditorControls";
import { useOfficeEditor } from "./useOfficeEditor";
import styles from "./office.module.css";

export function OfficeEditor({
  account,
  version,
  onClose,
}: {
  account: { tenantId: string; actorId: string };
  version: LibraryVersion;
  onClose(): void;
}) {
  const [closing, setClosing] = useState(false);
  const { host, state, connection, container } = useOfficeEditor(
    account,
    version,
    onClose,
  );
  const close = () => {
    if (state.frame || state.busy) setClosing(true);
    else onClose();
  };
  return (
    <MeriDialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={version.filename}
      description="Save keeps a private draft. Release the editor, then Publish to create a new file version."
      width="extra-wide"
      placement="top"
    >
      <div className={styles.editor}>
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
        <div ref={container} className={styles.frame} hidden={!state.frame} />
        <p className={styles.note}>
          Closing keeps the saved draft private. Discard removes it. Saved
          drafts expire after seven days.
        </p>
      </div>
    </MeriDialog>
  );
}
