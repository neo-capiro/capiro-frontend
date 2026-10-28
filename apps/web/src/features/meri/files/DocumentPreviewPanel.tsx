"use client";
import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@capiro/ui/button";
import type { DocumentLibraryAccess } from "../../../shared/meri-documents/library-access";
import { DocumentPreviewController } from "./preview-state";
import styles from "./files.module.css";

export function DocumentPreviewPanel({
  port,
  versionId,
}: {
  port: DocumentLibraryAccess;
  versionId: string;
}) {
  const [controller] = useState(
    () => new DocumentPreviewController(port, port.context, versionId),
  );
  useLayoutEffect(() => controller.attach(), [controller]);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  return (
    <section aria-label="PDF preview" className={styles.stack}>
      <div className={styles.controls}>
        <Button
          variant="outline"
          disabled={state.busy}
          onClick={() => void controller.read()}
        >
          Open existing preview
        </Button>
        <Button
          variant="outline"
          disabled={state.busy || state.publication !== "available"}
          onClick={() => void controller.publish()}
        >
          Prepare PDF preview
        </Button>
      </div>
      <p className={styles.muted}>
        Preparing a preview creates a separate derived PDF under current
        permission. It does not send a message or replace the original file.
      </p>
      {state.publication === "unresolved" && (
        <p role="status">
          A publication attempt is unresolved. Only the existing preview will be
          checked.
        </p>
      )}
      {state.message && <p role="status">{state.message}</p>}
      {state.url && (
        <>
          <p>
            {state.pages} preview {state.pages === 1 ? "page" : "pages"}
          </p>
          <iframe
            title="Verified PDF preview"
            src={state.url}
            sandbox=""
            style={{ width: "100%", minHeight: "32rem", border: 0 }}
          />
        </>
      )}
    </section>
  );
}
