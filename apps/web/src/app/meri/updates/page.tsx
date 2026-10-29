import { ProductShell } from "../../../shared/shell/ProductShell";
import { RequireSession } from "../../../shared/session/SessionContext";
import { readConversationConfig } from "../../../shared/meri-conversations/config";
import { NotificationsHost } from "../../../features/meri/notifications/NotificationsHost";

export default function UpdatesPage() {
  const config = readConversationConfig(process.env);
  return (
    <ProductShell
      conversationEnabled={config.enabled}
      firstChatBootstrapEnabled={config.firstChatBootstrapEnabled}
    >
      <RequireSession>
        <h1>Updates</h1>
        <NotificationsHost unavailable="Current notification preferences could not be verified." />
      </RequireSession>
    </ProductShell>
  );
}
