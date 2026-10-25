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
  creating = false,
  initialFolder = "",
}: {
  clientId: string;
  files: readonly Attachment[];
  folders: string[];
  currentFiles: readonly Attachment[];
  onClose: () => void;
  onSaved: () => void;
  creating?: boolean;
  initialFolder?: string;
}) {
  const move = useBatchMove(clientId, onSaved);
  const [folder, setFolder] = useState(initialFolder);
  const [error, setError] = useState<Error>();
  const held = move.attempt?.command;
  const count = held?.files.length ?? files.length;
  return (
    <Dialog
      open
      title={
        creating
          ? "New folder"
          : count === 1
            ? "Move to folder"
            : "Move selected files"
      }
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
          {creating ? "Folder name" : "Destination folder"}
          <input
            list="batch-move-folders"
            maxLength={120}
            required={creating}
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
              : move.attempt?.refusal
                ? "Core confirmed this move was refused and no files were moved. Review current files before clearing the saved move."
                : "The move is unconfirmed. The original files, revisions and folder are retained. Check its receipt or retry the same request."}
          </p>
        )}
        {held ? (
          <div className="row">
            {move.attempt?.refusal ? (
              <button
                type="button"
                className="button"
                disabled={!move.canRetire}
                onClick={move.retire}
              >
                Review fresh files and clear refused move
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>
        ) : (
          <button
            className="button primary"
            disabled={
              !move.canStart ||
              count < 1 ||
              count > 100 ||
              (creating && !folder.trim())
            }
          >
            {creating
              ? "Create folder & move file"
              : count === 1
                ? "Move file"
                : `Move ${count} files`}
          </button>
        )}
      </form>
    </Dialog>
  );
}
