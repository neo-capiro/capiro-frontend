"use client";
import type { Attachment } from "./contracts";
import styles from "./files.module.css";
export function FolderCards({
  files,
  onOpen,
}: {
  files: Attachment[];
  onOpen: (folder: string) => void;
}) {
  const folders = [...new Set(files.map((file) => file.folder ?? ""))].sort();
  return (
    <div className={styles.folderGrid} aria-label="File folders">
      {folders.map((folder) => {
        const contents = files.filter((file) => (file.folder ?? "") === folder);
        const latest = contents
          .map((file) => file.createdAt)
          .sort()
          .at(-1);
        const extensions = [
          ...new Set(
            contents
              .map((file) =>
                file.fileName.split(".").slice(1).at(-1)?.toUpperCase(),
              )
              .filter(Boolean),
          ),
        ];
        return (
          <button
            key={folder}
            className={styles.folderCard}
            onClick={() => onOpen(folder)}
            aria-label={`Open folder ${folder || "Unfiled"}`}
          >
            <span className={styles.folderCardIcon} aria-hidden="true">
              ▤
            </span>
            <strong>{folder || "Unfiled"}</strong>
            <span>
              {contents.length} {contents.length === 1 ? "file" : "files"}
            </span>
            <span className={styles.folderCardFooter}>
              <span>{extensions.join(" · ") || "Files"}</span>
              {latest && (
                <time dateTime={latest}>
                  {new Date(latest).toLocaleDateString()}
                </time>
              )}
            </span>
          </button>
        );
      })}
      {!folders.length && (
        <p className="empty">No folders match these files.</p>
      )}
    </div>
  );
}
