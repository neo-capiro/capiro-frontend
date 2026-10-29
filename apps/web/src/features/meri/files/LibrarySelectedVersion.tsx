import { Button } from "@capiro/ui/button";
import { DocumentPreviewPanel } from "./DocumentPreviewPanel";
import { DocumentRevisionLink } from "./DocumentRevisionLink";
import { OfficeEditButton } from "../office/OfficeEditing";
import type {
  DocumentLibraryAccess,
  LibraryVersion,
} from "../../../shared/meri-documents/library-access";
import type {
  DocumentLibraryController,
  DocumentLibraryState,
} from "./document-library-state";
import styles from "./files.module.css";

/** Selected immutable version actions share the library's current read lifetime. */
export function LibrarySelectedVersion({
  port,
  controller,
  state,
  selected,
}: {
  port: DocumentLibraryAccess;
  controller: DocumentLibraryController;
  state: DocumentLibraryState;
  selected: LibraryVersion;
}) {
  const latest = selected.versionId === state.versions[0]?.versionId;
  return (
    <div className={styles.stack}>
      <p className={styles.identifier}>
        Selected version: {selected.versionId}
      </p>
      <div className={styles.controls}>
        {latest && (
          <OfficeEditButton version={selected} disabled={state.busy} />
        )}
        <Button
          variant="outline"
          disabled={state.busy}
          onClick={() => void controller.inspect()}
        >
          Inspect version
        </Button>
        <Button
          variant="outline"
          disabled={state.busy}
          onClick={() => void controller.download()}
        >
          Verify download
        </Button>
      </div>
      {state.inspection && (
        <p role="status">
          Current bytes verified for {state.inspection.filename}. This
          inspection does not claim a rendered preview.
        </p>
      )}
      {state.inspection?.kind === "generated" && (
        <GeneratedVersion port={port} selected={selected} latest={latest} />
      )}
      {state.download && (
        <a
          className={styles.download}
          href={state.download.url}
          download={state.download.filename}
        >
          Download {state.download.filename}
        </a>
      )}
    </div>
  );
}

function GeneratedVersion({
  port,
  selected,
  latest,
}: {
  port: DocumentLibraryAccess;
  selected: LibraryVersion;
  latest: boolean;
}) {
  return (
    <>
      <DocumentPreviewPanel
        key={selected.versionId}
        port={port}
        versionId={selected.versionId}
      />
      {latest ? (
        <DocumentRevisionLink
          key={`revision:${selected.versionId}`}
          port={port}
          versionId={selected.versionId}
        />
      ) : (
        <p>
          Select the latest version to revise. Earlier versions remain available
          to inspect and download.
        </p>
      )}
    </>
  );
}
