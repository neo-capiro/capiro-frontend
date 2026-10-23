import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ApplicationBoundary } from "@/shared/session/ApplicationBoundary";
import { RequireSession } from "@/shared/session/SessionContext";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { openMeriPalette } from "@/shared/meri-entry/MeriCommandPalette";
import { SkillLauncher } from "@/features/meri/skills/SkillLauncher";
import { ManagedConversationPanel } from "@/features/meri/conversations/ManagedConversationPanel";
import { ConversationRecents } from "@/shared/shell/ConversationRecents";
import { MockModelPicker } from "@/features/meri/model-picker/MockModelPicker";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

function Harness() {
  const identity = useIdentity();
  const [management, setManagement] = useState(false);
  const [clientId, selectClient] = useState<string | null>(null);
  const current =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  return (
    <main className="page">
      <h1>Synthetic M2 component qualification</h1>
      <button onClick={openMeriPalette}>Open commands</button>
      <button
        onClick={() =>
          selectClient((value) =>
            value ? null : "00000000-0000-4000-8000-000000000003",
          )
        }
      >
        Change synthetic draft scope
      </button>
      <SkillLauncher
        scope={
          current?.tenant?.id
            ? {
                tenantId: current.tenant.id,
                actorId: current.user.id,
                clientId,
                conversationId: "",
              }
            : undefined
        }
        scopeLabel={clientId ? "Synthetic client" : "General"}
      />
      <MockModelPicker />
      <button onClick={() => setManagement(true)}>
        Open synthetic management
      </button>
      {management && (
        <>
          <aside aria-label="Synthetic recents">
            <ConversationRecents enabled />
          </aside>
          <ManagedConversationPanel />
        </>
      )}
    </main>
  );
}

// Only the existing test Clerk adapter is aliased by Vite; production providers/receivers remain real.
createRoot(document.getElementById("root")!).render(
  <ApplicationBoundary publishableKey="pk_test_c3ludGhldGljLmV4YW1wbGUudGVzdCQ">
    <RequireSession>
      <Harness />
    </RequireSession>
  </ApplicationBoundary>,
);
