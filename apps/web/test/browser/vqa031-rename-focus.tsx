import { useState } from "react";
import { createRoot } from "react-dom/client";
import { SelectedConversationActions } from "../../src/features/meri/conversations/SelectedConversationActions";
import type { ConversationSummary } from "../../src/shared/meri-conversations/history-client";
import { syncMeriTabIdentity } from "../../src/shared/meri-conversations/tab-journal";
import "../../src/app/globals.css";
import "./font.css";

/**
 * VQA-031 synthetic host: the real selected-row action owner (`SelectedConversationActions`, which owns
 * the actual Rename button and the real `RenameConversationDialog`/`MeriDialog`) on one synthetic
 * selected row. The tab identity is primed through the production journal owner so the real management
 * journal exists and the Rename control is as enabled as it is in the application; no product service or
 * live data is contacted. Harness controls replace exactly the state the application supplies: read
 * currentness, access and the selected row/account identity.
 */
syncMeriTabIdentity("synthetic-rename-focus-session");

const summary = (
  conversationId: string,
  revision: string,
): ConversationSummary => ({
  conversationId,
  title: "Synthetic planning conversation",
  status: "active",
  revision,
  scopeKind: "general",
  clientId: null,
  updatedAt: "2026-11-03T00:00:00Z",
  archivedAt: null,
  trashedAt: null,
  restoreUntil: null,
  hasTranscript: false,
  canManage: true,
});

function Harness() {
  const [current, setCurrent] = useState(true);
  const [available, setAvailable] = useState(true);
  const [selected, setSelected] = useState({
    conversationId: "synthetic-conversation-a",
    revision: "1",
  });
  const [account, setAccount] = useState({
    tenantId: "synthetic-tenant",
    actorId: "synthetic-actor",
  });
  return (
    <main>
      <h1>Selected conversation actions</h1>
      <div role="group" aria-label="Synthetic harness controls">
        <button type="button" onClick={() => setCurrent((value) => !value)}>
          Toggle current read
        </button>
        <button type="button" onClick={() => setAvailable((value) => !value)}>
          Toggle access
        </button>
        <button
          type="button"
          onClick={() =>
            setSelected({
              conversationId: "synthetic-conversation-b",
              revision: "2",
            })
          }
        >
          Replace selected row
        </button>
        <button
          type="button"
          onClick={() =>
            setAccount({
              tenantId: "synthetic-tenant",
              actorId: "synthetic-actor-replaced",
            })
          }
        >
          Replace signed-in account
        </button>
      </div>
      <p role="status">Read: {current ? "current" : "revalidating"}</p>
      {/* Mirrors ConversationHistoryList: the selected area is hidden while the read is not current. */}
      <div hidden={!current}>
        <section aria-label="Conversation history">
          <SelectedConversationActions
            key={`${account.tenantId}:${account.actorId}:${selected.conversationId}`}
            row={summary(selected.conversationId, selected.revision)}
            account={account}
            available={available}
            current={current}
            refresh={() => undefined}
          />
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
