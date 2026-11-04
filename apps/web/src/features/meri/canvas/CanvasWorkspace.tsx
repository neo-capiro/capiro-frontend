"use client";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@capiro/ui/button";
import { Input } from "@capiro/ui/input";
import dynamic from "next/dynamic";
import { FileText, X } from "lucide-react";
import type { CanvasSelection } from "@capiro/meri-contracts/document-canvas";
import type { ConversationContext } from "../../../shared/meri-conversations/session";
import {
  canvasSelection,
  type CanvasAccess,
} from "../../../shared/meri-documents/canvas-access";
import { canvasQueryJournal } from "../../../shared/meri-documents/query-journal";
import { CanvasController, type CanvasState } from "./canvas-state";
import { canvasContentSupport } from "./canvas-content";
import styles from "./canvas.module.css";

const CanvasEditor = dynamic(
  () => import("./CanvasEditor").then((module) => module.CanvasEditor),
  { ssr: false, loading: () => <p role="status">Loading document editor…</p> },
);

const CanvasContext = createContext<Pick<
  CanvasController,
  "open" | "offer"
> | null>(null);
export const useDocumentCanvas = () => useContext(CanvasContext);

/** Stays mounted beside the chat while the current run and credential renew. */
export function CanvasWorkspace({
  access,
  context,
  revoked,
  conversationId,
  onRevision,
  children,
}: {
  access: CanvasAccess | null;
  context: ConversationContext | null;
  revoked: boolean;
  conversationId: string | null;
  onRevision: (selection: CanvasSelection) => void;
  children: ReactNode;
}) {
  const [controller] = useState(() => new CanvasController());
  const cache = useQueryClient();
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const journal = useMemo(
    () => (context ? canvasQueryJournal(cache, context) : null),
    [cache, context],
  );
  useLayoutEffect(() => {
    controller.setAccess(access);
  }, [access, controller]);
  useLayoutEffect(() => {
    if (revoked)
      cache.removeQueries({
        predicate: (query) =>
          query.queryKey[0] === "meri" &&
          query.queryKey[1] === "canvas-draft" &&
          query.queryKey[4] === conversationId,
      });
  }, [cache, revoked, conversationId]);
  useEffect(() => controller.dispose, [controller]);
  useEffect(() => {
    if (!context || revoked) return;
    const key = [
      "meri",
      "canvas-draft",
      context.tenantId,
      context.actorId,
      context.conversationId,
      context.selectedClientId,
    ];
    cache.setQueryDefaults(key, { gcTime: Infinity, structuralSharing: false });
    const retained = cache.getQueryData<CanvasState>(key);
    if (retained) controller.restore(retained);
    // In-memory only, under ApplicationBoundary's identity/client cache. Navigation can restore a draft.
    const retain = () => cache.setQueryData(key, controller.getSnapshot());
    retain();
    return controller.subscribe(retain);
  }, [cache, context, controller, revoked]);
  useEffect(() => {
    if (!state.dirty) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    // App Router links do not trigger beforeunload. Keep explicit navigation from silently losing edits.
    const protectLink = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.target === "_blank" ||
        link.hasAttribute("download")
      )
        return;
      const destination = new URL(link.href, window.location.href);
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
        return;
      if (!window.confirm("Leave this document and discard unsaved changes?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", protectLink, true);
    return () => {
      window.removeEventListener("beforeunload", protect);
      document.removeEventListener("click", protectLink, true);
    };
  }, [state.dirty]);
  const supported = state.draft ? canvasContentSupport(state.draft) : null;
  const disabled = !access || !!state.busy || state.blocked;
  const save = async (ask = false) => {
    if (!journal || disabled) return;
    const source = await controller.save(journal);
    if (source && ask) {
      try {
        onRevision(canvasSelection(source));
        controller.notice(
          "Document selected. Describe your changes in the chat, then send.",
        );
      } catch {
        controller.notice(
          "The version is saved, but the chat selection could not be retained. Reconnect and select it again.",
        );
      }
    }
  };
  return (
    <CanvasContext.Provider value={controller}>
      <div
        className={styles.workspace}
        data-open={state.open ? "true" : undefined}
      >
        <div className={styles.conversation}>{children}</div>
        {!state.open && state.source && (
          <Button
            type="button"
            variant="outline"
            className={styles.reopen}
            onClick={controller.show}
          >
            <FileText aria-hidden />{" "}
            {state.dirty ? "Open draft" : "Open document"}
          </Button>
        )}
        {state.open && (
          <aside className={styles.canvas} aria-label="Document canvas">
            <header className={styles.header}>
              <div>
                <h2 className={styles.heading}>
                  {state.source?.request.title ?? "Document"}
                </h2>
                <p className={styles.muted}>
                  {state.busy === "save"
                    ? "Saving version…"
                    : state.dirty
                      ? "Unsaved changes"
                      : "Document canvas"}
                </p>
              </div>
              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    disabled ||
                    !state.dirty ||
                    supported?.editable === false ||
                    !state.draft?.title.trim()
                  }
                  onClick={() => void save()}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  disabled={
                    disabled ||
                    !state.source ||
                    (supported?.editable === false && state.dirty) ||
                    !state.draft?.title.trim()
                  }
                  onClick={() => void save(true)}
                >
                  Ask Meri
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!!state.busy}
                  aria-label="Close document canvas"
                  onClick={controller.close}
                >
                  <X aria-hidden />
                </Button>
              </div>
            </header>
            <div className={styles.notice} role="status">
              {state.busy === "read"
                ? "Opening document…"
                : (state.message ??
                  (access
                    ? "Ask Meri saves your edits and selects this version for your next message."
                    : "Reconnecting document access…"))}
            </div>
            {state.dirty && (
              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!!state.busy}
                  onClick={controller.discard}
                >
                  Discard local changes
                </Button>
              </div>
            )}
            {state.blocked && journal && (
              <Button
                type="button"
                variant="outline"
                disabled={!access || !!state.busy}
                onClick={() => void controller.checkSave(journal)}
              >
                Check save
              </Button>
            )}
            {state.offered && !state.dirty && !state.busy && !state.blocked && (
              <Button
                type="button"
                variant="outline"
                disabled={!access}
                onClick={() => {
                  if (state.offered) void controller.open(state.offered);
                }}
              >
                Open Meri’s published document
              </Button>
            )}
            {state.draft && (
              <div className={styles.body}>
                <label className={styles.title}>
                  Document title
                  <Input
                    value={state.draft.title}
                    maxLength={200}
                    disabled={disabled || supported?.editable === false}
                    onChange={(event) => {
                      if (state.draft)
                        controller.edit({
                          ...state.draft,
                          title: event.target.value,
                        });
                    }}
                  />
                </label>
                <CanvasEditor
                  request={state.draft}
                  disabled={disabled}
                  onChange={(request) => {
                    if (request.format === "docx" || request.format === "txt")
                      controller.edit(request);
                  }}
                />
              </div>
            )}
          </aside>
        )}
      </div>
    </CanvasContext.Provider>
  );
}
