import { useEffect, useState, useSyncExternalStore } from "react";
import { createMeriConversation } from "@capiro/meri-client/conversation";
import type { MeriConversationPort } from "../../src/shared/meri-conversations/host-controller";
import { syncMeriTabIdentity } from "../../src/shared/meri-conversations/tab-journal";
import { useMeriTabSession } from "../../src/shared/meri-conversations/MeriTabSession";
import { useRunLifecycle } from "../../src/features/meri/conversation/lifecycle/useRunLifecycle";
import { RunLifecycleControls } from "../../src/features/meri/conversation/lifecycle/RunLifecycleControls";
import { turnFromObservation } from "../../src/features/meri/conversation/conversation-view";
import { SkillSelectionPicker } from "../../src/features/meri/conversation/SkillSelectionPicker";
import { useConversationLocalState } from "../../src/features/meri/conversation/useConversationLocalState";
import { ClientHandoffDraft } from "../../src/features/meri/conversation/ClientHandoffDraft";
import { clientHandoff } from "../../src/shared/meri-conversations/client-handoff";

const id = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const context = {
  tenantId: "synthetic",
  actorId: "actor",
  conversationId: id(1),
  runId: id(2),
  selectedClientId: id(5),
};
function MountedRun() {
  const [port] = useState(() => {
    const controller = new AbortController();
    return {
      ...createMeriConversation({
        context,
        signal: controller.signal,
        isCurrent: () => !controller.signal.aborted,
        onAccessLost: () => controller.abort(),
        expiresAtMs: Date.now() + 600_000,
        credential: `action_session_${"s".repeat(43)}`,
      }),
      context,
    } as MeriConversationPort;
  });
  const [target, setTarget] = useState("");
  const [draftShown, showDraft] = useState(false);
  const local = useConversationLocalState(context, false, {
    ...context,
    clientId: context.selectedClientId,
  });
  const snapshot = useSyncExternalStore(
    port.subscribe,
    port.getSnapshot,
    port.getSnapshot,
  );
  const lifecycle = useRunLifecycle(
    port,
    () => {},
    () => {},
    (value) => setTarget(JSON.stringify(value)),
  );
  useEffect(() => {
    void port.history();
    return () => port.dispose();
  }, [port]);
  return (
    <>
      <p role="status">Port: {snapshot.status}</p>
      <RunLifecycleControls
        lifecycle={lifecycle}
        turn={
          snapshot.observation
            ? turnFromObservation(snapshot.observation, context.runId)
            : null
        }
        disabled={snapshot.status !== "ready"}
      />
      <output aria-label="Target">{target}</output>
      <SkillSelectionPicker
        key={JSON.stringify(local.skillSelection)}
        clientId={context.selectedClientId}
        selection={local.skillSelection ?? {}}
        onChange={local.setSkillSelection}
        disabled={snapshot.status !== "ready"}
      />
      <output aria-label="Applied selection">
        {JSON.stringify(local.skillSelection)}
      </output>
      <button
        onClick={() => {
          clientHandoff(context).write({
            clientId: context.selectedClientId,
            draft: "Reviewed synthetic initial message",
          });
          showDraft(true);
        }}
      >
        Prepare client draft
      </button>
      {draftShown && (
        <ClientHandoffDraft
          context={context}
          draft={local.draft}
          onDraft={local.setDraft}
          disabled={snapshot.status !== "ready"}
        />
      )}
      <label>
        Message draft
        <textarea
          value={local.draft}
          onChange={(event) => local.setDraft(event.target.value)}
        />
      </label>
    </>
  );
}
/** Test-only mounted production controls using the actual public client and receiver. */
export function SelectedLifecycleProbe() {
  const [epoch, setEpoch] = useState(0);
  const session = useMeriTabSession("synthetic-session-a");
  return (
    <main>
      <button onClick={() => setEpoch((value) => value + 1)}>
        Reopen source session
      </button>
      <button
        onClick={() => {
          syncMeriTabIdentity("synthetic-session-b");
          setEpoch((value) => value + 1);
        }}
      >
        Replace signed-in session
      </button>
      {session.status === "ready" && <MountedRun key={epoch} />}
    </main>
  );
}
