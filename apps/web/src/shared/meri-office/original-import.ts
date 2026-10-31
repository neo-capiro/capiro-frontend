import type { OfficeVersion } from "@capiro/meri-contracts/office-application";
import type { QueryClient } from "@tanstack/react-query";
import { SessionLifetimeController } from "../meri-actions/opaque-session-controller";
import {
  bootstrapConversationSession,
  type ConversationContext,
} from "../meri-conversations/session";
import { createOfficeTransport } from "./transport";
import { officeOriginalSelection } from "./original-import-selection";

type Snapshot = Readonly<{
  busy: boolean;
  attempted: boolean;
  message: string | null;
  version: OfficeVersion | null;
  runId: string | null;
}>;
type Options = {
  context: ConversationContext;
  selection: { uploadId: string; sha256: string };
  queries: QueryClient;
  fetcher?: typeof fetch;
  now?: () => number;
};
function assertOriginalOrigin(
  version: OfficeVersion,
  context: ConversationContext,
) {
  const scope = version.scopes[0];
  if (
    version.binding.tenantId !== context.tenantId ||
    version.binding.actorId !== context.actorId ||
    version.binding.conversationId !== context.conversationId ||
    version.scopes.length !== 1 ||
    scope?.tenantId !== context.tenantId ||
    (context.selectedClientId === null
      ? scope.kind !== "private-user" || scope.resourceId !== context.actorId
      : scope.kind !== "client" ||
        scope.resourceId !== context.selectedClientId)
  )
    throw new Error("ORIGIN_CHANGED");
}

/** One explicit import; every subsequent observation is recovery-only, including
 * after navigation or renewed native access. No upload bytes enter this port. */
class OfficeOriginalImport {
  private readonly recovery;
  private readonly session;
  private readonly listeners = new Set<() => void>();
  private active = false;
  private busy = false;
  private snapshot: Snapshot;
  constructor(private readonly options: Options) {
    const { context } = options;
    this.recovery = officeOriginalSelection(
      options.queries,
      context,
      options.selection,
    );
    this.snapshot = {
      busy: false,
      attempted: this.recovery.attempted(),
      message: null,
      version: null,
      runId: null,
    };
    this.session = new SessionLifetimeController({
      issue: (signal) =>
        bootstrapConversationSession(
          {
            conversationId: context.conversationId,
            clientId: context.selectedClientId,
            runId: context.runId,
          },
          { tenantId: context.tenantId, actorId: context.actorId },
          signal,
          options.fetcher,
          options.now,
        ),
      createPort: ({ session: receipt, signal, isCurrent, onAccessLost }) => ({
        ...createOfficeTransport({
          credential: receipt.credential,
          lifetime: signal,
          isCurrent: () => this.current() && isCurrent(),
          onAccessLost,
          fetcher: options.fetcher,
        }),
        runId: receipt.context.runId,
      }),
      now: options.now,
      busy: (port) => port.pending(),
    });
  }
  private current = () => this.active && this.recovery.isCurrent();
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(next: Snapshot) {
    this.snapshot = Object.freeze(next);
    for (const listener of this.listeners) listener();
  }
  attach() {
    this.active = true;
    const detach = this.session.attach();
    const uncache = this.recovery.subscribe(() => {
      this.session.revoke();
      this.publish({
        busy: false,
        attempted: true,
        message: "Current file access has changed.",
        version: null,
        runId: null,
      });
    });
    return () => {
      this.active = false;
      uncache();
      detach();
    };
  }
  async open() {
    if (!this.current() || this.busy) return;
    this.busy = true;
    this.publish({
      ...this.snapshot,
      busy: true,
      message: null,
      version: null,
      runId: null,
    });
    try {
      await this.session.connect();
      const current = this.session.getSnapshot();
      if (!this.current()) return;
      if (current.status !== "ready") throw new Error("SESSION_UNAVAILABLE");
      const operation = this.recovery.attempted() ? "recover" : "import";
      this.recovery.markAttempted();
      const response = await current.port.request(
        "import",
        { ...this.recovery.selection, operation },
        new AbortController().signal,
      );
      if (!this.current()) return;
      if ("error" in response.value) {
        this.publish({
          ...this.snapshot,
          attempted: true,
          message:
            response.value.error.code === "IMPORT_UNRESOLVED"
              ? "The original import is still unconfirmed. Check again to recover it."
              : "The original could not be opened. Check again to recover any completed import.",
        });
        return;
      }
      const version = response.value.document.version;
      assertOriginalOrigin(version, this.options.context);
      this.publish({
        busy: false,
        attempted: true,
        message: null,
        version,
        runId: current.port.runId,
      });
    } catch {
      if (this.current())
        this.publish({
          ...this.snapshot,
          attempted: this.recovery.attempted(),
          message: this.recovery.attempted()
            ? "The import outcome is unconfirmed. Check again to recover it."
            : "Current file access is unavailable. Try opening it again.",
        });
    } finally {
      this.busy = false;
      if (this.current()) this.publish({ ...this.snapshot, busy: false });
    }
  }
}
export function createOfficeOriginalImport(options: Options) {
  return new OfficeOriginalImport(options);
}
