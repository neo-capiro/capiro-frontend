"use client";
import { useState } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { useFileMetadataChange } from "./useFileMetadataChange";
import { FileMetadataStatus } from "./FileMetadataStatus";
import type { Attachment } from "./contracts";
export function MoveFile({
  clientId,
  file,
  folders,
  onClose,
  creating = false,
}: {
  clientId: string;
  file: Attachment;
  folders: string[];
  onClose: () => void;
  creating?: boolean;
}) {
  const move = useFileMetadataChange(clientId, file.id, onClose);
  const draft = move.attempt?.change;
  const [folder, setFolder] = useState(
    draft?.kind === "move"
      ? (draft.folder ?? "")
      : creating
        ? ""
        : (file.folder ?? ""),
  );
  const [search, setSearch] = useState("");
  return (
    <Dialog
      open
      title={creating ? "New folder" : "Move to folder"}
      description={`File organization for ${file.fileName}.`}
      onOpenChange={(open) => {
        if (!open && !move.isPending) onClose();
      }}
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (move.blocked) return;
          move.mutate({
            kind: "move",
            folder: folder.trim() || null,
          });
        }}
      >
        {creating ? (
          <label>
            Folder name
            <input
              required
              autoFocus
              maxLength={120}
              disabled={move.blocked}
              value={folder}
              onChange={(event) => setFolder(event.target.value)}
            />
          </label>
        ) : (
          <>
            <input
              aria-label="Search folders"
              placeholder="Search folders"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <fieldset disabled={move.blocked}>
              <legend>Destination</legend>
              {["", ...folders]
                .filter((name) =>
                  name.toLowerCase().includes(search.toLowerCase()),
                )
                .map((name) => (
                  <label className="row" key={name}>
                    <input
                      type="radio"
                      name="folder"
                      checked={folder === name}
                      onChange={() => setFolder(name)}
                    />
                    {name || "Unfiled"}
                  </label>
                ))}
            </fieldset>
          </>
        )}
        <p className="muted">
          Folders are shared labels on files. No physical copy is created. Empty
          folders are not persisted.
        </p>
        <FileMetadataStatus change={move} kind="move" />
        <button
          className="button primary"
          disabled={move.blocked || (creating && !folder.trim())}
        >
          {creating ? "Create folder & move file" : "Move file"}
        </button>
      </form>
    </Dialog>
  );
}
