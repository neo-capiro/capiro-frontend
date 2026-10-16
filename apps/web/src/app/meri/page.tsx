import { ProductShell } from "../../shared/shell/ProductShell";
import { MeriHome } from "../../features/meri/MeriHome";
import { RequireSession } from "../../shared/session/SessionContext";
import { readConversationConfig } from "../../shared/meri-conversations/config";

export default function MeriPage() {
  const enabled = readConversationConfig(process.env).enabled;
  return (
    <ProductShell conversationEnabled={enabled}>
      <RequireSession>
        <MeriHome conversationEnabled={enabled} />
      </RequireSession>
    </ProductShell>
  );
}
