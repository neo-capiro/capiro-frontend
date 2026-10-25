"use client";
import { useState } from "react";
import { MoveFiles } from "./MoveFiles";
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
  const [review] = useState(() => structuredClone(file));
  return (
    <MoveFiles
      clientId={clientId}
      files={[review]}
      currentFiles={[file]}
      folders={folders}
      creating={creating}
      initialFolder={creating ? "" : (review.folder ?? "")}
      onClose={onClose}
      onSaved={onClose}
    />
  );
}
