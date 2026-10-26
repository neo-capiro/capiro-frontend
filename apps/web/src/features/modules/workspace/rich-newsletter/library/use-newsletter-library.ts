"use client";
import { useLayoutEffect, useMemo, useState } from "react";
import type {
  NewsletterSectionLibraryItem,
  NewsletterTemplateLibraryItem,
} from "@capiro/shared/newsletter";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import type { RichDocumentController } from "../document-controller";
import { appendSavedSection } from "./sections";
import { applySavedTemplate } from "./templates";

type Collection = "section" | "template";
type Item = NewsletterSectionLibraryItem | NewsletterTemplateLibraryItem;
type Action = {
  operation: "save" | "rename" | "delete";
  collection: Collection;
  documentId?: string;
  sectionId?: string;
  itemId?: string;
  name: string;
  folder: string;
  phase: "editing" | "pending" | "saved" | "unknown";
};
type View = {
  browsing: Collection | null;
  read: "idle" | "loading" | "ready" | "unavailable";
  items?: NewsletterSectionLibraryItem[];
  templates?: NewsletterTemplateLibraryItem[];
  dialog: boolean;
  action?: Action;
  notice?: string;
};
const empty: View = { browsing: null, read: "idle", dialog: false };

/** Mounted requests only, shared by both library kinds; no durable outcome or authority. */
function libraryRequests(
  api: ReturnType<typeof useCapiro>,
  owner: RichDocumentController,
  documentId?: string,
) {
  let active = true;
  let read: AbortController | undefined;
  let write: AbortController | undefined;
  let attempted = false;
  let insertionUsed = false;
  return {
    api,
    current: () => active && owner.getSnapshot().saved?.id === documentId,
    writing: () => Boolean(write),
    mount() {
      active = true;
      return () => {
        active = false;
        read?.abort();
        write?.abort();
      };
    },
    cancelRead: () => read?.abort(),
    beginRead() {
      read?.abort();
      insertionUsed = false;
      return (read = new AbortController());
    },
    resetAction() {
      attempted = false;
    },
    beginWrite() {
      if (attempted || write) return;
      attempted = true;
      return (write = new AbortController());
    },
    endWrite(request: AbortController) {
      if (write === request) write = undefined;
    },
    claimInsertion() {
      if (insertionUsed) return false;
      insertionUsed = true;
      return true;
    },
  };
}

async function dispatchAction(
  scope: ReturnType<typeof libraryRequests>,
  action: Action,
  name: string,
  folder: string,
  signal: AbortSignal,
) {
  const body = { name: name.trim(), folder: folder.trim() };
  if (action.operation === "delete")
    return scope.api.request(
      "workspace.richNewsletter.library.remove",
      { params: { id: action.itemId! } },
      { signal },
    );
  if (action.operation === "rename")
    return scope.api.request(
      "workspace.richNewsletter.library.update",
      { params: { id: action.itemId! }, body },
      { signal },
    );
  if (action.collection === "template")
    return scope.api.request(
      "workspace.richNewsletter.templates.save",
      { params: { id: action.documentId! }, body },
      { signal },
    );
  return scope.api.request(
    "workspace.richNewsletter.sections.save",
    {
      params: { id: action.documentId! },
      body: { ...body, sectionId: action.sectionId! },
    },
    { signal },
  );
}

/** This mounted interaction owns list/request lifetime; the editor owns draft history. */
export function useNewsletterLibrary(
  owner: RichDocumentController,
  documentId?: string,
) {
  const api = useCapiro();
  const scope = useMemo(
    () => libraryRequests(api, owner, documentId),
    [api, owner, documentId],
  );
  const [stored, setStored] = useState<{ scope: typeof scope; view: View }>({
    scope,
    view: empty,
  });
  const view = stored.scope === scope ? stored.view : empty;
  if (stored.scope !== scope) setStored({ scope, view: empty });
  useLayoutEffect(() => scope.mount(), [scope]);
  const editable = () => {
    const state = owner.getSnapshot();
    return (
      scope.current() && !state.pending && state.recovery.phase === "ready"
    );
  };
  const publish = (change: Partial<View>) => {
    if (scope.current())
      setStored((previous) => ({
        scope,
        view: {
          ...(previous.scope === scope ? previous.view : empty),
          ...change,
        },
      }));
  };
  const beginAction = (action: Action) => {
    if (!editable() || scope.writing()) return;
    if (view.action?.phase === "unknown") {
      publish({ dialog: true });
      return;
    }
    scope.cancelRead();
    scope.resetAction();
    publish({
      dialog: true,
      action,
      notice: undefined,
      ...(view.read === "loading"
        ? { read: "idle", items: undefined, templates: undefined }
        : {}),
    });
  };
  const browse = async (collection: Collection = "section") => {
    if (!scope.current() || scope.writing()) return;
    const request = scope.beginRead();
    publish({
      browsing: collection,
      dialog: false,
      read: "loading",
      items: undefined,
      templates: undefined,
      notice: undefined,
      action:
        view.action?.phase === "unknown"
          ? { ...view.action, name: "", folder: "" }
          : undefined,
    });
    try {
      if (collection === "section") {
        const result = await scope.api.request(
          "workspace.richNewsletter.sections.list",
          {},
          { signal: request.signal },
        );
        if (scope.current() && !request.signal.aborted)
          publish({ read: "ready", items: result.items });
      } else {
        const result = await scope.api.request(
          "workspace.richNewsletter.templates.list",
          {},
          { signal: request.signal },
        );
        if (scope.current() && !request.signal.aborted)
          publish({ read: "ready", templates: result.items });
      }
    } catch {
      if (scope.current() && !request.signal.aborted)
        publish({
          read: "unavailable",
          items: undefined,
          templates: undefined,
        });
    }
  };
  const admitted = (item: Item) =>
    view.read === "ready" &&
    (view.browsing === "section"
      ? view.items?.some((row) => row === item)
      : view.templates?.some((row) => row === item));
  return {
    ...view,
    editable: editable(),
    writing: scope.writing(),
    browse,
    closeBrowse() {
      if (!scope.writing()) {
        scope.cancelRead();
        publish({
          browsing: null,
          items: undefined,
          templates: undefined,
          read: "idle",
        });
      }
    },
    startSave(sectionId?: string) {
      if (!documentId || !editable() || scope.writing()) return;
      const saved = owner.getSnapshot().saved;
      if (!saved || saved.id !== documentId) return;
      const section = saved?.design.sections.find(
        (item) => item.id === sectionId,
      );
      if (sectionId && !section) return;
      beginAction({
        operation: "save",
        collection: sectionId ? "section" : "template",
        documentId,
        sectionId,
        name: section?.name ?? saved.name,
        folder: "",
        phase: "editing",
      });
    },
    manage(operation: "rename" | "delete", item: Item) {
      if (!admitted(item) || !view.browsing) return;
      beginAction({
        operation,
        collection: view.browsing,
        itemId: item.id,
        name: item.name,
        folder: item.folder ?? "",
        phase: "editing",
      });
    },
    closeDialog() {
      if (!scope.writing()) publish({ dialog: false });
    },
    async submit(name: string, folder: string) {
      const action = view.action;
      if (!editable() || !action || action.phase !== "editing") return;
      if (
        !name.trim() ||
        name.trim().length > 200 ||
        folder.trim().length > 100
      )
        return;
      const request = scope.beginWrite();
      if (!request) return;
      publish({ action: { ...action, phase: "pending" } });
      try {
        await dispatchAction(scope, action, name, folder, request.signal);
        if (scope.current() && !request.signal.aborted)
          publish({
            dialog: false,
            action: { ...action, phase: "saved" },
            items: undefined,
            templates: undefined,
            read: "idle",
            notice:
              action.operation === "save"
                ? action.collection === "section"
                  ? "Section added to your saved sections. The newsletter draft is unchanged."
                  : "Template added to your saved templates. The newsletter draft is unchanged."
                : `${action.operation === "delete" ? "Delete" : "Rename/move"} acknowledged. Refresh the library to read current items. The newsletter draft is unchanged.`,
          });
      } catch {
        if (scope.current() && !request.signal.aborted)
          publish({
            action: { ...action, phase: "unknown" },
            items: undefined,
            templates: undefined,
            read: "idle",
          });
      } finally {
        scope.endWrite(request);
      }
    },
    insert(item: NewsletterSectionLibraryItem) {
      if (
        !editable() ||
        scope.writing() ||
        !admitted(item) ||
        !view.items?.includes(item) ||
        !scope.claimInsertion()
      )
        return;
      const before = owner.getSnapshot().draft;
      owner.edit((draft) => appendSavedSection(draft, item.section));
      if (owner.getSnapshot().draft === before) return;
      publish({
        browsing: null,
        items: undefined,
        read: "idle",
        notice:
          "Section inserted at the end of this draft. Save the newsletter to keep it.",
      });
      return true;
    },
    apply(item: NewsletterTemplateLibraryItem) {
      if (
        !editable() ||
        scope.writing() ||
        !admitted(item) ||
        !view.templates?.includes(item) ||
        !scope.claimInsertion()
      )
        return;
      const before = owner.getSnapshot().draft;
      owner.edit((draft) => applySavedTemplate(draft, item));
      if (owner.getSnapshot().draft === before) return;
      publish({
        browsing: null,
        templates: undefined,
        read: "idle",
        notice:
          "Template applied to this local draft. Undo restores your previous draft. Save the newsletter to keep this change.",
      });
      return true;
    },
  };
}
export type NewsletterLibrary = ReturnType<typeof useNewsletterLibrary>;
