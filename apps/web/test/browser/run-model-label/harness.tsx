import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConversationTurn } from "../../../src/features/meri/conversation/ConversationTurn";
import { ModelCatalogContext } from "../../../src/features/meri/model-selection/ModelCatalogContext";
import type { TurnView } from "../../../src/features/meri/conversation/conversation-view";
import { modelCatalog } from "../../../tests/meri-user-preferences-fixtures";
import "../../../src/app/globals.css";
import "../font.css";

/** Synthetic finished turns: one whose admitted request carried a model selection, one without. */
const turn = (runId: string, patch: Partial<TurnView>): TurnView => ({
  runId,
  prompt: "Summarize the synthetic committee update.",
  runState: "completed",
  omittedPrefix: false,
  browserReceipts: [],
  throughSequence: 3,
  messages: [
    {
      messageId: `${runId}-message`,
      text: "The committee scheduled the next hearing for 25 October.",
    },
  ],
  tools: [],
  sources: [],
  nativeSources: [],
  approvals: [],
  artifacts: [],
  errors: [],
  checkpointIds: [],
  usageIds: [],
  reasonCode: null,
  ...patch,
});
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main style={{ maxWidth: 880, padding: 24, margin: "0 auto" }}>
      <p>Synthetic run model label fixture</p>
      <ModelCatalogContext.Provider value={modelCatalog}>
        <ConversationTurn
          turn={turn("30000000-0000-4000-8000-000000000011", {})}
          label="Earlier turn 1"
        />
        <ConversationTurn
          turn={turn("30000000-0000-4000-8000-000000000012", {
            modelSelection: {
              provider: "bedrock",
              modelId: "synthetic-model",
              effort: "high",
            },
          })}
          label="Current turn"
        />
      </ModelCatalogContext.Provider>
    </main>
  </StrictMode>,
);
