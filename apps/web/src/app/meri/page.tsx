import { ProductShell } from "../../shared/shell/ProductShell";
import { MeriHome } from "../../features/meri/MeriHome";
import { RequireSession } from "../../shared/session/SessionContext";
import { readConversationConfig } from "../../shared/meri-conversations/config";
import { readIntentsConfig } from "../../shared/meri-intents/config";

export default function MeriPage() {
  const config = readConversationConfig(process.env);
  const intents = readIntentsConfig(process.env);
  return (
    <ProductShell
      conversationEnabled={config.enabled}
      firstChatBootstrapEnabled={config.firstChatBootstrapEnabled}
      firstChatBootstrapClientId={config.firstChatBootstrapClientId}
    >
      <RequireSession>
        <MeriHome
          conversationEnabled={config.enabled}
          intentApprovalsEnabled={intents.enabled}
          firstChatBootstrapEnabled={config.firstChatBootstrapEnabled}
          firstChatBootstrapClientId={config.firstChatBootstrapClientId}
        />
      </RequireSession>
    </ProductShell>
  );
}
