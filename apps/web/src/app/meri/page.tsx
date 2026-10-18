import { ProductShell } from "../../shared/shell/ProductShell";
import { MeriHome } from "../../features/meri/MeriHome";
import { RequireSession } from "../../shared/session/SessionContext";
import { readConversationConfig } from "../../shared/meri-conversations/config";

export default function MeriPage() {
  const config = readConversationConfig(process.env);
  return (
    <ProductShell
      conversationEnabled={config.enabled}
      firstChatBootstrapEnabled={config.firstChatBootstrapEnabled}
      firstChatBootstrapClientId={config.firstChatBootstrapClientId}
    >
      <RequireSession>
        <MeriHome
          conversationEnabled={config.enabled}
          firstChatBootstrapEnabled={config.firstChatBootstrapEnabled}
          firstChatBootstrapClientId={config.firstChatBootstrapClientId}
        />
      </RequireSession>
    </ProductShell>
  );
}
