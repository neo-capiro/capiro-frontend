import { createPreviewAccess, type PreviewAccess } from "./preview-access";
import {
  receiveDocumentRequest,
  type DocumentHistoryRequest,
  type DocumentHistoryResponse,
  type DocumentListRequest,
  type DocumentListResponse,
  type DocumentVersion,
} from "@capiro/meri-client/document-access";
import type { ConversationContext } from "../meri-conversations/session";
import {
  createArtifactAccess,
  type ArtifactAccess,
  type ArtifactReply,
} from "./artifact-access";
import {
  DocumentAccessUnavailable,
  documentAccessTransport,
} from "./workflow-transport";

export type LibraryScope = DocumentListRequest["scope"];
export type LibraryVersion = Readonly<DocumentVersion>;
export interface DocumentLibraryAccess extends ArtifactAccess, PreviewAccess {
  readonly context: ConversationContext;
  list(
    request: DocumentListRequest,
    signal: AbortSignal,
  ): Promise<ArtifactReply<DocumentListResponse>>;
  history(
    request: DocumentHistoryRequest,
    signal: AbortSignal,
  ): Promise<ArtifactReply<DocumentHistoryResponse>>;
  dispose(): void;
}

/** Correlate admitted metadata with this live account; rows remain unbranded selectors. */
export function libraryVersionInContext(
  version: LibraryVersion,
  context: ConversationContext,
  scope: LibraryScope,
) {
  if (
    version.binding.tenantId !== context.tenantId ||
    version.binding.actorId !== context.actorId
  )
    return false;
  if (
    scope === "conversation" &&
    version.binding.conversationId !== context.conversationId
  )
    return false;
  return (
    scope !== "client" ||
    (context.selectedClientId !== null &&
      version.scopes.length === 1 &&
      version.scopes[0]?.kind === "client" &&
      version.scopes[0].resourceId === context.selectedClientId)
  );
}

/** Uses the same bounded HTTP and signed-link owners as existing artifact reads. */
export function createDocumentLibraryAccess({
  credential,
  context,
  lifetime,
  onAccessLost,
  fetcher = fetch,
}: {
  credential: string;
  context: ConversationContext;
  lifetime: AbortSignal;
  onAccessLost: () => void;
  fetcher?: typeof fetch;
}): DocumentLibraryAccess {
  const owned = new AbortController();
  const signal = AbortSignal.any([lifetime, owned.signal]);
  const transport = documentAccessTransport(credential, signal, fetcher);
  const artifacts = createArtifactAccess(credential, signal, fetcher);
  const previews = createPreviewAccess(credential, signal, fetcher);
  let active = 0;
  const refuse = (code: string, accessDenied = false) => {
    if (accessDenied) onAccessLost();
    return {
      ok: false as const,
      code,
      ...(accessDenied ? { accessDenied: true as const } : {}),
    };
  };
  async function metadata<R extends "list" | "history">(
    route: R,
    input: R extends "list" ? DocumentListRequest : DocumentHistoryRequest,
    caller: AbortSignal,
  ) {
    active++;
    try {
      signal.throwIfAborted();
      const request = receiveDocumentRequest(
        route,
        new TextEncoder().encode(JSON.stringify(input)),
      );
      const { status, value } = await transport.metadata(
        route,
        request,
        caller,
      );
      signal.throwIfAborted();
      caller.throwIfAborted();
      if ("error" in value)
        return refuse(value.error.code, status === 401 || status === 403);
      const scope = "scope" in value ? value.scope : "conversation";
      if (
        value.versions.some(
          (version) => !libraryVersionInContext(version, context, scope),
        )
      )
        return refuse("DOCUMENT_CONTEXT_MISMATCH", true);
      return { ok: true as const, value };
    } catch (error) {
      return refuse(
        signal.aborted || caller.aborted
          ? "CANCELLED"
          : "DOCUMENT_READ_UNAVAILABLE",
        error instanceof DocumentAccessUnavailable,
      );
    } finally {
      active--;
    }
  }
  return {
    context,
    pending: () => active > 0 || artifacts.pending() || previews.pending(),
    readPreview: async (id, caller) => {
      const reply = await previews.readPreview(id, caller);
      if (!reply.ok && reply.accessDenied) onAccessLost();
      return reply;
    },
    publishPreview: async (id, caller) => {
      const reply = await previews.publishPreview(id, caller);
      if (!reply.ok && reply.accessDenied) onAccessLost();
      return reply;
    },
    list: (request, caller) => metadata("list", request, caller),
    history: (request, caller) => metadata("history", request, caller),
    inspect: async (versionId, caller) => {
      const reply = await artifacts.inspect(versionId, caller);
      if (!reply.ok && reply.accessDenied) onAccessLost();
      return reply;
    },
    download: async (versionId, caller) => {
      const reply = await artifacts.download(versionId, caller);
      if (!reply.ok && reply.accessDenied) onAccessLost();
      return reply;
    },
    dispose: () => owned.abort(),
  };
}
