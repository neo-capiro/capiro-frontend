import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { DefaultConversationStart } from "../../../src/shared/shell/DefaultConversationStart";
import { useNewConversationNavigation } from "../../../src/shared/shell/useNewConversationNavigation";
import { DataProvider } from "../../../src/shared/portfolio/api/provider";
import { currentPreferencesFixture } from "../../../tests/meri-user-preferences-fixtures";
import "../../../src/app/globals.css";
const first = currentPreferencesFixture.read.owner;
function Start({ owner }: { owner: typeof first }) {
  const start = useNewConversationNavigation();
  return (
    <DefaultConversationStart
      owner={owner}
      start={(clientId) => start({ ...owner, clientId })}
    >
      {(control) => <button {...control}>New conversation</button>}
    </DefaultConversationStart>
  );
}
function Harness() {
  const [owner, setOwner] = useState(first);
  return (
    <main>
      <h1>Synthetic default-client fixture</h1>
      <button
        onClick={() =>
          setOwner({
            ...first,
            actorId: "10000000-0000-4000-8000-000000000002",
          })
        }
      >
        Switch account
      </button>
      <DataProvider key={owner.actorId}>
        <Start owner={owner} />
      </DataProvider>
      <label>
        Focus example <input />
      </label>
      <style>
        {"@keyframes fixture-spin { to { transform: rotate(360deg); } }"}
      </style>
      <span
        data-testid="progress"
        style={{
          display: "inline-block",
          animation: "fixture-spin 1s linear infinite",
        }}
      >
        Working
      </span>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
