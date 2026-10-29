import { Button } from "@capiro/ui/button";
import type { LibraryVersion } from "../../../shared/meri-documents/library-access";
import styles from "./files.module.css";

export function LibraryVersions({
  versions,
  busy,
  history,
  onSelect,
}: {
  versions: readonly LibraryVersion[];
  busy: boolean;
  history: boolean;
  onSelect(version: LibraryVersion): void;
}) {
  if (versions.length === 0) return null;
  return (
    <ul className={styles.stack}>
      {versions.map((version) => (
        <li key={version.versionId}>
          <Button
            variant="outline"
            className={styles.button}
            disabled={busy}
            onClick={() => onSelect(version)}
          >
            {version.filename} · {new Date(version.createdAt).toLocaleString()}
          </Button>
          <p className={styles.muted}>
            {version.mimeType} · {version.object.bytes} bytes
            {history && version.parentVersionId === null
              ? " · Original version"
              : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
