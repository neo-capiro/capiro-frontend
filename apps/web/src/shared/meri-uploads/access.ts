import {
  createUploadAttemptReferences,
  type UploadAttemptScope,
} from "./upload-attempt-storage";
import {
  createUploadController,
  type EstablishedUpload,
  type UploadController,
} from "./upload-controller";
import { createUploadWire } from "./upload-wire";
import {
  createUploadCurrentRead,
  type UploadCurrentRead,
} from "./current-read";

/**
 * The conversation session's upload access. It is the explicit port member every attachment
 * consumer reads, so no consumer asserts a shape onto the port and none of them holds the session
 * credential: this module owns the one wire that credential was bound to, and the controller it
 * built, for exactly this session lifetime.
 */
export type MeriUploadAccess = Readonly<{
  items: UploadController["items"];
  incoming: UploadController["incoming"];
  toggle: UploadController["toggle"];
  version: UploadController["version"];
  subscribe: UploadController["subscribe"];
  /** A bounded upload operation of this session is in flight. */
  pending: UploadController["pending"];
  /** The exact ordered argument the next message of this session would carry. */
  sendArgument: UploadController["sendArgument"];
  add: UploadController["add"];
  check: UploadController["check"];
  remove: UploadController["remove"];
  cancel: UploadController["cancel"];
  /**
   * The current read of an upload the conversation already holds, under this same session: a saved
   * upload source event names an original, and only this owner may re-query it.
   */
  current: UploadCurrentRead;
  dispose: () => void;
}>;

export function createUploadAccess(options: {
  /** The current conversation session credential; it never leaves this module. */
  credential: string;
  context: Omit<UploadAttemptScope, "clientId"> & {
    selectedClientId: string | null;
  };
  /** The session lifetime; the access stops dispatching the moment it is revoked or renewed. */
  lifetime: AbortSignal;
  /** False once this session's conversation, account or client is no longer current. */
  isCurrent: () => boolean;
  /** Sources the displayed conversation already holds, read from its own admitted snapshot. */
  established?: () => readonly EstablishedUpload[];
  fetcher?: typeof fetch;
}): MeriUploadAccess {
  const controller = createUploadController({
    wire: createUploadWire(
      options.credential,
      options.lifetime,
      options.fetcher,
    ),
    isCurrent: options.isCurrent,
    recovery: createUploadAttemptReferences({
      tenantId: options.context.tenantId,
      actorId: options.context.actorId,
      clientId: options.context.selectedClientId,
      conversationId: options.context.conversationId,
    }),
    ...(options.established ? { established: options.established } : {}),
  });
  const current = createUploadCurrentRead(
    options.credential,
    options.lifetime,
    options.isCurrent,
    options.fetcher,
  );
  const dispose = () => {
    options.lifetime.removeEventListener("abort", dispose);
    controller.dispose();
  };
  if (options.lifetime.aborted) dispose();
  else options.lifetime.addEventListener("abort", dispose, { once: true });
  return Object.freeze({ ...controller, current, dispose });
}
