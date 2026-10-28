import type {
  UploadItem,
  UploadSendArgument,
} from "../../../shared/meri-uploads/upload-controller";

/**
 * What the composer may show and ask for. It carries no credential, no URL and no object key, and
 * it grants no file, extraction or send authority: the service re-resolves custody at send time.
 */
export type ComposerAttachments = Readonly<{
  /** False while no conversation session has bound an upload access; Attach stays unavailable. */
  available: boolean;
  /** Existing composer copy explaining why attachments are unavailable. */
  unavailable?: string;
  items: readonly UploadItem[];
  /** A bounded write or read of this conversation is in flight. */
  busy: boolean;
  /** The exact ordered ids and digests the next message would carry. */
  sendArgument: readonly UploadSendArgument[];
  onPick: (files: readonly File[]) => void;
  onCheck: (requestId: string) => void;
  onRemove: (requestId: string) => void;
  limit: number;
}>;
