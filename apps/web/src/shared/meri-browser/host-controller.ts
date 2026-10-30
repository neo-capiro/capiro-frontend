import { SessionLifetimeController } from "../meri-actions/opaque-session-controller";
import {
  bootstrapConversationSession,
  conversationSessionHints,
  type ConversationSessionHints,
} from "../meri-conversations/session";
import type { ConversationAccount } from "../meri-conversations/host-controller";
import type { ConversationSessionReceipt } from "@capiro/meri-contracts/conversation-session";
import { createBrowserViewerTransport } from "./transport";
import { BrowserViewerController } from "./viewer-controller";
import { createBrowserResume, type BrowserResumeTarget } from "./resume";

/** Existing session owner, separate credential lifetime: pausing the agent does not retire its browser. */
export class BrowserViewerHost extends SessionLifetimeController<
  BrowserViewerController,
  ConversationSessionReceipt
> {
  readonly setOnTarget: (
    callback: (target: BrowserResumeTarget) => void,
  ) => void;
  constructor(options: {
    account: ConversationAccount;
    hints: ConversationSessionHints;
    onTarget: (target: BrowserResumeTarget) => void;
    fetcher?: typeof fetch;
    now?: () => number;
    origin?: string;
  }) {
    const hints = conversationSessionHints.parse(options.hints);
    if (!hints.conversationId || !hints.runId)
      throw new Error("Existing browser run required");
    const account = Object.freeze({ ...options.account });
    let onTarget = options.onTarget;
    super({
      issue: (signal) =>
        bootstrapConversationSession(
          hints,
          account,
          signal,
          options.fetcher,
          options.now,
          "browser",
        ),
      now: options.now,
      busy: (viewer) => viewer.pending(),
      createPort: ({ session, signal, isCurrent, onAccessLost, now }) => {
        const transport = createBrowserViewerTransport({
          credential: session.credential,
          context: session.context,
          lifetime: signal,
          isCurrent,
          onAccessLost,
          fetcher: options.fetcher,
          origin: options.origin,
        });
        return new BrowserViewerController({
          transport,
          lifetime: signal,
          expiresAtMs: session.expiresAtMs,
          now,
          resume: createBrowserResume({
            context: session.context,
            transport,
            onTarget: (target) => onTarget(target),
          }),
        });
      },
    });
    this.setOnTarget = (callback) => {
      onTarget = callback;
    };
  }
}
