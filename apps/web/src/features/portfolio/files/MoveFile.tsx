"use client";
import { useState } from "react";
import { MoveFiles } from "./MoveFiles";
import type { Attachment } from "./contracts";
export function MoveFile({
  clientId,
  file,
  folders,
  onClose,
}: {
  clientId: string;
  file: Attachment;
  folders: string[];
  onClose: () => void;
}) {
  const [review] = useState(() => structuredClone(file));
  return (
    <MoveFiles
      clientId={clientId}
      files={[review]}
      currentFiles={[file]}
      folders={folders}
      initialFolder={review.folder ?? ""}
      onClose={onClose}
      onSaved={onClose}
    />
  );
}
