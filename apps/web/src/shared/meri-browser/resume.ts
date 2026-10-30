import type { BrowserViewerResponseMap } from "@capiro/meri-contracts/browser-viewer";
import type { ConversationLifecycleControlReceipt } from "@capiro/meri-contracts/conversation-lifecycle";
import { lifecycleJournal } from "../meri-conversation-lifecycle/journal";
import type { ConversationContext } from "../meri-conversations/session";
import type { TabStorage } from "../meri-conversations/tab-journal";
import type { BrowserViewerTransport } from "./transport";

export type BrowserResumeTarget = NonNullable<
  ConversationLifecycleControlReceipt["targetBinding"]
>;

/** Uses the same single pending control journal as Pause and recovery. No automatic replay. */
export function createBrowserResume(options: {
  context: ConversationContext;
  transport: BrowserViewerTransport;
  onTarget: (target: BrowserResumeTarget) => void;
  storage?: TabStorage;
  uuid?: () => string;
}) {
  return async (
    browser: BrowserViewerResponseMap["read"],
    signal: AbortSignal,
  ) => {
    signal.throwIfAborted();
    const journal = lifecycleJournal(options.context, options.storage);
    const prior = journal.read();
    if (prior && prior.intent !== "takeover.end")
      throw new Error("Recover the pending conversation control first");
    if (!prior && (browser.state !== "returning" || !browser.checkpoint))
      throw new Error("Return browser control before resuming");
    const command = prior ?? {
      controlId: (options.uuid ?? crypto.randomUUID.bind(crypto))(),
      intent: "takeover.end" as const,
      ...browser.checkpoint!,
    };
    const retained = journal.retain(command);
    const response = await options.transport.resume(retained, browser, signal);
    signal.throwIfAborted();
    if (!journal.current()) throw new Error("Conversation changed");
    if ("error" in response) {
      if (!prior && response.error.outcome === "NOT_DISPATCHED")
        journal.clear(retained);
      throw new Error("Resume could not be confirmed");
    }
    if (response.state !== "APPLIED" || !response.targetBinding)
      throw new Error(
        "Resume pending; retry the same control to recover its outcome",
      );
    // Preserve target selection before retiring the only uncertain command.
    options.onTarget(response.targetBinding);
    journal.clear(retained);
  };
}
