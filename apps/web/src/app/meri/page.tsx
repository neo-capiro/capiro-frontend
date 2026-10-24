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
    >
      <RequireSession>
        <MeriHome
          conversationEnabled={config.enabled}
          intentApprovalsEnabled={intents.enabled}
          memoryReviewEnabled={
            process.env.MERI_MEMORY_OWNER_REVIEW_ENABLED === "true"
          }
          firstChatBootstrapEnabled={config.firstChatBootstrapEnabled}
        />
      </RequireSession>
    </ProductShell>
  );
}
