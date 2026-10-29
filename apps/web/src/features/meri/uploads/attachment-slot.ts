import type {
  IncomingUpload,
  UploadItem,
  UploadSendArgument,
} from "../../../shared/meri-uploads/upload-controller";
import type { SelectedTabAccess } from "../../../shared/meri-selected-tab/access";
import type { ConversationContext } from "../../../shared/meri-conversations/session";

/**
 * What the composer may show and ask for. It carries no credential, no URL and no object key, and
 * it grants no file, extraction or send authority: the service re-resolves custody at send time.
 */
export type ComposerAttachments = Readonly<{
  selectedTab?: Readonly<{
    access: SelectedTabAccess;
    context: ConversationContext;
  }>;
  /** False while no conversation session has bound an upload access; Attach stays unavailable. */
  available: boolean;
  /** Existing composer copy explaining why attachments are unavailable. */
  unavailable?: string;
  items: readonly UploadItem[];
  /**
   * Files this conversation already holds, read from its own admitted request. Selecting one reuses
   * its exact id in the next message and never writes an original again.
   */
  incoming: readonly IncomingUpload[];
  /** A bounded write or read of this conversation is in flight. */
  busy: boolean;
  /** The exact ordered ids and digests the next message would carry. */
  sendArgument: readonly UploadSendArgument[];
  onPick: (files: readonly File[]) => void;
  onCheck: (requestId: string) => void;
  onRemove: (requestId: string) => void;
  /** Aborts this page's own in-flight attempt for one row; it never undoes service custody. */
  onCancel: (requestId: string) => void;
  onToggleIncoming: (uploadId: string) => void;
  limit: number;
}>;
