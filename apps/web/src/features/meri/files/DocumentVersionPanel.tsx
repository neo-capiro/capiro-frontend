import { useId } from "react";
import { Button } from "@capiro/ui/button";
import { Input } from "@capiro/ui/input";
import type { DocumentFilesState } from "./document-workflow-state";
import { DocumentInspectionSummary } from "./DocumentInspectionSummary";
import styles from "./files.module.css";

export function DocumentVersionPanel({
  state,
  onSelect,
  onInspectId,
  onInspectKnown,
  onInspect,
  onRevise,
  onDownload,
}: {
  state: DocumentFilesState;
  onSelect: (versionId: string) => void;
  onInspectId: (id: string) => void;
  onInspectKnown: () => void;
  onInspect: () => void;
  onRevise: () => void;
  onDownload: () => void;
}) {
  const prefix = useId();
  const version = state.selected;
  const readingDisabled = Boolean(
    state.busy || state.problem === "access-lost",
  );
  const writingDisabled =
    readingDisabled || state.writeBlocked || state.attempt.status !== "idle";
  return (
    <section className={styles.panel} aria-labelledby={`${prefix}-heading`}>
      <h2 id={`${prefix}-heading`}>Immutable version</h2>
      <p className={styles.muted}>
        Inspect a version ID you already know, or select a recent version from
        this editor. Saved files and their full version history are available in
        the library above.
      </p>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (!readingDisabled && state.inspectId.trim()) onInspectKnown();
        }}
      >
        <label className={styles.field}>
          <span>Known version ID</span>
          <Input
            value={state.inspectId}
            required
            disabled={readingDisabled}
            onChange={(event) => onInspectId(event.target.value)}
          />
        </label>
        <Button
          type="submit"
          variant="outline"
          className={styles.button}
          disabled={readingDisabled || !state.inspectId.trim()}
        >
          Inspect version ID
        </Button>
      </form>
      {state.versions.length > 0 && (
        <label className={styles.field}>
          <span>Versions returned in this view (up to 10)</span>
          <select
            value={version?.metadata.versionId ?? ""}
            disabled={state.busy === "create" || state.busy === "revise"}
            onChange={(event) => onSelect(event.target.value)}
          >
            {state.versions.map((item) => (
              <option
                key={item.metadata.versionId}
                value={item.metadata.versionId}
              >
                {item.metadata.filename} · {item.metadata.versionId}
              </option>
            ))}
          </select>
        </label>
      )}
      {version ? (
        <>
          <h3>{version.metadata.filename}</h3>
          <dl className={styles.details}>
            <dt>Version ID</dt>
            <dd>{version.metadata.versionId}</dd>
            <dt>Parent version</dt>
            <dd>
              {version.metadata.parentVersionId ?? "None — original version"}
            </dd>
            <dt>Artifact ID</dt>
            <dd>{version.metadata.artifactId}</dd>
            <dt>Format</dt>
            <dd>{version.metadata.format.toUpperCase()}</dd>
            <dt>Created</dt>
            <dd>
              <time dateTime={version.metadata.createdAt}>
                {version.metadata.createdAt}
              </time>
            </dd>
            <dt>Bytes</dt>
            <dd>{version.metadata.bytes}</dd>
            <dt>SHA-256</dt>
            <dd>{version.metadata.sha256}</dd>
            <dt>Generation</dt>
            <dd>Draft</dd>
            <dt>Preview</dt>
            <dd>Pending</dd>
            <dt>Byte inspection receipt</dt>
            <dd>
              {"currentBytesVerified" in version.inspection
                ? "Service verified bytes for this version"
                : "Not requested in this view"}
            </dd>
          </dl>
          <DocumentInspectionSummary inspection={version.inspection} />
          <div className={styles.controls}>
            <Button
              type="button"
              variant="outline"
              className={styles.button}
              disabled={readingDisabled}
              onClick={onInspect}
            >
              Inspect selected version
            </Button>
            <Button
              type="button"
              variant="outline"
              className={styles.button}
              disabled={writingDisabled}
              onClick={onRevise}
            >
              Revise selected version
            </Button>
            <Button
              type="button"
              variant="outline"
              className={styles.button}
              disabled={readingDisabled}
              onClick={onDownload}
            >
              Verify download
            </Button>
          </div>
          {state.download && (
            <div className={styles.stack}>
              <p role="status">
                Download bytes match the selected immutable version’s size and
                SHA-256.
              </p>
              <a
                className={styles.download}
                href={state.download.url}
                download={state.download.filename}
              >
                Download {state.download.filename}
              </a>
            </div>
          )}
        </>
      ) : (
        <p className={styles.muted}>No verified version is selected.</p>
      )}
    </section>
  );
}
