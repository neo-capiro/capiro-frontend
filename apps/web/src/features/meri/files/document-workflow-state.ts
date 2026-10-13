import type { DocumentContentRequest } from "@capiro/meri-contracts/document-application";
import type {
  DocumentProblem,
  DocumentReply,
  DocumentVersionView,
  DocumentWorkflowPort,
} from "../../../shared/meri-documents/workflow-port";
import {
  documentContent,
  emptyDocumentDraft,
  type DocumentDraft,
} from "./document-draft";
import {
  emptyWorkbookDraft,
  workbookContent,
  type WorkbookDraft,
} from "./workbook-draft";
import { DocumentDownloadUrl } from "./download-url";

export type DocumentOperation = DocumentContentRequest["operation"];
type Busy = "create" | "revise" | "inspect" | "download";
export type DocumentFilesState = Readonly<{
  word: DocumentDraft;
  workbook: WorkbookDraft;
  versions: readonly DocumentVersionView[];
  selected: DocumentVersionView | null;
  revision: DocumentVersionView | null;
  acknowledged: boolean;
  inspectId: string;
  busy: Busy | null;
  problem: DocumentProblem | null;
  inputProblem: string | null;
  writeBlocked: boolean;
  attempt: ReturnType<DocumentWorkflowPort["snapshot"]>;
  download: Readonly<{ url: string; filename: string }> | null;
}>;

/** Presentation observation only. The borrowed port owns current admission and write fencing. */
export class DocumentFilesController {
  #port: DocumentWorkflowPort;
  #operation: DocumentOperation;
  #urls: DocumentDownloadUrl;
  #state: DocumentFilesState;
  #listeners = new Set<() => void>();
  #active = true;
  #generation = 0;
  #request: AbortController | null = null;

  constructor(
    port: DocumentWorkflowPort,
    operation: DocumentOperation,
    urls = new DocumentDownloadUrl(),
  ) {
    this.#port = port;
    this.#operation = operation;
    this.#urls = urls;
    this.#state = this.#initial();
  }

  #initial(): DocumentFilesState {
    return Object.freeze({
      word: emptyDocumentDraft(),
      workbook: emptyWorkbookDraft(),
      versions: Object.freeze([]),
      selected: null,
      revision: null,
      acknowledged: false,
      inspectId: "",
      busy: null,
      problem: null,
      inputProblem: null,
      writeBlocked: this.#port.snapshot().status !== "idle",
      attempt: this.#port.snapshot(),
      download: null,
    });
  }

  getSnapshot = () => this.#state;
  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };
  attach = () => {
    this.#active = true;
    return this.dispose;
  };
  dispose = () => {
    this.#active = false;
    this.#cancel();
    this.#state = this.#initial();
  };

  #set(patch: Partial<DocumentFilesState>) {
    this.#state = Object.freeze({ ...this.#state, ...patch });
    this.#listeners.forEach((listener) => listener());
  }

  #cancel() {
    ++this.#generation;
    this.#request?.abort();
    this.#request = null;
    this.#urls.clear();
  }

  #writing() {
    return this.#state.busy === "create" || this.#state.busy === "revise";
  }

  #mayWrite() {
    if (!this.#active) return false;
    const attempt = this.#port.snapshot();
    this.#set({ attempt });
    return (
      this.#active &&
      !this.#state.busy &&
      attempt.status === "idle" &&
      !this.#state.writeBlocked &&
      this.#state.problem !== "access-lost"
    );
  }

  editWord = (word: DocumentDraft) => {
    if (!this.#active || this.#writing()) return;
    if (
      this.#state.revision &&
      word.format !== this.#state.revision.metadata.format
    )
      return;
    this.#set({
      word: Object.freeze({ ...word }),
      acknowledged: false,
      inputProblem: null,
    });
  };
  editWorkbook = (workbook: WorkbookDraft) => {
    if (!this.#active || this.#writing()) return;
    this.#set({
      workbook: Object.freeze({ ...workbook }),
      acknowledged: false,
      inputProblem: null,
    });
  };
  setInspectId = (inspectId: string) => {
    if (!this.#active || this.#state.busy) return;
    this.#set({ inspectId });
  };
  acknowledge = (acknowledged: boolean) => {
    if (!this.#active || this.#state.busy || !this.#state.revision) return;
    this.#set({ acknowledged });
  };

  select = (versionId: string) => {
    if (!this.#active || this.#writing()) return;
    const selected = this.#state.versions.find(
      (view) => view.metadata.versionId === versionId,
    );
    if (!selected) return;
    this.#cancel();
    this.#set({
      selected,
      revision: null,
      acknowledged: false,
      inspectId: versionId,
      busy: null,
      download: null,
    });
  };

  beginRevision = () => {
    if (!this.#mayWrite() || !this.#state.selected) return;
    const revision = this.#state.selected;
    const format = revision.metadata.format;
    if (
      (this.#operation === "create_word" && format === "xlsx") ||
      (this.#operation === "create_excel" && format !== "xlsx")
    )
      return;
    this.#set({
      revision,
      acknowledged: false,
      ...(format === "docx" || format === "txt"
        ? { word: { ...this.#state.word, format } }
        : {}),
    });
  };
  cancelRevision = () => {
    if (!this.#active || this.#writing()) return;
    this.#set({ revision: null, acknowledged: false });
  };

  #remember = (view: DocumentVersionView) => {
    // This bounded, view-local receipt selection is not a remote file library.
    const versions = [
      ...this.#state.versions.filter(
        (item) => item.metadata.versionId !== view.metadata.versionId,
      ),
      view,
    ].slice(-10);
    this.#set({
      versions: Object.freeze(versions),
      selected: view,
      inspectId: view.metadata.versionId,
      revision: null,
      acknowledged: false,
    });
  };

  #failed(problem: DocumentProblem, read: boolean) {
    this.#urls.clear();
    this.#set({
      problem,
      download: null,
      ...(!read && problem !== "not-dispatched" && problem !== "access-lost"
        ? { writeBlocked: true }
        : {}),
      ...(read || problem === "access-lost"
        ? {
            versions: Object.freeze([]),
            selected: null,
            revision: null,
            acknowledged: false,
          }
        : {}),
    });
  }

  async #run<T>(
    kind: Busy,
    invoke: (signal: AbortSignal) => Promise<DocumentReply<T>>,
    accept: (value: T) => void,
  ) {
    if (
      !this.#active ||
      this.#state.busy ||
      this.#state.problem === "access-lost"
    )
      return;
    const request = new AbortController();
    const generation = ++this.#generation;
    this.#request = request;
    this.#urls.clear();
    this.#set({
      busy: kind,
      problem: null,
      inputProblem: null,
      download: null,
    });
    const current = () =>
      this.#active &&
      generation === this.#generation &&
      !request.signal.aborted;
    try {
      const promise = invoke(request.signal);
      this.#set({ attempt: this.#port.snapshot() });
      const reply = await promise;
      if (!current()) return;
      if (reply.ok) accept(reply.value);
      else
        this.#failed(reply.problem, kind === "inspect" || kind === "download");
    } catch {
      if (current())
        this.#failed(
          kind === "create" || kind === "revise"
            ? "unknown"
            : "read-unavailable",
          kind === "inspect" || kind === "download",
        );
    } finally {
      if (current()) this.#set({ busy: null, attempt: this.#port.snapshot() });
      if (this.#request === request) this.#request = null;
    }
  }

  submit = async () => {
    if (!this.#mayWrite()) return;
    const parent = this.#state.revision;
    if (
      parent &&
      (!this.#state.acknowledged || parent !== this.#state.selected)
    )
      return;
    let content: unknown;
    try {
      content =
        this.#operation === "create_word"
          ? documentContent(this.#state.word)
          : workbookContent(this.#state.workbook);
    } catch (error) {
      this.#set({
        inputProblem:
          error instanceof Error
            ? error.message
            : "Check the complete document input.",
      });
      return;
    }
    await this.#run(
      parent ? "revise" : "create",
      (signal) =>
        parent
          ? this.#port.revise(parent.handle, content, signal)
          : this.#port.create(content, signal),
      this.#remember,
    );
  };

  inspect = async () => {
    const selected = this.#state.selected;
    if (!selected) return;
    await this.#run(
      "inspect",
      (signal) => this.#port.inspect(selected.handle, signal),
      this.#remember,
    );
  };

  inspectKnownVersion = async () => {
    const versionId = this.#state.inspectId.trim();
    if (!versionId) return;
    await this.#run(
      "inspect",
      (signal) => this.#port.inspectVersion(versionId, signal),
      this.#remember,
    );
  };

  download = async () => {
    const selected = this.#state.selected;
    if (!selected) return;
    await this.#run(
      "download",
      (signal) => this.#port.download(selected.handle, signal),
      (result) => {
        if (
          this.#state.selected !== selected ||
          result.version.metadata.versionId !== selected.metadata.versionId
        ) {
          this.#failed("invalid-response", true);
          return;
        }
        const url = this.#urls.replace(
          new Blob([result.bytes], { type: result.version.metadata.mimeType }),
        );
        this.#set({
          download: Object.freeze({
            url,
            filename: result.version.metadata.filename,
          }),
        });
      },
    );
  };
}
