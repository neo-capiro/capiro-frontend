import { ProductShell } from "../../../shared/shell/ProductShell";
import { RequireSession } from "../../../shared/session/SessionContext";
import { readConversationConfig } from "../../../shared/meri-conversations/config";
import { MeriRoutinesHost } from "../../../features/meri/routines/MeriRoutinesHost";

export default function RoutinesPage() {
  const config = readConversationConfig(process.env);
  return (
    <ProductShell
      routineWorkflow
      section="routines"
      conversationEnabled={config.enabled}
      firstChatBootstrapEnabled={config.firstChatBootstrapEnabled}
    >
      <RequireSession>
        <MeriRoutinesHost
          enabled={config.enabled}
          generalEnabled={config.firstChatBootstrapEnabled}
        />
      </RequireSession>
    </ProductShell>
  );
}
