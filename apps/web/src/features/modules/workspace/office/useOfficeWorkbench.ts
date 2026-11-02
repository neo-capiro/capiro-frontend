import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { OfficeDocument } from "@capiro/meri-contracts/office-application";
import { officeDraftSelection } from "../../../../shared/meri-office/draft-selection";
import { createOfficeEditorHost } from "../../../../shared/meri-office/editor-host";
import { OfficeFrameHost } from "../../../../shared/meri-office/frame-host";

/** The Office document the Workspace route opens: one artifact version in its conversation's scope. */
export type OfficeWorkspaceTarget = Readonly<{
  versionId: string;
  conversationId: string;
  clientId: string | null;
  /** Only for a freshly imported original, which is editable before any submitted chat turn. */
  runId?: string | undefined;
}>;

/** Connects the mounted workbench to the account cache and session lifetime. CODE's own controls arrive through
 * the frame channel and run the controller's confirmed sequences; the revision panel opens on CODE's request.
 * The handlers are captured once with the host: the screen is keyed by the opened version, so what a publication
 * or a close means for the route does not change while this host lives. */
export function useOfficeWorkbench(
  account: { tenantId: string; actorId: string },
  target: OfficeWorkspaceTarget,
  handlers: {
    onPublished(document: OfficeDocument): void;
    onClosed(): void;
    onDiscarded(): void;
  },
) {
  const queries = useQueryClient(),
    container = useRef<HTMLDivElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [host] = useState(() => {
    const origin = {
      conversationId: target.conversationId,
      clientId: target.clientId,
    };
    const recovery = officeDraftSelection(queries, {
      ...account,
      ...origin,
      versionId: target.versionId,
    });
    const frame = new OfficeFrameHost({
      container: () => container.current,
      callbacks: {
        ready: () => host.editor.ready(),
        modified: (value) => host.editor.modified(value),
        renew: () => {
          void host.session.connect();
        },
        unavailable: (reason) => host.editor.frameUnavailable(reason),
        saveRequested: () => void host.editor.save(),
        saveAsRequested: () => void host.editor.publishRevision(),
        closeRequested: () => void host.editor.close(),
        historyRequested: () => setHistoryOpen(true),
      },
    });
    const host = createOfficeEditorHost({
      account,
      origin,
      recovery,
      frame,
      ...(target.runId ? { sessionRunId: target.runId } : {}),
      onPublished: handlers.onPublished,
      onClosed: handlers.onClosed,
      onDiscarded: handlers.onDiscarded,
    });
    return host;
  });
  useEffect(() => host.attach(), [host]);
  const state = useSyncExternalStore(
    host.editor.subscribe,
    host.editor.getSnapshot,
    host.editor.getSnapshot,
  );
  const connection = useSyncExternalStore(
    host.session.subscribe,
    host.session.getSnapshot,
    host.session.getSnapshot,
  );
  // The route opened this document: the editor opens as soon as current access is confirmed, once.
  const opened = useRef(false);
  useEffect(() => {
    if (connection.status !== "ready" || opened.current) return;
    opened.current = true;
    void host.editor.open();
  }, [connection.status, host]);
  return {
    host,
    state,
    connection,
    container,
    history: { open: historyOpen, setOpen: setHistoryOpen },
  };
}
