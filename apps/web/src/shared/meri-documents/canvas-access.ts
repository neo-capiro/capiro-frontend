import {
  receiveCanvasRequest,
  type CanvasSelection,
  type DocumentCanvasContent,
  type DocumentCanvasSource,
} from "@capiro/meri-contracts/document-canvas";
import type { ConversationSessionReceipt } from "@capiro/meri-contracts/conversation-session";
import type { DocumentAttemptJournal } from "./attempt-journal";
import { idleDocumentAttempt } from "./attempt-journal";
import {
  canvasTransport,
  DocumentAccessUnavailable,
} from "./workflow-transport";
import { createArtifactAccess } from "./artifact-access";

export type CanvasReply<T> =
  | { ok: true; value: T }
  | { ok: false; message: string; uncertain?: boolean };
export interface CanvasAccess {
  checkSave(
    source: DocumentCanvasSource,
    journal: DocumentAttemptJournal,
    signal: AbortSignal,
  ): Promise<CanvasReply<DocumentCanvasSource>>;
  read(
    selection: CanvasSelection,
    signal: AbortSignal,
  ): Promise<CanvasReply<DocumentCanvasSource>>;
  save(
    source: DocumentCanvasSource,
    request: DocumentCanvasContent,
    journal: DocumentAttemptJournal,
    signal: AbortSignal,
  ): Promise<CanvasReply<DocumentCanvasSource>>;
}
export const canvasSelection = (
  source: DocumentCanvasSource,
): CanvasSelection => ({
  artifactId: source.version.artifactId,
  versionId: source.version.versionId,
  objectSha256: source.version.object.sha256,
});
const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
const canonicalBytes = (value: unknown) =>
  new TextEncoder().encode(
    JSON.stringify(value, (_key, item) =>
      item && typeof item === "object" && !Array.isArray(item)
        ? Object.fromEntries(
            Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
          )
        : item,
    ),
  );
const fingerprint = async (value: unknown) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", canonicalBytes(value)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");

/** The existing admitted conversation owns credentials, current access and disposal. */
export function createCanvasAccess({
  session,
  lifetime,
  isCurrent,
  onAccessLost,
  now = Date.now,
  fetcher = fetch,
}: {
  session: ConversationSessionReceipt;
  lifetime: AbortSignal;
  isCurrent: () => boolean;
  onAccessLost: () => void;
  now?: () => number;
  fetcher?: typeof fetch;
}): CanvasAccess {
  const transport = canvasTransport(session.credential, lifetime, fetcher);
  const artifacts = createArtifactAccess(session.credential, lifetime, fetcher);
  const current = (signal: AbortSignal) => {
    signal.throwIfAborted();
    lifetime.throwIfAborted();
    if (!isCurrent() || now() >= session.expiresAtMs)
      throw Error("Document access changed. Reconnect before continuing.");
  };
  const admit = (source: DocumentCanvasSource) => {
    const { context } = session,
      { version } = source;
    const clients = version.scopes.filter((scope) => scope.kind === "client");
    if (
      version.binding.tenantId !== context.tenantId ||
      version.binding.actorId !== context.actorId ||
      version.binding.conversationId !== context.conversationId ||
      (context.selectedClientId === null
        ? clients.length !== 0 ||
          !version.scopes.some(
            (scope) =>
              scope.kind === "private-user" &&
              scope.resourceId === context.actorId,
          )
        : clients.length !== 1 ||
          clients[0]?.resourceId !== context.selectedClientId)
    )
      throw Error("The document does not belong to this conversation.");
    return source;
  };
  const access: CanvasAccess = {
    async checkSave(source, journal, signal) {
      try {
        current(signal);
        const attempt = journal.read();
        const original = await access.read(canvasSelection(source), signal);
        if (!original.ok) return original;
        if (original.value.headVersionId === source.version.versionId)
          return {
            ok: false,
            uncertain: true,
            message:
              "The save is still unconfirmed. Your draft is preserved; checking again will not send another save.",
          };
        const head = await artifacts.inspect(
          original.value.headVersionId,
          signal,
        );
        current(signal);
        if (!head.ok) {
          if (head.accessDenied) onAccessLost();
          throw Error("Read refused");
        }
        if (
          head.value.kind !== "generated" ||
          head.value.artifactId !== source.version.artifactId
        )
          throw Error("Different document");
        const latest = await access.read(
          {
            artifactId: head.value.artifactId,
            versionId: head.value.versionId,
            objectSha256: head.value.objectSha256,
          },
          signal,
        );
        current(signal);
        if (!latest.ok) return latest;
        const observed = await fingerprint({
          selection: canvasSelection(source),
          deliveryId: attempt.attemptId,
          request: latest.value.request,
        });
        current(signal);
        if (
          latest.value.version.parentVersionId !== source.version.versionId ||
          latest.value.headVersionId !== latest.value.version.versionId ||
          !attempt.fingerprints.includes(observed) ||
          journal.read() !== attempt
        )
          return {
            ok: false,
            uncertain: true,
            message:
              "A different version is now saved. Your draft is preserved; review the file’s version history before continuing.",
          };
        journal.write(idleDocumentAttempt);
        return latest;
      } catch (error) {
        if (error instanceof DocumentAccessUnavailable && !lifetime.aborted)
          onAccessLost();
        return {
          ok: false,
          uncertain: true,
          message: "The save could not be checked. Your draft is preserved.",
        };
      }
    },
    async read(selection, signal) {
      try {
        current(signal);
        const request = receiveCanvasRequest(
          "canvas-read",
          bytes({ selection }),
        );
        const { status, value } = await transport(
          "canvas-read",
          request,
          signal,
        );
        current(signal);
        if (status === 401 || status === 403) onAccessLost();
        if ("error" in value)
          return {
            ok: false,
            message:
              "This document cannot be opened in canvas. Its download and Office editor remain available.",
          };
        return { ok: true, value: admit(value) };
      } catch (error) {
        if (error instanceof DocumentAccessUnavailable && !lifetime.aborted)
          onAccessLost();
        return {
          ok: false,
          message: "The document could not be loaded. Try opening it again.",
        };
      }
    },
    async save(source, content, journal, signal) {
      if (journal.read().status !== "idle")
        return {
          ok: false,
          uncertain: true,
          message:
            "An earlier save is unconfirmed. Check the file’s versions before making another save.",
        };
      let dispatched = false;
      try {
        current(signal);
        admit(source);
        const request = receiveCanvasRequest(
          "canvas-save",
          bytes({
            selection: canvasSelection(source),
            deliveryId: crypto.randomUUID(),
            request: content,
          }),
        );
        const capturedFingerprint = await fingerprint(request);
        current(signal);
        journal.write({
          status: "pending",
          fingerprints: [capturedFingerprint],
          attemptId: request.deliveryId,
        });
        if (journal.read().status !== "pending")
          throw Error("Save state could not be retained.");
        dispatched = true;
        const { status, value } = await transport(
          "canvas-save",
          request,
          signal,
        );
        if (status === 401 || status === 403) onAccessLost();
        if ("error" in value) {
          const uncertain = value.error.outcome !== "NOT_DISPATCHED";
          journal.write(
            uncertain
              ? { ...journal.read(), status: "unresolved", problem: "unknown" }
              : idleDocumentAttempt,
          );
          return {
            ok: false,
            uncertain,
            message: uncertain
              ? "Save could not be confirmed. Check the file’s versions before saving again."
              : "The version could not be saved. It may have changed; your draft is still here.",
          };
        }
        current(signal);
        const saved = admit({
          version: value.version,
          inspection: { ...value.inspection, currentBytesVerified: true },
          request: request.request,
          headVersionId: value.version.versionId,
        });
        journal.write(idleDocumentAttempt);
        return { ok: true, value: saved };
      } catch (error) {
        if (error instanceof DocumentAccessUnavailable && !lifetime.aborted)
          onAccessLost();
        if (dispatched)
          journal.write({
            ...journal.read(),
            status: "unresolved",
            problem: "unknown",
          });
        else if (journal.read().status === "pending")
          journal.write(idleDocumentAttempt);
        return {
          ok: false,
          uncertain: dispatched,
          message: dispatched
            ? "Save could not be confirmed. Your draft is preserved; check the file’s versions before saving again."
            : "Save did not start. Reconnect and try again.",
        };
      }
    },
  };
  return access;
}
