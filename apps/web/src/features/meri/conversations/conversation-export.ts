import { conversationHistoryMetadata as protocol } from "@capiro/meri-contracts/conversation-history";
import {
  exportConversationMessages,
  ConversationHistoryUnavailable,
  type ConversationSummary,
} from "../../../shared/meri-conversations/history-client";
import { conversationInClient } from "../../../shared/meri-conversations/history-pages";
import { DocumentDownloadUrl } from "../files/download-url";

type Selection = Pick<ConversationSummary, "conversationId" | "clientId"> & {
  tenantId: string;
  actorId: string;
};
/** Only an immediate download is retained; no reusable link or private response cache. */
function saveText(blob: Blob) {
  const urls = new DocumentDownloadUrl(),
    link = document.createElement("a");
  try {
    link.href = urls.replace(blob);
    link.download = "conversation-messages.txt";
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => urls.clear(), 0);
  }
}

export async function downloadConversationMessages(
  selection: Selection,
  signal: AbortSignal,
  {
    fetcher = fetch,
    now = Date.now,
    save = saveText,
  }: {
    fetcher?: typeof fetch;
    now?: () => number;
    save?: (blob: Blob) => void;
  } = {},
) {
  const startedAt = now();
  const result = await exportConversationMessages(
    { conversationId: selection.conversationId },
    signal,
    fetcher,
  );
  signal.throwIfAborted();
  if (!conversationInClient(result.conversation, selection, selection.clientId))
    throw new ConversationHistoryUnavailable(
      502,
      "CONVERSATION_RESPONSE_INVALID",
    );
  const checkedAt = now();
  if (
    checkedAt >= Date.parse(result.expiresAt) ||
    checkedAt - startedAt >= protocol.export.lifetimeMs
  )
    throw new ConversationHistoryUnavailable(
      410,
      "CONVERSATION_EXPORT_EXPIRED",
    );
  const text = [
    "Conversation messages",
    `Saved messages through update ${result.throughSequence}; exported ${result.exportedAt}.`,
    "Includes saved user prompts and assistant messages only. Attachments, source files, tool results and private Office drafts are excluded.",
    "This downloaded copy does not expire and cannot be revoked by the workspace.",
    "",
    ...result.turns.flatMap((turn) => [
      ...(turn.prompt === null ? [] : ["USER", turn.prompt, ""]),
      ...turn.messages.flatMap((message) => ["ASSISTANT", message.text, ""]),
    ]),
  ].join("\n");
  signal.throwIfAborted();
  save(new Blob([text], { type: "text/plain;charset=utf-8" }));
}

export function conversationExportFailure(error: unknown) {
  if (error instanceof ConversationHistoryUnavailable) {
    if (error.code === "CONVERSATION_EXPORT_TOO_LARGE")
      return "This conversation is too large for a single message export. No partial file was downloaded.";
    if (error.code === "CONVERSATION_EXPORT_EXPIRED")
      return "The download expired before it could start. Export again to check current access.";
    if ([401, 403, 404].includes(error.status))
      return "This conversation is no longer available to export. Refresh your conversation list.";
  }
  return "The export could not be verified. No file was downloaded. Try again to check current access.";
}
