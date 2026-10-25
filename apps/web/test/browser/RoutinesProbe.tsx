import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "../../src/shared/portfolio/api/provider";
import { CapiroDataProvider } from "../../src/shared/capiro/CapiroBoundary";
import { SelectedClientProvider } from "../../src/shared/session/SelectedClient";
import { MeriRoutinesHost } from "../../src/features/meri/routines/MeriRoutinesHost";
import { ProductShell } from "../../src/shared/shell/ProductShell";
import { ConversationIntents } from "../../src/features/meri/conversation/intents/ConversationIntents";
import { createIntentsAccess } from "../../src/shared/meri-intents/access";
import wire from "../../tests/fixtures/meri-routines/canonical.json";
import { useSearchParams } from "./navigation";

function Revalidate() {
  const cache = useQueryClient();
  return (
    <>
      <button
        onClick={() => void cache.invalidateQueries({ queryKey: ["identity"] })}
      >
        Revalidate routine account
      </button>
      <button
        onClick={() =>
          void cache.invalidateQueries({ queryKey: ["portfolio", "client"] })
        }
      >
        Revalidate routine client
      </button>
    </>
  );
}
function Chat() {
  const [session, setSession] = useState(0);
  const access = useMemo(
    () =>
      createIntentsAccess(
        "action_session_" + String(session).repeat(43),
        new AbortController().signal,
        fetch,
        wire.context,
      ),
    [session],
  );
  return (
    <>
      <button onClick={() => setSession((value) => value + 1)}>
        Replace routine session
      </button>
      <ConversationIntents access={access} scope={wire.context} />
    </>
  );
}
/** Synthetic network fixture mounting the actual production host and conversation review. */
export function RoutinesProbe() {
  const params = useSearchParams();
  if (params.get("chat") === "true") return <Chat />;
  return (
    <DataProvider>
      <CapiroDataProvider onSessionExpired={() => {}}>
        <Revalidate />
        <SelectedClientProvider
          requestedId={params.get("clientId") ?? undefined}
        >
          <ProductShell routineWorkflow section="routines">
            <MeriRoutinesHost enabled generalEnabled />
          </ProductShell>
        </SelectedClientProvider>
      </CapiroDataProvider>
    </DataProvider>
  );
}
