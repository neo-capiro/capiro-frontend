import { ProductShell } from "../../../shared/shell/ProductShell";
import { RequireSession } from "../../../shared/session/SessionContext";
import { readTaskCommandConfig } from "../../../shared/meri-task-commands/config";
import { readConversationConfig } from "../../../shared/meri-conversations/config";
import { MeriTaskUpdateHost } from "./MeriTaskUpdateHost";

export default function MeriTaskUpdatesPage() {
  const conversation = readConversationConfig(process.env);
  return (
    <ProductShell
      conversationEnabled={conversation.enabled}
      firstChatBootstrapEnabled={conversation.firstChatBootstrapEnabled}
      firstChatBootstrapClientId={conversation.firstChatBootstrapClientId}
    >
      <RequireSession>
        <MeriTaskUpdateHost
          enabled={readTaskCommandConfig(process.env).enabled}
        />
      </RequireSession>
    </ProductShell>
  );
}
