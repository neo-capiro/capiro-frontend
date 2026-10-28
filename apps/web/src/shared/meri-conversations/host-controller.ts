import { createMeriConversation } from "@capiro/meri-client/conversation";
import {
  createArtifactAccess,
  type ArtifactAccess,
} from "../meri-documents/artifact-access";
import {
  createUploadAccess,
  type MeriUploadAccess,
} from "../meri-uploads/access";
import {
  createIntentsAccess,
  type IntentsAccess,
} from "../meri-intents/access";
import { SessionLifetimeController } from "../meri-actions/opaque-session-controller";
import {
  bootstrapConversationSession,
  conversationSessionHints,
  type ConversationSessionHints,
  type ConversationContext,
} from "./session";
import type { ConversationSessionReceipt } from "@capiro/meri-contracts/conversation-session";
import {
  createFeedbackAccess,
  type FeedbackAccess,
} from "../meri-feedback/access";
import {
  createConversationReads,
  type ConversationReads,
} from "./current-reads";

export type MeriConversationPort = ReturnType<typeof createMeriConversation> & {
  readonly context: ConversationContext;
  /**
   * Composer attachments under this exact session lifetime: the uploads this page declared, the
   * sources the conversation already established, and the ordered argument a message carries.
   */
  readonly uploads: MeriUploadAccess;
  /** Read-only artifact preview/download under the same session lifetime. */
  readonly artifacts: ArtifactAccess;
  /** Prepared-action list and decisions, checked by the public receiver under the same session lifetime. */
  readonly intents: IntentsAccess;
  readonly reads: ConversationReads;
  readonly feedback: FeedbackAccess;
};
export type ConversationAccount = Readonly<{
  tenantId: string;
  actorId: string;
}>;

/** Composition only: canonical bootstrap owns credential/lifetime; public SDK owns admission. */
export class ConversationHostController extends SessionLifetimeController<
  MeriConversationPort,
  ConversationSessionReceipt
> {
  constructor(options: {
    hints: ConversationSessionHints;
    account: ConversationAccount;
    fetcher?: typeof fetch;
    now?: () => number;
    origin?: string;
    onBound?: (context: ConversationContext) => void;
    retryDelaysMs?: readonly number[];
  }) {
    const hints = conversationSessionHints.parse(options.hints);
    const account = Object.freeze({ ...options.account });
    const { fetcher, now, origin, onBound, retryDelaysMs } = options;
    super({
      issue: (signal) =>
        bootstrapConversationSession(hints, account, signal, fetcher, now),
      fetcher,
      now,
      ...(retryDelaysMs ? { retryDelaysMs } : {}),
      // Active conversation, feedback and file reads finish before early renewal; the hard cap still aborts.
      busy: (port) => {
        const snapshot = port.getSnapshot();
        return (
          snapshot.submit === "pending" ||
          snapshot.cancel === "pending" ||
          snapshot.status === "loading" ||
          port.feedback.pending() ||
          port.artifacts.pending() ||
          port.uploads.pending()
        );
      },
      createPort: ({ session, signal, ...lifetime }) => {
        // Core PR15 readCurrentApplicationAuthority returns native user.id, not Clerk subject.
        if (
          session.context.tenantId !== account.tenantId ||
          session.context.actorId !== account.actorId
        )
          throw new Error("Conversation account mismatch");
        const conversation = createMeriConversation({
          context: session.context,
          credential: session.credential,
          expiresAtMs: session.expiresAtMs,
          signal,
          ...lifetime,
          fetchImpl: fetcher,
          origin,
          // The same-origin proxy needs its own header; a trusted direct Meri origin expects a bearer.
          credentialHeader: origin
            ? "authorization"
            : "x-meri-action-session",
        });
        /**
         * Attachments ride this exact session: the access is built from the same credential and the
         * same lifetime, and the sources it may re-select are the conversation's own admitted request
         * echo. Selecting an established source reuses its id and never writes an original again.
         */
        const uploads = createUploadAccess({
          credential: session.credential,
          lifetime: signal,
          isCurrent: lifetime.isCurrent,
          established: () =>
            conversation.getSnapshot().acceptedRequest?.uploads ?? [],
          ...(fetcher ? { fetcher } : {}),
        });
        const port = Object.freeze({
          ...conversation,
          context: session.context,
          uploads,
          // Attachments belong to this port: its disposal takes the access with it.
          dispose: () => {
            uploads.dispose();
            conversation.dispose();
          },
          feedback: createFeedbackAccess({
            credential: session.credential,
            context: session.context,
            lifetime: signal,
            isCurrent: lifetime.isCurrent,
            onAccessLost: lifetime.onAccessLost,
            fetcher,
            origin,
          }),
          reads: createConversationReads(
            session.context,
            signal,
            lifetime.isCurrent,
            lifetime.onAccessLost,
            fetcher,
          ),
          artifacts: createArtifactAccess(session.credential, signal, fetcher),
          intents: createIntentsAccess(
            session.credential,
            signal,
            fetcher,
            session.context,
            lifetime.onAccessLost,
          ),
        });
        try {
          onBound?.(session.context);
          signal.throwIfAborted();
          if (!lifetime.isCurrent())
            throw new Error("Current client unavailable");
          // Same-host reconnect must reauthorize this exact admitted run.
          hints.clientId = session.context.selectedClientId;
          hints.conversationId = session.context.conversationId;
          hints.runId = session.context.runId;
        } catch (cause) {
          port.dispose();
          throw cause;
        }
        return port;
      },
    });
  }
}
