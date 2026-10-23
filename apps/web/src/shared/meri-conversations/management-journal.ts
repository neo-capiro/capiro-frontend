import { z } from "zod";
import {
  managedConversation,
  managementRequest,
} from "../capiro/operations/meri-conversation-management";
import {
  requireMeriTabStorage,
  tabRecord,
  type TabScope,
  type TabStorage,
} from "./tab-journal";

const pending = z.strictObject({
  request: managementRequest,
  previous: managedConversation,
});
export type PendingManagement = z.infer<typeof pending>;
/** Same-tab retry identity only. Core rechecks owner, current state and CAS. */
export function managementJournal(
  scope: TabScope,
  storage: TabStorage | undefined = requireMeriTabStorage(),
) {
  if (!storage) throw new Error("This tab cannot retain the chat change.");
  return tabRecord(
    scope,
    "management",
    (value) => {
      const intent = pending.parse(value);
      if (
        intent.request.conversationId !== scope.conversationId ||
        intent.previous.conversationId !== scope.conversationId ||
        intent.previous.clientId !== scope.clientId ||
        intent.request.expectedRevision !== intent.previous.revision
      )
        throw new Error("Chat change scope mismatch.");
      return intent;
    },
    "",
    storage,
  );
}
