import styles from "./enrichment.module.css";
export function EnrichmentToolbar({
  website,
  canEdit,
  busy,
  running,
  onUpload,
  onSetup,
}: {
  website?: string | null;
  canEdit: boolean;
  busy: boolean;
  running: boolean;
  onUpload: () => void;
  onSetup: () => void;
}) {
  return (
    <>
      <div className={styles.sourceBar}>
        <span>{website ?? "Saved client sources"}</span>
        <button
          className="button"
          disabled={!canEdit || busy}
          onClick={onUpload}
          title="Upload saves a client file immediately; it does not start research."
        >
          Upload
        </button>
        <button className="button" onClick={onSetup}>
          Research setup
        </button>
        <button
          className="button primary"
          disabled={busy || running}
          onClick={onSetup}
        >
          Run again
        </button>
      </div>
      <p className={styles.uploadNotice}>
        Uploading saves a client file immediately. It does not start research or
        add the file to a run.
      </p>
    </>
  );
}
