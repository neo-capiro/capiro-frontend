"use client";
import { useState } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import type { Attachment } from "./contracts";
import { captureBatchMove } from "./batch-move-contract";
import type { useBatchMove } from "./useBatchMove";
import styles from "./batch-move.module.css";

export function BatchMoveDialog({
  clientId,
  files,
  folders,
  move,
  onClose,
}: {
  clientId: string;
  files: Attachment[];
  folders: string[];
  move: ReturnType<typeof useBatchMove>;
  onClose: () => void;
}) {
  const [folder, setFolder] = useState(""),
    [search, setSearch] = useState("");
  const [error, setError] = useState<string>();
  return (
    <Dialog
      open
      title="Move to folder"
      eyebrow="File organization"
      description={`Review all ${files.length} selected files. The service moves the complete selection together.`}
      className={styles.dialog}
      onOpenChange={(open) => {
        if (!open && !move.busy) onClose();
      }}
    >
      <form
        className="stack"
        data-design-node="1064:168460"
        onSubmit={(event) => {
          event.preventDefault();
          if (move.locked) return;
          try {
            move.send(captureBatchMove(clientId, files, folder));
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Review this selection.",
            );
          }
        }}
      >
        <input
          aria-label="Search folders"
          placeholder="Search folders"
          value={search}
          disabled={move.locked}
          onChange={(event) => setSearch(event.target.value)}
        />
        <fieldset className={styles.destinations} disabled={move.locked}>
          <legend className="srOnly">Destination</legend>
          {["", ...folders]
            .filter((name) => name.toLowerCase().includes(search.toLowerCase()))
            .map((name) => (
              <label key={name} className={styles.destination}>
                <input
                  type="radio"
                  name="batch-folder"
                  checked={folder === name}
                  onChange={() => setFolder(name)}
                />
                <span aria-hidden className={styles.folder} />
                {name || "Unfiled"}
              </label>
            ))}
        </fieldset>
        <p>
          Destination: <strong>{folder || "Unfiled"}</strong>
        </p>
        <details>
          <summary>{files.length} reviewed files</summary>
          <ul>
            {files.map((file) => (
              <li key={file.id}>{file.fileName}</li>
            ))}
          </ul>
        </details>
        {(error || move.error) && <p role="alert">{error ?? move.error}</p>}
        {move.pending && (
          <div role="status">
            <p>
              The result is unconfirmed. Check this exact batch; it will not be
              sent again automatically.
            </p>
            <button
              type="button"
              className="button"
              disabled={move.busy}
              onClick={move.recover}
            >
              Check batch result
            </button>
          </div>
        )}
        {move.confirmed && (
          <p role="status">
            {move.confirmed} Current file organization may have changed since
            that receipt.
          </p>
        )}
        <p className="muted">
          Folders are shared labels. No physical copy is created and file access
          stays with each file.
        </p>
        <footer className={styles.footer}>
          <button
            type="button"
            className="button"
            disabled={move.busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={move.locked || !!move.confirmed}
          >
            Move {files.length} items
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
