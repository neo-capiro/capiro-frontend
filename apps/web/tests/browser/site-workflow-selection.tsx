/** Synthetic mounted consumer proof. No website, service credentials or model calls. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { SkillSelectionPicker } from "@/features/meri/conversation/SkillSelectionPicker";
import { ALL_TYPED_SKILL_IDS } from "@/features/meri/conversation/quick-action-gate";
import { SelectedRequestReceipt } from "@/features/meri/conversation/SelectedRequestReceipt";
import { createInitialDraftOwner } from "@/shared/meri-conversations/initial-draft";
import { syncMeriTabIdentity } from "@/shared/meri-conversations/tab-journal";
import "@/app/globals.css";

const siteWorkflow = {
  siteId: "synthetic-site",
  workflowId: "synthetic-task",
  version: 3,
  manifestSha256: "a".repeat(64),
};
syncMeriTabIdentity("synthetic-site-workflow", sessionStorage);
const owner = createInitialDraftOwner(
  {
    tenantId: "synthetic-tenant",
    actorId: "synthetic-actor",
    clientId: null,
    conversationId: "11111111-1111-4111-8111-111111111111",
  },
  sessionStorage,
);
if (!owner.selection()) owner.selectSkill({ siteWorkflow });
function Harness() {
  const [selection, setSelection] = useState(owner.selection()!);
  return (
    <main style={{ maxWidth: 700, padding: 32 }}>
      <h1>Synthetic website task draft</h1>
      <SkillSelectionPicker
        key={JSON.stringify(selection)}
        selection={selection}
        clientId={null}
        disabled={false}
        gate={{ status: "on", available: ALL_TYPED_SKILL_IDS }}
        onChange={(value) => {
          owner.selectSkill(value);
          setSelection(owner.selection()!);
        }}
      />
      <output aria-label="Saved draft selection">
        {JSON.stringify(selection)}
      </output>
      <SelectedRequestReceipt
        scope="General"
        request={{
          requestId: "22222222-2222-4222-8222-222222222222",
          prompt: "Synthetic task",
          skill: null,
          window: null,
          windowRequest: null,
          siteWorkflow,
          documentRevision: {
            artifactId: "33333333-3333-4333-8333-333333333333",
            versionId: "44444444-4444-4444-8444-444444444444",
            objectSha256: "b".repeat(64),
          },
        }}
      />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
