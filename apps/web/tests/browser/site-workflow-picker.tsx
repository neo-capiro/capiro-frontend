/** Synthetic catalog responses enter the real HTTP receiver and mounted picker. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { CapiroDataProvider } from "@/shared/capiro/CapiroBoundary";
import { SiteWorkflowPicker } from "@/features/meri/conversation/SiteWorkflowPicker";
import { createInitialDraftOwner } from "@/shared/meri-conversations/initial-draft";
import { syncMeriTabIdentity } from "@/shared/meri-conversations/tab-journal";
import "@/app/globals.css";

syncMeriTabIdentity("synthetic-workflow-picker", sessionStorage);
const first = "11111111-1111-4111-8111-111111111111";
const owner = createInitialDraftOwner(
  {
    tenantId: "synthetic-tenant",
    actorId: "synthetic-actor",
    clientId: null,
    conversationId: first,
  },
  sessionStorage,
);
function Harness() {
  const [selection, setSelection] = useState(owner.selection() ?? {});
  const [conversationId, setConversation] = useState(first);
  return (
    <CapiroDataProvider onSessionExpired={() => undefined}>
      <main style={{ maxWidth: 700, padding: 32 }}>
        <h1>Synthetic website catalog</h1>
        <SiteWorkflowPicker
          key={conversationId}
          conversationId={conversationId}
          selection={selection}
          disabled={false}
          onChange={(next) => {
            owner.selectSkill(next);
            setSelection(owner.selection()!);
          }}
        />
        <output aria-label="Saved draft selection">
          {JSON.stringify(selection)}
        </output>
        <button
          onClick={() =>
            setConversation("22222222-2222-4222-8222-222222222222")
          }
        >
          Switch chat
        </button>
      </main>
    </CapiroDataProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
