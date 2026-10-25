import { ProductShell } from "../../../shared/shell/ProductShell";
import { RequireSession } from "../../../shared/session/SessionContext";
import { readConversationConfig } from "../../../shared/meri-conversations/config";
import { MeriConversationList } from "../../../features/meri/conversations/MeriConversationList";

export default function ConversationsPage() {
  const config = readConversationConfig(process.env);
  return (
    <ProductShell
      designTarget="1064:144529"
      section="conversations"
      conversationEnabled={config.enabled}
      firstChatBootstrapEnabled={config.firstChatBootstrapEnabled}
    >
      <RequireSession>
        <MeriConversationList
          enabled={config.enabled}
          firstChatBootstrapEnabled={config.firstChatBootstrapEnabled}
        />
      </RequireSession>
    </ProductShell>
  );
}
