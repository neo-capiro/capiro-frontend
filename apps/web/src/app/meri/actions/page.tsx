import { ProductShell } from "../../../shared/shell/ProductShell";
import { RequireSession } from "../../../shared/session/SessionContext";
import { readActionConfig } from "../../../shared/meri-actions/config";
import { readConversationConfig } from "../../../shared/meri-conversations/config";
import { MeriActionHost } from "./MeriActionHost";

export default function MeriActionsPage() {
  const conversation = readConversationConfig(process.env);
  return (
    <ProductShell
      actionWorkflow
      conversationEnabled={conversation.enabled}
      firstChatBootstrapEnabled={conversation.firstChatBootstrapEnabled}
    >
      <RequireSession>
        <MeriActionHost enabled={readActionConfig(process.env).enabled} />
      </RequireSession>
    </ProductShell>
  );
}
