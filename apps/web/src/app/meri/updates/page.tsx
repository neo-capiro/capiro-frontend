import { ProductShell } from "../../../shared/shell/ProductShell";
import { RequireSession } from "../../../shared/session/SessionContext";
import { readConversationConfig } from "../../../shared/meri-conversations/config";
import { NotificationsHost } from "../../../features/meri/notifications/NotificationsHost";
import { MeriPageHeading } from "../../../features/meri/ui/MeriPageHeading";
import ui from "../../../features/meri/ui/meri-ui.module.css";

export default function UpdatesPage() {
  const config = readConversationConfig(process.env);
  return (
    <ProductShell
      conversationEnabled={config.enabled}
      firstChatBootstrapEnabled={config.firstChatBootstrapEnabled}
    >
      <RequireSession>
        {/* Every other Meri surface mounts its heading inside the shared page padding. */}
        <section className={ui.page} aria-label="Updates">
          <MeriPageHeading
            title="Updates"
            description="Work Meri has observed for you, and which notices you want to see."
          />
          <NotificationsHost unavailable="Current notification preferences could not be verified." />
        </section>
      </RequireSession>
    </ProductShell>
  );
}
