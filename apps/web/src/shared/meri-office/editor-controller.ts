import type {
  OfficeSnapshot,
  OfficeDocument,
  OfficeFailure,
  OfficeLaunch,
  OfficeRoute,
  OfficeResponseMap,
} from "@capiro/meri-contracts/office-application";
import type { OfficeTransport, OfficeInput } from "./transport";
import { confirmOfficeSave } from "./save-confirmation";

export interface OfficeFrame {
  launch(value: OfficeLaunch): void;
  renew(value: OfficeLaunch): void;
  save(signal: AbortSignal): Promise<void>;
  dispose(): void;
}
export type OfficeEditorMode = "edit" | "view";
export type OfficeEditorState = Readonly<{
  connected: boolean;
  busy: string | null;
  snapshot: OfficeSnapshot | null;
  publication: OfficeDocument | null;
  frame: boolean;
  ready: boolean;
  modified: boolean;
  uncertain: boolean;
  notice: string;
  /** The mode the open frame was launched with; a non-head revision is viewed, never edited. */
  mode: OfficeEditorMode;
  /** A Save of modified edits is in flight: they are not yet confirmed stored, so they still count as unsaved. */
  saving: boolean;
}>;
const initial: OfficeEditorState = Object.freeze({
  connected: false,
  busy: null,
  snapshot: null,
  publication: null,
  frame: false,
  ready: false,
  modified: false,
  uncertain: false,
  notice: "",
  mode: "edit",
  saving: false,
});
type OfficeError = OfficeFailure["error"];
class Refused extends Error {
  constructor(
    readonly code: OfficeError["code"],
    readonly outcome: OfficeError["outcome"],
  ) {
    super(code);
  }
}
const reasons: Partial<Record<OfficeError["code"], string>> = {
  NOT_FOUND: "This document or its private draft is no longer available.",
  UNAVAILABLE: "Document editing is unavailable right now.",
  DEADLINE: "The document service did not answer in time.",
  TOO_LARGE: "The document is too large for the editor.",
  PUBLISH_UNRESOLVED: "The publication could not be resolved.",
};
/** The plain reason for a failed action. A refusal the service never received changed nothing, so it asks for a
 * retry, not a recovery; any other failure may have taken effect and needs the saved draft read again. */
function failureNotice(refusal: Refused | null) {
  if (refusal?.code === "CONFLICT")
    return "The draft or editor changed. Recover its current state before continuing.";
  if (!refusal)
    return "The operation was not confirmed. Recover the saved draft before continuing.";
  const untouched = refusal.outcome === "NOT_DISPATCHED";
  const reason =
    reasons[refusal.code] ??
    (untouched
      ? "The request did not reach the document service."
      : "The document service did not confirm the result.");
  return untouched
    ? `${reason} Nothing changed; try again.`
    : `${reason} Recover the saved draft before continuing.`;
}
type Port = OfficeTransport;

/** Local interaction state only. Core owns every draft, sequence and lease. A
 * frame acknowledgement only triggers a fresh read; it never triggers Publish.
 * CODE's own controls (Save, Save As, close) arrive as requests and run the same
 * confirmed sequences as the host's buttons. */
export class OfficeEditorController {
  private state = initial;
  private listeners = new Set<() => void>();
  private transport: OfficeTransport | null = null;
  private work: AbortController | null = null;
  private closed = false;
  private renewalPending = false;
  private modificationEpoch = 0;
  constructor(
    private readonly options: {
      selection: { versionId: string; draftId: string; editorId: string };
      frame: OfficeFrame;
      onPublished?: (document: OfficeDocument) => void;
      onDiscarded?: () => void;
      /** The editor was released on request (CODE's close or the host's Close editor). */
      onClosed?: () => void;
    },
  ) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  pending = () => this.state.busy !== null;
  ownsEditor = () =>
    this.state.snapshot?.editor.editorId === this.options.selection.editorId;
  private update(patch: Partial<OfficeEditorState>) {
    if (this.closed) return;
    this.state = Object.freeze({ ...this.state, ...patch });
    for (const listener of this.listeners) listener();
  }
  private keep(snapshot: OfficeSnapshot) {
    // Launch fields never enter snapshots or navigation caches.
    this.update({ snapshot: { ...snapshot, launch: null }, uncertain: false });
  }
  private key() {
    return {
      versionId: this.options.selection.versionId,
      draftId: this.options.selection.draftId,
    };
  }
  private async request<R extends OfficeRoute>(
    port: OfficeTransport,
    route: R,
    input: OfficeInput<R>,
    signal: AbortSignal,
  ): Promise<OfficeResponseMap[R]> {
    const reply = await port.request(route, input, signal);
    signal.throwIfAborted();
    if (port !== this.transport || this.closed)
      throw new Error("Office connection changed");
    if ("error" in reply.value)
      throw new Refused(reply.value.error.code, reply.value.error.outcome);
    return reply.value as OfficeResponseMap[R];
  }
  /** Resolves true only when the work completed; a refusal, an abort or a lost connection resolve false. */
  private async run(
    label: string,
    work: (port: OfficeTransport, signal: AbortSignal) => Promise<void>,
  ): Promise<boolean> {
    if (this.closed || this.work || !this.transport) return false;
    const controller = new AbortController(),
      port = this.transport;
    this.work = controller;
    this.update({ busy: label, notice: "" });
    try {
      await work(port, controller.signal);
      return true;
    } catch (error) {
      if (controller.signal.aborted || this.closed || port !== this.transport)
        return false;
      const refusal = error instanceof Refused ? error : null;
      this.closeFrame();
      this.update({
        uncertain:
          refusal?.outcome === "NOT_DISPATCHED" ? this.state.uncertain : true,
        notice: failureNotice(refusal),
      });
      return false;
    } finally {
      if (this.work === controller) {
        this.work = null;
        this.update({ busy: null });
        if (
          this.renewalPending &&
          this.state.frame &&
          this.state.ready &&
          this.transport
        )
          void this.renew();
      }
    }
  }
  bind(port: OfficeTransport) {
    if (this.closed) return;
    this.transport = port;
    this.update({ connected: true });
    if (this.state.frame) {
      this.renewalPending = true;
      if (this.state.ready) void this.renew();
    }
  }
  suspend() {
    this.transport = null;
    this.update({ connected: false });
  }
  accessLost() {
    this.work?.abort();
    this.work = null;
    this.transport = null;
    this.closeFrame();
    this.update({
      ...initial,
      notice:
        "Current access ended. Saved private work remains with the service.",
    });
  }
  ready = () => {
    if (!this.state.frame || this.closed) return;
    this.update({ ready: true });
    if (this.renewalPending && !this.work) void this.renew();
  };
  modified = (value: boolean) => {
    if (value) this.modificationEpoch++;
    this.update({ modified: value });
  };
  frameUnavailable = (
    reason: "closed" | "expired" | "save-unknown" | "disposed",
  ) => {
    if (reason === "disposed" || !this.state.frame) return;
    this.work?.abort();
    this.work = null;
    this.closeFrame();
    this.update({
      busy: null,
      uncertain: true,
      notice:
        "The editor connection ended. Recover the saved draft before continuing.",
    });
  };
  private closeFrame() {
    this.renewalPending = false;
    this.update({ frame: false, ready: false, modified: false });
    this.options.frame.dispose();
  }
  recover = () =>
    this.run("Recovering saved draft…", async (port, signal) => {
      this.keep(await this.request(port, "read", this.key(), signal));
      this.update({ notice: "Current saved draft loaded." });
    });
  /** Opens the frame; `view` for a revision that is no longer the head, whose edits could never publish. */
  open = (takeover = false, mode: OfficeEditorMode = "edit") =>
    this.run("Opening editor…", async (port, signal) => {
      if (this.state.frame) return;
      const opened = await this.request(port, "open", this.key(), signal);
      this.keep(opened);
      const { editor } = opened,
        editorId = this.options.selection.editorId;
      if (
        editor.editorId !== null &&
        editor.editorId !== editorId &&
        !takeover
      ) {
        this.update({
          notice:
            "This document is open in another editor. Take over only when you want to replace that editor.",
        });
        return;
      }
      const result =
        editor.editorId === editorId
          ? await this.request(
              port,
              "renew",
              { ...this.key(), editorId, expectedEpoch: editor.epoch, mode },
              signal,
            )
          : await this.request(
              port,
              "launch",
              {
                ...this.key(),
                editorId,
                expectedEpoch: editor.epoch,
                mode,
                operation: takeover ? "takeover" : "acquire",
              },
              signal,
            );
      if (!result.launch) throw new Error("Editor launch missing");
      this.keep(result);
      this.update({ frame: true, ready: false, modified: false, mode });
      this.options.frame.launch(result.launch);
    });
  private renew = () =>
    this.run("Renewing editor access…", async (port, signal) => {
      this.renewalPending = false;
      const editor = this.state.snapshot?.editor;
      if (!editor?.editorId) throw new Error("Editor lease unavailable");
      const result = await this.request(
        port,
        "renew",
        {
          ...this.key(),
          editorId: editor.editorId,
          expectedEpoch: editor.epoch,
          mode: this.state.mode,
        },
        signal,
      );
      if (!result.launch) throw new Error("Editor renewal missing");
      this.options.frame.renew(result.launch);
      this.keep(result);
    });
  /** CODE's Save acknowledgement, then the canonical draft read that confirms a newer stored revision. */
  private async saveWith(port: Port, signal: AbortSignal) {
    const epoch = this.modificationEpoch,
      modified = this.state.modified,
      before = await this.request(port, "read", this.key(), signal);
    if (before.editor.editorId !== this.options.selection.editorId)
      throw new Error("Editor lease changed");
    this.update({ saving: modified });
    try {
      await this.options.frame.save(signal);
      signal.throwIfAborted();
      const saved = await confirmOfficeSave({
        before,
        read: (readSignal) =>
          this.request(port, "read", this.key(), readSignal),
        modified: () => modified || this.modificationEpoch !== epoch,
        signal,
      });
      this.keep(saved);
    } finally {
      this.update({ saving: false });
    }
  }
  private async releaseWith(port: Port, signal: AbortSignal) {
    const editor = this.state.snapshot?.editor;
    if (!editor?.editorId) throw new Error("Editor lease unavailable");
    this.closeFrame();
    this.keep(
      await this.request(
        port,
        "release",
        {
          ...this.key(),
          editorId: editor.editorId,
          expectedEpoch: editor.epoch,
        },
        signal,
      ),
    );
  }
  /** A saved, released, not yet published draft: what Publish turns into the next revision. */
  private unpublishedDraft() {
    const saved = this.state.snapshot;
    return !this.state.frame &&
      saved !== null &&
      saved.editor.editorId === null &&
      !!saved.draft.sha256 &&
      saved.draft.sequence > 0 &&
      saved.draft.state !== "published"
      ? saved
      : null;
  }
  private async publishWith(port: Port, signal: AbortSignal, notify = true) {
    const saved = this.unpublishedDraft();
    if (!saved) throw new Error("No released saved draft to publish");
    const result = await this.request(
      port,
      "publish",
      {
        ...this.key(),
        sequence: saved.draft.sequence,
        sha256: saved.draft.sha256!,
      },
      signal,
    );
    this.update({
      snapshot: { ...saved, draft: result.draft },
      publication: result.publication,
      uncertain: false,
      notice: "Revision published.",
    });
    if (notify) this.options.onPublished?.(result.publication);
  }
  save = () => {
    if (!this.state.frame || !this.state.ready || this.state.mode !== "edit")
      return Promise.resolve();
    return this.run("Saving…", async (port, signal) => {
      await this.saveWith(port, signal);
      this.update({
        notice:
          "Private Save confirmed by the service. Publish remains a separate action.",
      });
    });
  };
  /** Close on request (CODE's close, the host's Close editor, leaving the page): pending changes are saved, the editor
   * is released, and a draft with saves since the last publication becomes a revision, so no private work is left
   * unpublished behind a closed editor. The caller learns of the close, not of a publication it did not ask for. */
  /** `notify: false` is the leave guard's close: the guard owns the destination, so the host's after-close navigation
   * is skipped. Resolves true only when the close was confirmed. */
  close = (notify = true) => {
    if (
      (this.state.frame && !this.state.ready) ||
      this.state.snapshot?.editor.editorId !== this.options.selection.editorId
    )
      return Promise.resolve(false);
    const busy = this.state.busy;
    if (busy) {
      // Leaving waits for the operation in flight; say so instead of refusing silently.
      this.update({ notice: `${busy} Wait for it to finish before leaving.` });
      return Promise.resolve(false);
    }
    return this.run("Closing editor…", async (port, signal) => {
      const editing = this.state.frame && this.state.mode === "edit";
      if (editing && this.state.modified) await this.saveWith(port, signal);
      await this.releaseWith(port, signal);
      if (editing && this.unpublishedDraft())
        await this.publishWith(port, signal, false);
      this.update({
        notice: this.state.publication
          ? "Editor closed; your saved changes were published as a revision."
          : "Editor closed.",
      });
      if (notify) this.options.onClosed?.();
    });
  };
  publish = () => {
    if (!this.unpublishedDraft() || this.state.uncertain)
      return Promise.resolve();
    return this.run("Publishing revision…", (port, signal) =>
      this.publishWith(port, signal),
    );
  };
  /** CODE's Save As, or the host's Publish while editing: save pending changes, release the editor, publish the
   * saved draft as the next immutable revision. Each step is the same confirmed sequence as its own action. */
  publishRevision = () => {
    if (
      this.state.uncertain ||
      (this.state.frame && !this.state.ready) ||
      this.state.mode !== "edit" ||
      this.state.snapshot?.draft.state === "published"
    )
      return Promise.resolve();
    if (!this.state.frame) return this.publish();
    return this.run("Publishing revision…", async (port, signal) => {
      if (this.state.modified || this.state.snapshot!.draft.sequence < 1)
        await this.saveWith(port, signal);
      await this.releaseWith(port, signal);
      await this.publishWith(port, signal);
    });
  };
  discard = () => {
    if (this.state.frame) return Promise.resolve();
    return this.run("Discarding private draft…", async (port, signal) => {
      await this.request(port, "discard", this.key(), signal);
      this.update({
        snapshot: null,
        publication: null,
        uncertain: false,
        notice: "Private draft discarded.",
      });
      this.options.onDiscarded?.();
    });
  };
  dispose() {
    this.work?.abort();
    this.work = null;
    this.closeFrame();
    this.closed = true;
    this.transport = null;
    this.listeners.clear();
  }
}
