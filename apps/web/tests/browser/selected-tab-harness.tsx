import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { CapiroDataProvider } from "../../src/shared/capiro/CapiroBoundary";
import { createConversationPort } from "../../src/shared/meri-conversations/port";
import { MeriComposer } from "../../src/features/meri/MeriComposer";
import { useComposerAttachments } from "../../src/features/meri/uploads/useComposerAttachments";
import {
  installTabPortFixture,
  tabContext,
} from "./selected-tab-native-fixture";
import "../../src/app/globals.css";
import "./test-font.css";

window.__tabFixture = installTabPortFixture();
function Harness() {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [owner] = useState(() => {
    const lifetime = new AbortController();
    const port = createConversationPort(
      {
        session: {
          context: tabContext,
          credential: `action_session_${"F".repeat(43)}`,
          expiresAtMs: Date.now() + 600000,
        },
        signal: lifetime.signal,
        isCurrent: () => !lifetime.signal.aborted,
        onAccessLost: () => lifetime.abort(),
        now: Date.now,
      },
      {},
    );
    return { lifetime, port };
  });
  useEffect(
    () => () => {
      owner.lifetime.abort();
      owner.port.dispose();
    },
    [owner],
  );
  const attachments = useComposerAttachments(owner.port, "");
  return (
    <main style={{ padding: 24, maxWidth: 860, margin: "auto" }}>
      <h1>Selected-tab component fixture</h1>
      <p>
        Synthetic native port and service responses; real composer and upload
        owners.
      </p>
      <button onClick={() => owner.lifetime.abort()}>End native session</button>
      <div style={{ paddingTop: 360 }}>
        <MeriComposer
          draft={draft}
          onDraft={setDraft}
          textareaRef={textareaRef}
          attachments={attachments}
          live={{
            scope: "General",
            attachUnavailable: "",
            onSend: () => undefined,
          }}
        />
      </div>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <CapiroDataProvider onSessionExpired={() => undefined}>
    <Harness />
  </CapiroDataProvider>,
);
