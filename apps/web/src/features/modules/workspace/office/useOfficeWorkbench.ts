import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { OfficeDocument } from "@capiro/meri-contracts/office-application";
import { officeDraftSelection } from "../../../../shared/meri-office/draft-selection";
import { createOfficeEditorHost } from "../../../../shared/meri-office/editor-host";
import { OfficeFrameHost } from "../../../../shared/meri-office/frame-host";
import { installLeaveGuard, type LeaveGuard } from "./leave-guard";

/** The Office document the Workspace route opens: one artifact version in its conversation's scope. */
export type OfficeWorkspaceTarget = Readonly<{
  versionId: string;
  conversationId: string;
  clientId: string | null;
  /** Only for a freshly imported original, which is editable before any submitted chat turn. */
  runId?: string | undefined;
}>;
/** Where the opened version stands in its lineage, read from the immutable history before the editor opens. */
export type OfficeHead = Readonly<{ latest: boolean; headVersionId: string }>;

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
    /** In-app navigation the leave guard performs after the close. */
    navigate(href: string): void;
  },
) {
  const queries = useQueryClient(),
    container = useRef<HTMLDivElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [head, setHead] = useState<OfficeHead | null>(null);
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
    return { ...host, navigate: handlers.navigate };
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
  // The route opened this document: once current access is confirmed, the history says whether this version is
  // still the head. The head opens for editing; an older revision opens read-only, since a publication from it
  // could only be refused as a stale parent after the person had edited. One attempt per port: an attempt the
  // port change aborted before the open is retried on the next ready port.
  const port = connection.status === "ready" ? connection.port : null;
  const opened = useRef(false);
  useEffect(() => {
    if (!port || opened.current) return;
    opened.current = true;
    const request = new AbortController();
    let done = false;
    void (async () => {
      let latest = true,
        headVersionId = target.versionId;
      try {
        const reply = await port.history(target.versionId, request.signal);
        if (reply.ok) {
          headVersionId = reply.value.headVersionId;
          latest = headVersionId === target.versionId;
        }
      } catch {
        // Unknown lineage opens for editing; the service still refuses a stale publication.
      }
      if (request.signal.aborted) return;
      done = true;
      setHead({ latest, headVersionId });
      void host.editor.open(false, latest ? "edit" : "view");
    })();
    return () => {
      request.abort();
      if (!done) opened.current = false;
    };
  }, [port, host, target.versionId]);
  // In-app navigation while the editor holds unsaved edits goes through the same close first; the guard owns the
  // destination afterwards, so the host's own after-close navigation is skipped. One guard per mount; its history
  // trap is armed only while edits are unsaved, so an unmodified editor, a Save or a renewal never changes history.
  const guard = useRef<LeaveGuard | null>(null);
  useEffect(() => {
    const installed = installLeaveGuard({
      view: window,
      leave: () => host.editor.close(false),
      navigate: host.navigate,
    });
    guard.current = installed;
    return () => {
      installed.dispose();
      if (guard.current === installed) guard.current = null;
    };
  }, [host]);
  const unsaved =
    state.frame && state.mode === "edit" && (state.modified || state.saving);
  useEffect(() => guard.current?.sync(unsaved), [unsaved]);
  return {
    host,
    state,
    connection,
    container,
    head,
    history: { open: historyOpen, setOpen: setHistoryOpen },
  };
}
