import { createMeriConversation } from "@capiro/meri-client/conversation";
import {
  createArtifactAccess,
  type ArtifactAccess,
} from "../meri-documents/artifact-access";
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

export type MeriConversationPort = ReturnType<typeof createMeriConversation> & {
  readonly context: ConversationContext;
  /** Read-only artifact preview/download under the same session lifetime. */
  readonly artifacts: ArtifactAccess;
  /** Prepared-action list and decisions, checked by the public receiver under the same session lifetime. */
  readonly intents: IntentsAccess;
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
      // A Send, a Stop or a history read in flight finishes on this session before it is renewed.
      busy: (port) => {
        const snapshot = port.getSnapshot();
        return (
          snapshot.submit === "pending" ||
          snapshot.cancel === "pending" ||
          snapshot.status === "loading"
        );
      },
      createPort: ({ session, signal, ...lifetime }) => {
        // Core PR15 readCurrentApplicationAuthority returns native user.id, not Clerk subject.
        if (
          session.context.tenantId !== account.tenantId ||
          session.context.actorId !== account.actorId
        )
          throw new Error("Conversation account mismatch");
        const port = Object.freeze({
          ...createMeriConversation({
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
          }),
          context: session.context,
          artifacts: createArtifactAccess(session.credential, signal, fetcher),
          intents: createIntentsAccess(
            session.credential,
            signal,
            fetcher,
            session.context,
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
