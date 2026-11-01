import { ProductShell } from "../../../shared/shell/ProductShell";
import { RequireSession } from "../../../shared/session/SessionContext";
import { readConversationConfig } from "../../../shared/meri-conversations/config";
import { ApprovalInboxHost } from "../../../features/meri/approvals/ApprovalInboxHost";

/** The approval inbox lists and links; decisions stay inline in each conversation. */
export default function ApprovalsPage() {
  const config = readConversationConfig(process.env);
  return (
    <ProductShell
      section="approvals"
      conversationEnabled={config.enabled}
      firstChatBootstrapEnabled={config.firstChatBootstrapEnabled}
    >
      <RequireSession>
        <ApprovalInboxHost enabled={config.enabled} />
      </RequireSession>
    </ProductShell>
  );
}
