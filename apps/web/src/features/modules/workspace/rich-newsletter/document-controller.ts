import type {
  NewsletterCampaign,
  NewsletterPreview,
  NewsletterStage,
} from "@capiro/shared/newsletter";
import { CapiroApiError } from "../../../../shared/capiro/http";
import type { createRichNewsletterAdapter } from "../../../../shared/capiro/rich-newsletter";
import { newRichDraft, type RichDraft } from "./draft";
import {
  pendingSavedWrite,
  type RichWriteJournal,
  type RichWriteState,
  type WriteIntent,
} from "./write-journal";

type Adapter = ReturnType<typeof createRichNewsletterAdapter>;
type Action =
  | "list"
  | "create"
  | "open"
  | "readback"
  | "save"
  | "preview"
  | "stage";
type Fence = "create" | "save" | "conflict" | "stage";
export type RichDocumentState = {
  draft: RichDraft;
  past: RichDraft[];
  future: RichDraft[];
  saved?: NewsletterCampaign;
  current: boolean;
  items?: NewsletterCampaign[];
  review?: NewsletterCampaign;
  preview?: NewsletterPreview;
  stage?: NewsletterStage;
  writes: RichWriteState;
  pending?: Action;
  fence?: Fence;
  error?: string;
  notice?: string;
  editorRevision: number;
};

const initialState = (writes: RichWriteState): RichDocumentState => ({
  draft: newRichDraft(),
  past: [],
  future: [],
  current: false,
  writes,
  editorRevision: 0,
});
const fromCampaign = (value: NewsletterCampaign): RichDraft =>
  structuredClone({
    name: value.name,
    design: value.design,
    config: value.config,
  });

export function hasRichChanges(state: RichDocumentState) {
  return (
    !state.saved ||
    JSON.stringify(state.draft) !== JSON.stringify(fromCampaign(state.saved))
  );
}

export function stageAttempt(state: RichDocumentState) {
  const saved = state.saved;
  if (!saved) return undefined;
  return state.writes.stages.find(
    (attempt) =>
      attempt.documentId.toLowerCase() === saved.id.toLowerCase() &&
      attempt.revision === saved.revision,
  );
}

/** Explicit-intent view owner; only attempt fences survive in the scoped journal. */
export function createRichDocumentController(
  adapter: Adapter,
  journal: RichWriteJournal,
) {
  let state = initialState(journal.read());
  let mounted = false;
  let active: AbortController | undefined;
  let activeWrite: ReturnType<RichWriteJournal["begin"]>;
  let unsubscribe = () => {};
  const listeners = new Set<() => void>();
  const publish = (change: Partial<RichDocumentState>) => {
    state = { ...state, ...change };
    listeners.forEach((listener) => listener());
  };
  const idle = () => mounted && !active;
  const writable = () =>
    idle() &&
    state.current &&
    Boolean(state.saved) &&
    !state.fence &&
    !pendingSavedWrite(journal.read(), state.saved!.id);
  async function run<T>(
    action: Action,
    request: (signal: AbortSignal) => Promise<T>,
    success: (value: T) => void,
    failure?: (error: unknown) => void,
    write?: WriteIntent,
  ) {
    if (!idle()) return;
    const controller = new AbortController();
    active = controller;
    const current = () =>
      mounted && active === controller && !controller.signal.aborted;
    const ticket = write && journal.begin(write);
    if (write && !ticket) {
      if (active === controller) active = undefined;
      return;
    }
    if (!current()) {
      if (ticket) journal.finish(ticket, "unknown");
      return;
    }
    activeWrite = ticket;
    publish({ pending: action, error: undefined, notice: undefined });
    try {
      if (!current()) return;
      const value = await request(controller.signal);
      if (current()) {
        if (ticket) journal.finish(ticket, "confirmed");
        if (current()) success(value);
      }
    } catch (error) {
      if (current()) {
        if (ticket)
          journal.finish(
            ticket,
            ticket.kind === "save" &&
              error instanceof CapiroApiError &&
              error.status === 409
              ? "conflict"
              : "unknown",
          );
        if (!current()) return;
        if (failure) failure(error);
        else
          publish({
            current: false,
            review: undefined,
            preview: undefined,
            error:
              "The current read failed. Your local draft is retained; read the owner again before saving or staging.",
          });
      }
    } finally {
      if (current()) {
        active = undefined;
        activeWrite = undefined;
        publish({ pending: undefined });
      }
    }
  }
  function reviewDocument(
    id: string,
    clientId: string | null,
    action: "open" | "readback",
  ) {
    if (!idle()) return;
    publish({
      current: false,
      review: undefined,
      preview: undefined,
      stage: undefined,
    });
    return run(
      action,
      (signal) => adapter.detail(id, clientId, signal),
      (value) => {
        publish({
          review: value,
          notice:
            "Current owner state is ready for review. It does not confirm what caused any earlier change.",
        });
      },
    );
  }
  function adopt(keepLocal: boolean) {
    if (!idle() || !state.review) return;
    const saved = state.review;
    journal.reviewSaved(saved.id);
    if (!idle()) return;
    publish({
      saved,
      current: true,
      review: undefined,
      preview: undefined,
      stage: undefined,
      fence: undefined,
      error: undefined,
      ...(keepLocal
        ? {}
        : {
            draft: fromCampaign(saved),
            past: [],
            future: [],
            editorRevision: state.editorRevision + 1,
          }),
      notice: keepLocal
        ? "Local edits retained against the reviewed revision. The next save replaces the full name, configuration and design."
        : "Using the reviewed saved document. This does not confirm a previous uncertain attempt.",
    });
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    mount() {
      mounted = true;
      publish({ writes: journal.read() });
      unsubscribe = journal.subscribe(() => {
        if (mounted) publish({ writes: journal.read() });
      });
      return () => {
        mounted = false;
        unsubscribe();
        if (activeWrite) journal.finish(activeWrite, "unknown");
        active?.abort();
        active = undefined;
        activeWrite = undefined;
        state = initialState(journal.read());
        listeners.forEach((listener) => listener());
      };
    },
    edit(change: (value: RichDraft) => RichDraft) {
      if (!idle()) return;
      publish({
        past: [...state.past.slice(-29), state.draft],
        draft: change(structuredClone(state.draft)),
        future: [],
      });
    },
    undo() {
      if (!idle() || !state.past.length) return;
      publish({
        draft: state.past.at(-1)!,
        past: state.past.slice(0, -1),
        future: [state.draft, ...state.future],
      });
    },
    redo() {
      if (!idle() || !state.future.length) return;
      publish({
        draft: state.future[0]!,
        future: state.future.slice(1),
        past: [...state.past, state.draft],
      });
    },
    list() {
      if (!idle()) return;
      publish({
        items: undefined,
        review: undefined,
        current: false,
        preview: undefined,
      });
      return run("list", adapter.list, (value) =>
        publish({ items: value.items }),
      );
    },
    create() {
      if (!idle() || state.saved || state.fence || journal.read().create)
        return;
      const name = state.draft.name;
      return run(
        "create",
        (signal) => adapter.create({ name }, signal),
        (saved) => {
          publish({
            saved,
            current: true,
            items: undefined,
            notice:
              "Saved document created. Save your local content into its revision before staging.",
          });
        },
        () =>
          publish({
            fence: "create",
            current: false,
            error:
              "Creation could not be confirmed and will not be repeated. Load documents, review a known document, then explicitly adopt or rebase it. A list cannot prove which attempt created a document.",
          }),
        { kind: "create" },
      );
    },
    open(id: string) {
      const item = state.items?.find((value) => value.id === id);
      if (!item) return;
      return reviewDocument(item.id, item.config.clientId, "open");
    },
    readback() {
      if (!state.saved) return;
      return reviewDocument(
        state.saved.id,
        state.saved.config.clientId,
        "readback",
      );
    },
    adopt: () => adopt(false),
    rebase: () => adopt(true),
    save() {
      if (!writable() || !hasRichChanges(state)) return;
      const saved = state.saved!;
      const submitted = structuredClone({
        ...state.draft,
        revision: saved.revision,
      });
      publish({ preview: undefined, review: undefined, stage: undefined });
      return run(
        "save",
        (signal) => adapter.save(saved.id, submitted, signal),
        (receipt) => {
          publish({
            saved: receipt,
            current: true,
            draft: fromCampaign(receipt),
            past: [],
            future: [],
            editorRevision: state.editorRevision + 1,
            items: undefined,
            notice: `Saved revision ${receipt.revision}.`,
          });
        },
        (error) => {
          const conflict =
            error instanceof CapiroApiError && error.status === 409;
          publish({
            current: false,
            fence: conflict ? "conflict" : "save",
            error: conflict
              ? "The saved revision changed. Your local edits are retained. Read current owner state and explicitly adopt or rebase before another save."
              : "Save could not be confirmed and will not be repeated. Your local edits are retained. Read current owner state and explicitly adopt or rebase; readback does not prove this attempt committed.",
          });
        },
        { kind: "save", documentId: saved.id, revision: saved.revision },
      );
    },
    preview() {
      if (!writable()) return;
      const id = state.saved!.id;
      publish({ preview: undefined });
      return run(
        "preview",
        (signal) => adapter.preview(id, false, signal),
        (preview) => publish({ preview }),
      );
    },
    stage() {
      if (!writable() || hasRichChanges(state) || stageAttempt(state)) return;
      const { id, revision } = state.saved!;
      publish({ preview: undefined, stage: undefined });
      return run(
        "stage",
        (signal) => adapter.stage(id, revision, signal),
        (stage) => {
          publish({
            stage,
            notice:
              "Stage receipt received. No record was opened and nothing was prepared or sent.",
          });
        },
        () =>
          publish({
            current: false,
            fence: "stage",
            error:
              "Staging could not be confirmed. This document revision remains fenced because document readback cannot recover the missing stage receipt. Review current state before any further write.",
          }),
        { kind: "stage", documentId: id, revision },
      );
    },
  };
}

export type RichDocumentController = ReturnType<
  typeof createRichDocumentController
>;
