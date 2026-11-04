import type {
  CanvasSelection,
  DocumentCanvasContent,
  DocumentCanvasSource,
} from "@capiro/meri-contracts/document-canvas";
import type { CanvasAccess } from "../../../shared/meri-documents/canvas-access";
import type { DocumentAttemptJournal } from "../../../shared/meri-documents/attempt-journal";

export type CanvasState = Readonly<{
  source: DocumentCanvasSource | null;
  draft: DocumentCanvasContent | null;
  dirty: boolean;
  open: boolean;
  busy: "read" | "save" | null;
  message: string | null;
  offered: CanvasSelection | null;
  blocked: boolean;
}>;
const initial = (): CanvasState => ({
  source: null,
  draft: null,
  dirty: false,
  open: false,
  busy: null,
  message: null,
  offered: null,
  blocked: false,
});

/** View-local drafts survive run replacement; the conversation cache owns uncertain saves. */
export class CanvasController {
  #state = initial();
  #listeners = new Set<() => void>();
  #work: AbortController | null = null;
  #access: CanvasAccess | null = null;
  #offered = new Set<string>();
  getSnapshot = () => this.#state;
  restore = (state: CanvasState) => {
    if (this.#state.source || this.#state.busy) return;
    this.#set({ ...state, busy: null });
  };
  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };
  #set(patch: Partial<CanvasState>) {
    this.#state = { ...this.#state, ...patch };
    this.#listeners.forEach((listener) => listener());
  }
  setAccess(access: CanvasAccess | null) {
    if (access === this.#access) return;
    this.#work?.abort();
    this.#work = null;
    this.#access = access;
    this.#set({ busy: null });
  }
  dispose = () => {
    this.#work?.abort();
    this.#work = null;
    this.#access = null;
  };
  edit = (draft: DocumentCanvasContent) => {
    if (this.#state.busy || !this.#access) return;
    this.#set({
      draft,
      dirty:
        JSON.stringify(draft) !== JSON.stringify(this.#state.source?.request),
      message: null,
    });
  };
  close = () => {
    if (!this.#state.busy) this.#set({ open: false });
  };
  show = () => {
    if (this.#state.source) this.#set({ open: true });
  };
  notice = (message: string) => this.#set({ message });
  discard = () => {
    if (!this.#state.busy && this.#state.source)
      this.#set({
        draft: this.#state.source.request,
        dirty: false,
        message: null,
      });
  };
  /** Streaming publication is a suggestion. It can never overwrite a local dirty draft. */
  offer = (selection: CanvasSelection) => {
    if (this.#offered.has(selection.versionId)) return;
    this.#offered.add(selection.versionId);
    if (this.#state.source?.version.versionId === selection.versionId) return;
    if (this.#state.dirty || this.#state.busy || this.#state.blocked) {
      this.#set({
        offered: selection,
        message:
          "Meri published a document. Your draft is preserved; save or discard it before opening the update.",
      });
      return;
    }
    void this.open(selection);
  };
  open = async (selection: CanvasSelection) => {
    if (!this.#access || this.#state.busy) return;
    if (this.#state.source?.version.versionId === selection.versionId) {
      this.show();
      return;
    }
    if (this.#state.dirty || this.#state.blocked) {
      this.#set({
        open: true,
        offered: selection,
        message: "Save or discard your draft before opening another document.",
      });
      return;
    }
    const access = this.#access,
      work = new AbortController();
    this.#work = work;
    this.#set({ open: true, busy: "read", message: null, offered: null });
    const result = await access.read(selection, work.signal);
    if (work.signal.aborted || this.#work !== work) return;
    this.#work = null;
    this.#set(
      result.ok
        ? {
            source: result.value,
            draft: result.value.request,
            dirty: false,
            busy: null,
            offered: this.#state.offered,
            message: null,
          }
        : { busy: null, message: result.message },
    );
  };
  save = async (
    journal: DocumentAttemptJournal,
  ): Promise<DocumentCanvasSource | null> => {
    const { source, draft, busy, dirty } = this.#state;
    if (!this.#access || !source || !draft || busy) return null;
    if (!dirty) return source;
    const access = this.#access,
      work = new AbortController();
    this.#work = work;
    this.#set({ busy: "save", message: null });
    const result = await access.save(source, draft, journal, work.signal);
    if (work.signal.aborted || this.#work !== work) return null;
    this.#work = null;
    if (!result.ok) {
      this.#set({
        busy: null,
        blocked: result.uncertain === true,
        message: result.message,
      });
      return null;
    }
    this.#set({
      source: result.value,
      draft: result.value.request,
      dirty: false,
      busy: null,
      message: "Version saved.",
    });
    return result.value;
  };
  checkSave = async (journal: DocumentAttemptJournal) => {
    const { source, draft, busy } = this.#state;
    if (!this.#access || !source || !draft || busy) return;
    const work = new AbortController();
    this.#work = work;
    this.#set({ busy: "read", message: "Checking saved versions…" });
    const result = await this.#access.checkSave(source, journal, work.signal);
    if (work.signal.aborted || this.#work !== work) return;
    this.#work = null;
    this.#set(
      result.ok
        ? {
            source: result.value,
            draft: result.value.request,
            dirty: false,
            blocked: false,
            busy: null,
            message: "Your changes are present in the saved version.",
          }
        : { busy: null, message: result.message },
    );
  };
}
