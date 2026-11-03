import { z } from "zod";
import type { ConversationContext } from "../../../shared/meri-conversations/session";
import {
  requireMeriTabStorage,
  tabRecord,
  type TabStorage,
} from "../../../shared/meri-conversations/tab-journal";
import type { PreviewAccess } from "../../../shared/meri-documents/preview-access";

export function previewJournal(
  context: ConversationContext,
  versionId: string,
  storage?: TabStorage,
) {
  const ready = requireMeriTabStorage(storage);
  if (!ready) throw Error("Preview attempt cannot be retained");
  return tabRecord(
    { ...context, clientId: context.selectedClientId },
    "preview",
    (value) => z.enum(["unresolved", "complete"]).parse(value),
    versionId,
    ready,
  );
}
type State = Readonly<{
  busy: boolean;
  publication: "available" | "unresolved" | "complete" | "blocked";
  url: string | null;
  pages: number | null;
  message: string | null;
}>;
const refused =
  "Current authority refused this preview action. Reading an existing preview and publishing a new one have separate permissions.";
const unsupported = "This file does not support a PDF preview.";
/**
 * Each admitted reply code keeps its own meaning; only an unrecognised code is a bare failure.
 * The publication receipt admits every error code, while a preview read admits bytes only, so a
 * read refusal arrives here as PREVIEW_READ_UNAVAILABLE and is never quoted as a stored record.
 */
const messages: Readonly<Record<string, string>> = {
  ARTIFACT_RENDERER_UNAVAILABLE:
    "A qualified preview renderer is not available for this file.",
  ARTIFACT_PREVIEW_UNSUPPORTED: unsupported,
  NATIVE_PREVIEW_UNSUPPORTED: unsupported,
  ARTIFACT_PREVIEW_PENDING:
    "No stored preview record exists for this saved version. A missing record does not prove that a publication is not in flight.",
  PREVIEW_UNAVAILABLE: "PDF preview is not configured for this environment.",
  PREVIEW_READ_UNAVAILABLE:
    "The preview read did not complete, so no preview result is known.",
  DOCUMENT_CONFIGURATION:
    "Document access is misconfigured for this environment.",
  ACCESS_DENIED: refused,
  SESSION_REFUSED: refused,
  UNAUTHENTICATED: refused,
};
const messageFor = (code: string) =>
  messages[code] ?? "No verified preview result was returned.";

/** Bounded read/display state and a persisted publication fence; a missing read is never proof of no effect. */
export class DocumentPreviewController {
  private state: State = {
    busy: false,
    publication: "blocked",
    url: null,
    pages: null,
    message: null,
  };
  private listeners = new Set<() => void>();
  private request = new AbortController();
  private journal?: ReturnType<typeof previewJournal>;
  private attached = false;
  constructor(
    private port: PreviewAccess,
    private context: ConversationContext,
    private versionId: string,
    private storage?: TabStorage,
    private urls = {
      create: (bytes: Uint8Array<ArrayBuffer>) =>
        URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })),
      revoke: (url: string) => URL.revokeObjectURL(url),
    },
  ) {}
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private update(value: Partial<State>) {
    this.state = { ...this.state, ...value };
    for (const fn of this.listeners) fn();
  }
  attach() {
    this.attached = true;
    this.request = new AbortController();
    try {
      this.journal = previewJournal(this.context, this.versionId, this.storage);
      this.update({ publication: this.journal.read() ?? "available" });
    } catch {
      this.update({
        publication: "blocked",
        message:
          "This tab cannot retain a preview publication attempt. Existing previews can still be read.",
      });
    }
    return () => {
      this.attached = false;
      this.request.abort();
      if (this.state.url) this.urls.revoke(this.state.url);
      this.update({ busy: false, url: null, pages: null });
    };
  }
  async read() {
    if (!this.attached || this.state.busy) return;
    const signal = this.request.signal;
    if (this.state.url) this.urls.revoke(this.state.url);
    this.update({ busy: true, message: null, url: null, pages: null });
    try {
      const reply = await this.port.readPreview(this.versionId, signal);
      if (signal.aborted) return;
      if (!reply.ok) {
        this.update({ message: messageFor(reply.code) });
        return;
      }
      if (reply.value.version.versionId !== this.versionId)
        throw Error("Preview changed");
      const url = this.urls.create(reply.value.bytes);
      if (this.state.url) this.urls.revoke(this.state.url);
      this.update({
        url,
        pages: reply.value.preview.pages,
        publication: "complete",
        message: "PDF bytes verified for this saved version.",
      });
      try {
        this.journal?.write("complete");
      } catch {
        /* A verified read does not become a new write grant. */
      }
    } catch {
      if (!signal.aborted)
        this.update({
          message:
            "The preview could not be verified. Any publication uncertainty is retained.",
        });
    } finally {
      if (!signal.aborted) this.update({ busy: false });
    }
  }
  async publish() {
    if (
      !this.attached ||
      this.state.busy ||
      this.state.publication !== "available" ||
      !this.journal
    )
      return;
    try {
      this.journal.write("unresolved");
    } catch {
      this.update({
        publication: "blocked",
        message:
          "The preview attempt could not be saved; nothing was dispatched.",
      });
      return;
    }
    const signal = this.request.signal;
    this.update({ busy: true, publication: "unresolved", message: null });
    try {
      const reply = await this.port.publishPreview(this.versionId, signal);
      if (signal.aborted) return;
      if (!reply.ok) {
        if (reply.outcome === "NOT_DISPATCHED") {
          this.journal.clear();
          this.update({
            publication: "available",
            message: messageFor(reply.code),
          });
        } else
          this.update({
            message: `${messageFor(reply.code)} Check the existing preview before any further publication.`,
          });
        return;
      }
      this.journal.write("complete");
      this.update({
        publication: "complete",
        message:
          "Preview publication verified. Open the existing preview to verify and display its bytes.",
      });
    } catch {
      if (!signal.aborted)
        this.update({
          message:
            "Preview publication is uncertain. Check the existing preview; no new publication will be sent.",
        });
    } finally {
      if (!signal.aborted) this.update({ busy: false });
    }
  }
}
