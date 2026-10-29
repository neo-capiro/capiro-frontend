import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { SelectedConversationActions } from "../../../src/features/meri/conversations/SelectedConversationActions";
import {
  exportAccount,
  exportRow,
} from "../../../tests/conversation-export-fixture";
import "../../../src/app/globals.css";
function Harness() {
  const [available, setAvailable] = useState(true);
  const [actorId, setActorId] = useState(exportAccount.actorId);
  const [trashed, setTrashed] = useState(false);
  return (
    <main style={{ padding: 24 }}>
      <button onClick={() => setAvailable((value) => !value)}>
        Toggle access
      </button>
      <button onClick={() => setActorId("another-actor")}>
        Change account
      </button>
      <button onClick={() => setTrashed(true)}>Move fixture to Trash</button>
      <SelectedConversationActions
        key={actorId}
        row={{ ...exportRow, status: trashed ? "trashed" : "active" }}
        account={{ ...exportAccount, actorId }}
        available={available}
        current={available}
        refresh={() => {}}
      />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
