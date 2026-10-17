import { createMeriConversation } from "@capiro/meri-client/conversation";
import {
  createArtifactAccess,
  type ArtifactAccess,
} from "../meri-documents/artifact-access";
import { OpaqueSessionController } from "../meri-actions/opaque-session-controller";
import {
  actionSessionHints,
  type ActionSessionHints,
} from "../meri-actions/session-bootstrap";
import type { ActionContext } from "../meri-actions/session-receipt";

export type MeriConversationPort = ReturnType<typeof createMeriConversation> & {
  readonly context: ActionContext;
  /** Read-only artifact preview/download under the same session lifetime. */
  readonly artifacts: ArtifactAccess;
};
export type ConversationAccount = Readonly<{
  tenantId: string;
  actorId: string;
}>;

/** Composition only: canonical bootstrap owns credential/lifetime; public SDK owns admission. */
export class ConversationHostController extends OpaqueSessionController<MeriConversationPort> {
  constructor(options: {
    hints: ActionSessionHints;
    account: ConversationAccount;
    fetcher?: typeof fetch;
    now?: () => number;
    origin?: string;
    onBound?: (context: ActionContext) => void;
  }) {
    const hints = actionSessionHints.parse(options.hints);
    const account = Object.freeze({ ...options.account });
    const { fetcher, now, origin, onBound } = options;
    super({
      hints,
      fetcher,
      now,
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
        });
        try {
          onBound?.(session.context);
          signal.throwIfAborted();
          if (!lifetime.isCurrent())
            throw new Error("Current client unavailable");
        } catch (cause) {
          port.dispose();
          throw cause;
        }
        return port;
      },
    });
  }
}
