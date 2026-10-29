import { ProductShell } from "../../../shared/shell/ProductShell";
import { RequireSession } from "../../../shared/session/SessionContext";
import { readDocumentConfig } from "../../../shared/meri-documents/config";
import { readConversationConfig } from "../../../shared/meri-conversations/config";
import { readOfficeConfig } from "../../../shared/meri-office/config";
import { MeriFilesHost } from "./MeriFilesHost";

export default function MeriFilesPage() {
  const config = readDocumentConfig(process.env);
  const conversation = readConversationConfig(process.env);
  return (
    <ProductShell
      documentWorkflow
      conversationEnabled={conversation.enabled}
      firstChatBootstrapEnabled={conversation.firstChatBootstrapEnabled}
    >
      <RequireSession>
        <MeriFilesHost
          enabled={config.enabled}
          readEnabled={config.readEnabled}
          officeEnabled={readOfficeConfig(process.env).enabled}
          operation={config.operation ?? "create_word"}
        />
      </RequireSession>
    </ProductShell>
  );
}
