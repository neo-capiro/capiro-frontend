import type {
  NewsletterCampaign,
  NewsletterPreview,
  NewsletterStage,
} from "@capiro/shared/newsletter";
import { CapiroApiError } from "../../../../shared/capiro/http";
import type { createRichNewsletterAdapter } from "../../../../shared/capiro/rich-newsletter";
import { newRichDraft, type RichDraft } from "./draft";
import {
  type RichWriteJournal,
  type RichWriteState,
  type WriteIntent,
} from "./write-journal";
import { RecoveryStorageError } from "@/shared/session/recovery/journal";
import {
  sameRichWrite,
  RichRecoveryScopeError,
  type RichRetainedWrite,
  type RichWriteRecovery,
  type RecoveryLifetime,
} from "./write-recovery";

type Adapter = ReturnType<typeof createRichNewsletterAdapter>;
type Action =
  | "list"
  | "create"
  | "open"
  | "readback"
  | "save"
  | "preview"
  | "recoverStage"
  | "stage";
type Fence = "stage";
type RecoveryView = {
  phase: "loading" | "ready" | "held" | "blocked";
  operation?: "create" | "save";
  requestId?: string;
  outcome?: RichRetainedWrite["outcome"];
};
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
  recovery: RecoveryView;
};

const initialState = (writes: RichWriteState): RichDocumentState => ({
  draft: newRichDraft(),
  past: [],
  future: [],
  current: false,
  writes,
  editorRevision: 0,
  recovery: { phase: "loading" },
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

/** View lifetime and explicit adoption; durable write recovery remains in its canonical journal. */
export function createRichDocumentController(
  adapter: Adapter,
  journal: RichWriteJournal,
  recovery: RichWriteRecovery,
) {
  let state = initialState(journal.read());
  let mounted = false;
  let active: AbortController | undefined;
  let activeWrite: ReturnType<RichWriteJournal["begin"]>;
  let unsubscribe = () => {};
  let retained: RichRetainedWrite | null = null;
  let draftVisible = false;
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
    state.recovery.phase === "ready" &&
    !retained;
  const lifetime = (signal: AbortSignal): RecoveryLifetime => ({
    signal,
    assert: () => {
      signal.throwIfAborted();
      if (!mounted)
        throw new DOMException("The newsletter context changed.", "AbortError");
    },
  });
  function install(record: RichRetainedWrite | null) {
    retained = record;
    publish({
      recovery: record
        ? {
            phase: "held",
            operation: record.operation,
            requestId: record.body.requestId,
            outcome: record.outcome,
          }
        : { phase: "ready" },
    });
  }
  function writeFailure(error: unknown) {
    const denied =
      error instanceof RichRecoveryScopeError ||
      (error instanceof CapiroApiError &&
        [401, 403, 404].includes(error.status));
    const blocked = denied || error instanceof RecoveryStorageError;
    if (denied) draftVisible = false;
    publish({
      current: false,
      preview: undefined,
      review: undefined,
      recovery: { ...state.recovery, phase: blocked ? "blocked" : "held" },
      ...(denied
        ? {
            draft: newRichDraft(),
            past: [],
            future: [],
            saved: undefined,
            items: undefined,
            stage: undefined,
          }
        : {}),
      error: blocked
        ? error instanceof Error
          ? error.message
          : "Recovery is unavailable."
        : "Request not confirmed. Check this retained request; no write will be repeated.",
    });
  }
  async function run<T>(
    action: Action,
    request: (signal: AbortSignal) => Promise<T>,
    success: (value: T, current: () => boolean) => void,
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
        if (current()) success(value, current);
      }
    } catch (error) {
      if (current()) {
        if (ticket) journal.finish(ticket, "unknown");
        if (!current()) return;
        if (failure) failure(error);
        else if (
          error instanceof CapiroApiError &&
          [401, 403, 404].includes(error.status)
        )
          writeFailure(error);
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
    clientId: string | null | undefined,
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
        const restoreRetained =
          !draftVisible &&
          retained &&
          (retained.operation === "save"
            ? retained.documentId
            : retained.outcome?.kind === "committed"
              ? retained.outcome.receipt.documentId
              : undefined
          )?.toLowerCase() === value.id.toLowerCase()
            ? retained
            : undefined;
        publish({
          review: value,
          ...(restoreRetained
            ? {
                draft: structuredClone(restoreRetained.draft),
                recovery: { ...state.recovery, phase: "held" },
              }
            : {}),
          notice:
            "Current owner state is ready for review. It does not confirm what caused any earlier change.",
        });
        if (restoreRetained) draftVisible = true;
      },
    );
  }
  function applyReview(saved: NewsletterCampaign, keepLocal: boolean) {
    draftVisible = true;
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
  function adopt(keepLocal: boolean) {
    if (!idle() || !state.review || (retained && !retained.outcome)) return;
    const reviewed = state.review;
    if (!retained) {
      if (state.recovery.phase !== "ready") return;
      applyReview(reviewed, keepLocal);
      return;
    }
    const original = retained;
    return run(
      "readback",
      (signal) => recovery.resolve(original, reviewed, lifetime(signal)),
      (saved) => {
        install(null);
        applyReview(saved, keepLocal);
      },
      writeFailure,
    );
  }
  function recoverWrite() {
    if (!idle()) return;
    return run(
      "readback",
      async (signal) => {
        const context = lifetime(signal);
        const record = await recovery.hydrate(context);
        if (retained && (!record || !sameRichWrite(retained, record)))
          throw new RecoveryStorageError();
        if (!record) return { record: null, accessible: false };
        const expected = retained?.outcome ? retained : record;
        install(expected);
        return recovery.reconcile(expected, context);
      },
      (result) => {
        install(result.record);
        if (result.accessible && result.record && !draftVisible) {
          draftVisible = true;
          publish({
            draft: structuredClone(result.record.draft),
            past: [],
            future: [],
            editorRevision: state.editorRevision + 1,
          });
        }
        publish({
          notice: result.record
            ? result.record.outcome?.kind === "committed"
              ? `This request saved revision ${result.record.outcome.receipt.revision}. Read current saved content separately before adopting or rebasing.`
              : result.record.outcome?.kind === "refused"
                ? "This save made no change. Read current saved content before adopting or rebasing."
                : "No committed receipt was returned. This request remains unconfirmed and will not be repeated."
            : undefined,
        });
      },
      writeFailure,
    );
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
      void recoverWrite();
      return () => {
        mounted = false;
        unsubscribe();
        if (activeWrite) journal.finish(activeWrite, "unknown");
        active?.abort();
        active = undefined;
        activeWrite = undefined;
        retained = null;
        draftVisible = false;
        state = initialState(journal.read());
        listeners.forEach((listener) => listener());
      };
    },
    edit(change: (value: RichDraft) => RichDraft) {
      if (!idle() || state.recovery.phase !== "ready") return;
      draftVisible = true;
      publish({
        past: [...state.past.slice(-29), state.draft],
        draft: change(structuredClone(state.draft)),
        future: [],
      });
    },
    undo() {
      if (!idle() || state.recovery.phase !== "ready" || !state.past.length)
        return;
      publish({
        draft: state.past.at(-1)!,
        past: state.past.slice(0, -1),
        future: [state.draft, ...state.future],
      });
    },
    redo() {
      if (!idle() || state.recovery.phase !== "ready" || !state.future.length)
        return;
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
      if (
        !idle() ||
        state.saved ||
        state.fence ||
        state.recovery.phase !== "ready" ||
        retained
      )
        return;
      const draft = structuredClone(state.draft);
      return run(
        "create",
        (signal) =>
          recovery.dispatch(
            { operation: "create", draft },
            lifetime(signal),
            install,
          ),
        (record) => {
          install(record);
          publish({
            current: false,
            items: undefined,
            notice:
              record.outcome?.kind === "committed"
                ? "The create request has a committed receipt. Read current saved content, then adopt it or rebase your retained local draft."
                : "A retained request remains unconfirmed. No creation will be repeated.",
          });
        },
        writeFailure,
      );
    },
    open(id: string) {
      const item = state.items?.find((value) => value.id === id);
      if (!item) return;
      return reviewDocument(item.id, item.config.clientId, "open");
    },
    readback() {
      const id =
        retained?.outcome?.kind === "committed"
          ? retained.outcome.receipt.documentId
          : retained?.operation === "save"
            ? retained.documentId
            : undefined;
      if (id) return reviewDocument(id, undefined, "readback");
      if (!state.saved) return;
      return reviewDocument(
        state.saved.id,
        state.saved.config.clientId,
        "readback",
      );
    },
    adopt: () => adopt(false),
    rebase: () => adopt(true),
    recoverWrite,
    save() {
      if (!writable() || !hasRichChanges(state)) return;
      const saved = state.saved!;
      const draft = structuredClone(state.draft);
      publish({ preview: undefined, review: undefined, stage: undefined });
      return run(
        "save",
        (signal) =>
          recovery.dispatch(
            {
              operation: "save",
              draft,
              documentId: saved.id,
              revision: saved.revision,
            },
            lifetime(signal),
            install,
          ),
        (record) => {
          install(record);
          publish({
            current: false,
            items: undefined,
            notice:
              record.outcome?.kind === "refused"
                ? "This save made no change. Read current saved content before adopting or rebasing."
                : record.outcome?.kind === "committed"
                  ? `This request saved revision ${record.outcome.receipt.revision}. Current content must be read separately.`
                  : "Another retained request must be resolved before saving.",
          });
        },
        writeFailure,
      );
    },
    preview() {
      if (!writable()) return;
      const { id, revision } = state.saved!;
      publish({ preview: undefined });
      return run(
        "preview",
        (signal) => adapter.preview(id, revision, false, signal),
        (preview) => publish({ preview }),
      );
    },
    recoverStage(attemptNumber: number) {
      if (!idle() || !state.saved) return;
      const attempt = journal
        .read()
        .stages.find(
          (entry) =>
            entry.attempt === attemptNumber &&
            entry.status === "unknown" &&
            entry.documentId.toLowerCase() === state.saved!.id.toLowerCase(),
        );
      if (!attempt) return;
      const retained = () =>
        journal
          .read()
          .stages.find(
            (entry) =>
              entry.attempt === attempt.attempt &&
              entry.documentId.toLowerCase() ===
                attempt.documentId.toLowerCase() &&
              entry.revision === attempt.revision,
          );
      publish({ stage: undefined });
      return run(
        "recoverStage",
        (signal) =>
          adapter.stagedRevision(attempt.documentId, attempt.revision, signal),
        (stage, current) => {
          if (!retained()) return;
          if (stage === null) {
            publish({
              notice: `No stage was returned for revision ${attempt.revision}. The attempt remains uncertain and will not be repeated.`,
            });
            return;
          }
          journal.finish({ ...attempt, kind: "stage" }, "confirmed");
          if (!current() || retained()?.status !== "confirmed") return;
          publish({
            stage,
            notice:
              "An exact staged revision was found. This does not establish which earlier request created it or change your editable baseline. Nothing was opened, prepared or sent.",
          });
        },
        () =>
          publish({
            error:
              "Stage lookup failed. The attempt remains uncertain and will not be repeated; your saved baseline and write fences are unchanged.",
          }),
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
              "Staging could not be confirmed. This document revision will not be staged again. Check its exact stage receipt separately; review current saved state before any further write.",
          }),
        { kind: "stage", documentId: id, revision },
      );
    },
  };
}

export type RichDocumentController = ReturnType<
  typeof createRichDocumentController
>;
