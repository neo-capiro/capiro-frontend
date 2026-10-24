"use client";
import { useState } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { Attachment } from "./contracts";
import { batchMoveCommand } from "./batch-move";
import { useBatchMove } from "./useBatchMove";

export function MoveFiles({
  clientId,
  files,
  currentFiles,
  folders,
  onClose,
  onSaved,
}: {
  clientId: string;
  files: readonly Attachment[];
  folders: string[];
  currentFiles: readonly Attachment[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const move = useBatchMove(clientId, onSaved);
  const [folder, setFolder] = useState("");
  const [error, setError] = useState<Error>();
  const held = move.attempt?.command;
  const count = held?.files.length ?? files.length;
  return (
    <Dialog
      open
      title="Move selected files"
      description={`Review all ${count} files before moving them together.`}
      onOpenChange={(open) => {
        if (!open && !move.pending) onClose();
      }}
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (!move.canStart) return;
          try {
            const command = batchMoveCommand(clientId, files, folder);
            setError(undefined);
            move.start(command);
          } catch {
            setError(
              new Error(
                "Each selected file needs a current revision. Refresh the files and review the selection again.",
              ),
            );
          }
        }}
      >
        <ul>
          {(held?.files ?? files).map((file) => (
            <li key={file.id}>
              {currentFiles.find((selected) => selected.id === file.id)
                ?.fileName ?? "Selected file unavailable in this view"}
            </li>
          ))}
        </ul>
        <label>
          Destination folder
          <input
            list="batch-move-folders"
            maxLength={120}
            disabled={!move.canStart}
            value={held ? (held.folder ?? "") : folder}
            onChange={(event) => setFolder(event.target.value)}
          />
        </label>
        <datalist id="batch-move-folders">
          {folders.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <p className="muted">
          Leave blank for Unfiled. Folders are shared labels. All selected files
          move together; no physical copies are created.
        </p>
        <QueryState error={error ?? move.error} />
        {held && (
          <p role="status">
            {move.pending
              ? "Confirming the selected move…"
              : "The move is unconfirmed. The original files, revisions and folder are retained. Check its receipt or retry the same request."}
          </p>
        )}
        {held ? (
          <div className="row">
            <button
              type="button"
              className="button"
              disabled={!move.canCheck}
              onClick={move.check}
            >
              Check move outcome
            </button>
            <button
              type="button"
              className="button"
              disabled={!move.canRetry}
              onClick={move.retry}
            >
              Retry same move
            </button>
          </div>
        ) : (
          <button
            className="button primary"
            disabled={!move.canStart || count < 2 || count > 100}
          >
            Move {count} files
          </button>
        )}
      </form>
    </Dialog>
  );
}
