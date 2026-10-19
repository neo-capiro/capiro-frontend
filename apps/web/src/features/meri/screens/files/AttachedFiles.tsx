"use client";
import { X } from "lucide-react";
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
  type AttachmentData,
} from "@capiro/ui/attachments";
import type { AttachedFile } from "./types";
import styles from "./files.module.css";

/**
 * Capiro files are source documents carrying their source reference; device
 * files are named only, since this disconnected fixture holds no file bytes.
 */
const toAttachment = (file: AttachedFile): AttachmentData =>
  file.origin === "capiro"
    ? {
        id: file.id,
        type: "source-document",
        sourceId: file.id,
        mediaType: file.mediaType,
        title: file.name,
        filename: file.name,
      }
    : {
        id: file.id,
        type: "file",
        mediaType: file.mediaType,
        filename: file.name,
        url: "",
      };

/** Adopted Attachments element: files attached to a local draft, each removable from the draft. */
export function AttachedFiles({
  label,
  files,
  onRemove,
}: {
  label: string;
  files: readonly AttachedFile[];
  onRemove: (id: string) => void;
}) {
  return (
    <Attachments
      variant="inline"
      className={styles.attachments}
      role="list"
      aria-label={label}
    >
      {files.map((file) => (
        <Attachment
          key={file.id}
          data={toAttachment(file)}
          onRemove={() => onRemove(file.id)}
          className={styles.attachment}
          role="listitem"
        >
          <AttachmentPreview className={styles.attachmentIcon} />
          <AttachmentInfo className={styles.attachmentName} />
          <AttachmentRemove
            className={styles.attachmentRemove}
            label={`Remove ${file.name}`}
          >
            <X aria-hidden /> Remove
          </AttachmentRemove>
        </Attachment>
      ))}
    </Attachments>
  );
}
