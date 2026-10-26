"use client";
import { useLayoutEffect, useMemo, useState } from "react";
import type { NewsletterSectionLibraryItem } from "@capiro/shared/newsletter";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import type { RichDocumentController } from "../document-controller";
import { appendSavedSection } from "./sections";

type Save = {
  documentId: string;
  sectionId: string;
  sectionName: string;
  phase: "editing" | "pending" | "saved" | "unknown";
};
type View = {
  browsing: boolean;
  read: "idle" | "loading" | "ready" | "unavailable";
  items?: NewsletterSectionLibraryItem[];
  dialog: boolean;
  save?: Save;
  notice?: string;
};
const empty: View = { browsing: false, read: "idle", dialog: false };

/** Ephemeral requests only: no content, authority, queue or durable outcome. */
function sectionRequests(
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
    resetSave() {
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

/** Mounted library interaction only; the editor remains the sole draft/history owner. */
export function useSectionLibrary(
  owner: RichDocumentController,
  documentId?: string,
) {
  const api = useCapiro();
  const scope = useMemo(
    () => sectionRequests(api, owner, documentId),
    [api, owner, documentId],
  );
  const [stored, setStored] = useState<{ scope: typeof scope; view: View }>({
    scope,
    view: empty,
  });
  const view = stored.scope === scope ? stored.view : empty;
  if (stored.scope !== scope) setStored({ scope, view: empty });
  useLayoutEffect(() => scope.mount(), [scope]);
  const current = scope.current;
  const editable = () => {
    const state = owner.getSnapshot();
    return current() && !state.pending && state.recovery.phase === "ready";
  };
  const publish = (change: Partial<View>) => {
    if (current())
      setStored((previous) => ({
        scope,
        view: {
          ...(previous.scope === scope ? previous.view : empty),
          ...change,
        },
      }));
  };
  const browse = async () => {
    if (!current() || scope.writing()) return;
    const request = scope.beginRead();
    publish({
      browsing: true,
      dialog: false,
      read: "loading",
      items: undefined,
      notice: undefined,
    });
    try {
      const result = await scope.api.request(
        "workspace.richNewsletter.sections.list",
        {},
        { signal: request.signal },
      );
      if (current() && !request.signal.aborted)
        publish({ read: "ready", items: result.items });
    } catch {
      if (current() && !request.signal.aborted)
        publish({ read: "unavailable", items: undefined });
    }
  };
  return {
    ...view,
    editable: editable(),
    browse,
    closeBrowse() {
      scope.cancelRead();
      publish({ browsing: false, items: undefined, read: "idle" });
    },
    startSave(sectionId: string) {
      if (!editable() || !documentId || scope.writing()) return;
      if (view.save?.phase === "unknown") {
        publish({ dialog: true });
        return;
      }
      const section = owner
        .getSnapshot()
        .saved?.design.sections.find((item) => item.id === sectionId);
      if (!section) return;
      scope.resetSave();
      publish({
        dialog: true,
        notice: undefined,
        save: {
          documentId,
          sectionId,
          sectionName: section.name,
          phase: "editing",
        },
      });
    },
    closeSave() {
      if (!scope.writing()) publish({ dialog: false });
    },
    async submitSave(name: string, folder: string) {
      const selected = view.save;
      if (!editable() || !selected || selected.phase !== "editing") return;
      if (
        !name.trim() ||
        name.trim().length > 200 ||
        folder.trim().length > 100
      )
        return;
      const request = scope.beginWrite();
      if (!request) return;
      publish({ save: { ...selected, phase: "pending" } });
      try {
        await scope.api.request(
          "workspace.richNewsletter.sections.save",
          {
            params: { id: selected.documentId },
            body: {
              name: name.trim(),
              folder: folder.trim(),
              sectionId: selected.sectionId,
            },
          },
          { signal: request.signal },
        );
        if (current() && !request.signal.aborted)
          publish({
            dialog: false,
            save: { ...selected, phase: "saved" },
            notice:
              "Section added to your saved sections. The newsletter draft is unchanged.",
          });
      } catch {
        if (current() && !request.signal.aborted)
          publish({
            save: { ...selected, phase: "unknown" },
            items: undefined,
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
        view.read !== "ready" ||
        !view.items?.includes(item)
      )
        return;
      if (!scope.claimInsertion()) return;
      const before = owner.getSnapshot().draft;
      owner.edit((draft) => appendSavedSection(draft, item.section));
      if (owner.getSnapshot().draft === before) return;
      publish({
        browsing: false,
        items: undefined,
        read: "idle",
        notice:
          "Section inserted at the end of this draft. Save the newsletter to keep it.",
      });
      return true;
    },
  };
}
export type SectionLibrary = ReturnType<typeof useSectionLibrary>;
