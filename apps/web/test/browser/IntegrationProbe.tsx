import { useState } from "react";
import { useCapiro } from "../../src/shared/capiro/CapiroBoundary";
import { useApi } from "../../src/shared/portfolio/api/provider";
import { identitySchema } from "../../src/shared/portfolio/auth/identity";
import { useSelectedClient } from "../../src/shared/session/SelectedClient";

/** Explicit synthetic diagnostic mounted below the real shared scope. */
export function IntegrationProbe() {
  const selected = useSelectedClient();
  const api = useCapiro();
  const core = useApi();
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState("");
  async function save() {
    try {
      await api.request("me.update", { body: { title: draft } });
      setResult("Saved test write");
    } catch {
      setResult("Test write unconfirmed");
    }
  }
  return (
    <aside aria-label="Synthetic integration probe">
      <output data-testid="client-state">
        {selected.state}
        {selected.state === "authorized-client"
          ? `: ${selected.client.name}`
          : ""}
      </output>
      <label>
        Scope draft
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
      <button onClick={() => void save()}>Hold synthetic write</button>
      <button
        onClick={() =>
          void core.request("core", "me", identitySchema).catch(() => {})
        }
      >
        Check synthetic Core session
      </button>
      <output>{result}</output>
    </aside>
  );
}
