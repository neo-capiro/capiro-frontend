import { SessionLifetimeController } from "../meri-actions/opaque-session-controller";
import { bootstrapLibrarySession } from "../meri-documents/library-session";
import { bootstrapConversationSession } from "../meri-conversations/session";
import { OfficeEditorController, type OfficeFrame } from "./editor-controller";
import type { OfficeDocument } from "@capiro/meri-contracts/office-application";
import { createOfficeBrowserPort } from "./file-access";
import type { officeDraftSelection } from "./draft-selection";

/** Reuses the existing native session owner; routine renewal preserves the frame,
 * while expiry, access loss, cache retirement and unmount clear it immediately. */
export function createOfficeEditorHost(options: {
  account: { tenantId: string; actorId: string };
  origin: { conversationId: string; clientId: string | null };
  recovery: ReturnType<typeof officeDraftSelection>;
  frame: OfficeFrame;
  /** A freshly imported original can be edited before a submitted chat turn. */
  sessionRunId?: string;
  onDiscarded?: () => void;
  onPublished?: (document: OfficeDocument) => void;
}) {
  const editor = new OfficeEditorController({
    selection: options.recovery.selection,
    frame: options.frame,
    onDiscarded: () => {
      options.recovery.forget();
      options.onDiscarded?.();
    },
    ...(options.onPublished ? { onPublished: options.onPublished } : {}),
  });
  const session = new SessionLifetimeController({
    issue: (signal) =>
      options.sessionRunId
        ? bootstrapConversationSession(
            { ...options.origin, runId: options.sessionRunId },
            options.account,
            signal,
          )
        : bootstrapLibrarySession({
            account: options.account,
            ...options.origin,
            signal,
          }),
    createPort: ({ session: receipt, signal, isCurrent, onAccessLost }) =>
      createOfficeBrowserPort({
        credential: receipt.credential,
        lifetime: signal,
        isCurrent: () => isCurrent() && options.recovery.isCurrent(),
        onAccessLost,
      }),
    busy: (port) => editor.pending() || port.pending(),
  });
  const synchronize = () => {
    const state = session.getSnapshot();
    if (state.status === "ready") editor.bind(state.port);
    else if (
      state.status === "expired" &&
      session.getExpirationReason() === "renewal"
    ) {
      editor.suspend();
      void session.connect();
    } else if (state.status === "connecting") editor.suspend();
    else editor.accessLost();
  };
  return {
    editor,
    session,
    attach() {
      const detach = session.attach(),
        unsubscribe = session.subscribe(synchronize);
      const uncache = options.recovery.subscribe(() => session.revoke());
      void session.connect();
      return () => {
        unsubscribe();
        uncache();
        detach();
        editor.accessLost();
      };
    },
  };
}
