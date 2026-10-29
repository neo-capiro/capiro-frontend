import { SessionLifetimeController } from "../meri-actions/opaque-session-controller";
import { createConversationPort, type MeriConversationPort } from "./port";
export type { MeriConversationPort } from "./port";
import {
  bootstrapConversationSession,
  conversationSessionHints,
  type ConversationSessionHints,
  type ConversationContext,
} from "./session";
import type { ConversationSessionReceipt } from "@capiro/meri-contracts/conversation-session";
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
        const port = createConversationPort(
          { session, signal, ...lifetime },
          { fetcher, origin },
        );
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
