import { ProductShell } from "../../shared/shell/ProductShell";
import { MeriHome } from "../../features/meri/MeriHome";
import { RequireSession } from "../../shared/session/SessionContext";
import { readConversationConfig } from "../../shared/meri-conversations/config";

export default function MeriPage() {
  return (
    <ProductShell>
      <RequireSession>
        <MeriHome
          conversationEnabled={readConversationConfig(process.env).enabled}
        />
      </RequireSession>
    </ProductShell>
  );
}
