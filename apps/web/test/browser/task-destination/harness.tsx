import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ConversationIntents } from "../../../src/features/meri/conversation/intents/ConversationIntents";
import { createIntentsAccess } from "../../../src/shared/meri-intents/access";
import { ProposalPanel } from "../../../src/features/meri/actions/ProposalPanel";
import { TaskUpdateProposal } from "../../../src/features/meri/task-updates/TaskUpdateProposal";
import { GovernedActionWorkflow } from "../../../src/shared/meri-actions/workflow-adapter";
import { TaskUpdateWorkflow } from "../../../src/shared/meri-task-commands/workflow-adapter";
import { actionTransport } from "../../../src/shared/meri-actions/workflow-transport";
import { taskCommandTransport } from "../../../src/shared/meri-task-commands/transport";
import { receiveSessionReceipt } from "../../../src/shared/meri-actions/session-receipt";
import type {
  ActionAttempt,
  ActionAttemptJournal,
} from "../../../src/shared/meri-actions/attempt-journal";
import { CapiroDataProvider } from "../../../src/shared/capiro/CapiroBoundary";
import { WorkspaceScreen } from "../../../src/features/modules/workspace/WorkspaceScreen";
import context from "../../../tests/fixtures/meri-intents/context.json";

const credential = `action_session_${"a".repeat(43)}`;
function Chat() {
  const [life] = useState(() => new AbortController());
  const access = useMemo(
    () => createIntentsAccess(credential, life.signal),
    [life],
  );
  useEffect(() => () => life.abort(), [life]);
  return <ConversationIntents access={access} scope={context} />;
}
function Standalone({ mode }: { mode: "create" | "update" }) {
  const [life] = useState(() => new AbortController());
  const [result, setResult] = useState<ReactNode>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => life.abort(), [life]);
  async function load() {
    setBusy(true);
    try {
      const payload = await (
        await fetch(`/synthetic/mf12?mode=${mode}`, { signal: life.signal })
      ).json();
      const session = receiveSessionReceipt(
        JSON.stringify({
          credential,
          context: payload.context,
          expiresAtMs: Date.now() + 60_000,
        }),
        Date.now(),
      );
      let attempt: ActionAttempt = { status: "idle" };
      const journal: ActionAttemptJournal = {
        read: () => attempt,
        write: (next) => {
          attempt = next;
        },
      };
      const common = {
        session,
        journal,
        onAccessLost: () => life.abort(),
        now: () => Date.now(),
      };
      if (mode === "create") {
        const port = new GovernedActionWorkflow({
          ...common,
          transport: actionTransport(credential, life.signal),
        });
        const queried = await port.query(life.signal);
        if (!queried.ok) throw Error(queried.problem);
        const draft = await port.draft(
          queried.value.items[0]!.selection,
          payload.edits,
          life.signal,
        );
        if (!draft.ok) throw Error(draft.problem);
        const proposal = await port.prepare(draft.value.handle, life.signal);
        if (!proposal.ok) throw Error(proposal.problem);
        const outcome = await port.execute(proposal.value.handle, life.signal);
        if (!outcome.ok || outcome.value.status !== "observed")
          throw Error("Receipt not observed");
        life.signal.throwIfAborted();
        setResult(
          <ProposalPanel
            proposal={proposal.value}
            execution={outcome.value}
            refused={false}
            pending={false}
            disabled
            onExecute={() => {
              throw Error("No fixture replay");
            }}
          />,
        );
      } else {
        const port = new TaskUpdateWorkflow({
          ...common,
          transport: taskCommandTransport(
            credential,
            session.context,
            life.signal,
          ),
          isCurrent: () => !life.signal.aborted,
        });
        const proposal = await port.prepare(payload.input, life.signal);
        if (!proposal.ok) throw Error(proposal.problem);
        const outcome = await port.execute(proposal.value.handle, life.signal);
        if (!outcome.ok || outcome.value.status !== "observed")
          throw Error("Receipt not observed");
        life.signal.throwIfAborted();
        setResult(
          <TaskUpdateProposal
            proposal={proposal.value}
            execution={outcome.value}
            disabled
            onExecute={() => {
              throw Error("No fixture replay");
            }}
          />,
        );
      }
    } catch (error) {
      if (!life.signal.aborted) setResult(<p role="alert">{String(error)}</p>);
    } finally {
      if (!life.signal.aborted) setBusy(false);
    }
  }
  return (
    <>
      {!result && (
        <button disabled={busy} onClick={() => void load()}>
          Load synthetic receipt
        </button>
      )}
      {result}
    </>
  );
}
function App() {
  const path = usePathname();
  const mode = useSearchParams().get("mode");
  return (
    <CapiroDataProvider
      onSessionExpired={() => {
        throw Error("Unexpected fixture expiry");
      }}
    >
      <aside>
        Explicit synthetic local fixture. No task, model or provider effect.
      </aside>
      {path === "/modules/workspace" ? (
        <WorkspaceScreen />
      ) : mode === "chat" ? (
        <Chat />
      ) : (
        <Standalone mode={mode === "update" ? "update" : "create"} />
      )}
    </CapiroDataProvider>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
