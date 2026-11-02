import { ProductShell } from "../../shared/shell/ProductShell";
import { MeriHome } from "../../features/meri/MeriHome";
import { RequireSession } from "../../shared/session/SessionContext";
import { readConversationConfig } from "../../shared/meri-conversations/config";
import { readIntentsConfig } from "../../shared/meri-intents/config";
import { readOfficeConfig } from "../../shared/meri-office/config";

export default function MeriPage() {
  const config = readConversationConfig(process.env);
  const intents = readIntentsConfig(process.env);
  return (
    <ProductShell
      chatLayout
      conversationEnabled={config.enabled}
      firstChatBootstrapEnabled={config.firstChatBootstrapEnabled}
    >
      <RequireSession>
        <MeriHome
          conversationEnabled={config.enabled}
          intentApprovalsEnabled={intents.enabled}
          officeEnabled={readOfficeConfig(process.env).enabled}
          firstChatBootstrapEnabled={config.firstChatBootstrapEnabled}
        />
      </RequireSession>
    </ProductShell>
  );
}
