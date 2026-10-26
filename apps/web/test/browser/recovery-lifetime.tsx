/** Mounted qualification only: actual hook/host/public receiver/journals; HTTP is bounded by Playwright. */
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConversationConnection } from "../../src/features/meri/conversation/useConversationConnection";
import { useRunCommandJournal } from "../../src/features/meri/conversation/useRunCommandJournal";
import {
  conversationIntentJournal,
  conversationSelectionOwner,
} from "../../src/shared/meri-conversations/query-journal";
import { syncMeriTabIdentity } from "../../src/shared/meri-conversations/tab-journal";
import { useConversationHistory } from "../../src/shared/meri-conversations/history-queries";
import { ConversationHistoryUnavailable } from "../../src/shared/meri-conversations/history-client";
import type {
  MeriConversationPort,
  ConversationAccount,
} from "../../src/shared/meri-conversations/host-controller";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const initial = {
  tenantId: "synthetic-recovery-tenant",
  actorId: "synthetic-recovery-actor",
};
const cache = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
const clientId = id(5),
  conversationId = id(1),
  source = {
    ...initial,
    selectedClientId: clientId,
    conversationId,
    runId: id(2),
  };
syncMeriTabIdentity("synthetic-recovery-session", sessionStorage);
conversationSelectionOwner(
  cache,
  initial,
  clientId,
  conversationId,
  sessionStorage,
).record(source);
const original = conversationIntentJournal(cache, source, sessionStorage);
if (new URLSearchParams(location.search).has("unknown")) {
  original.write({
    submit: {
      requestId: id(20),
      prompt: "Synthetic retained unknown",
      state: "unknown",
    },
  });
}
const historyKey = [
  "meri-conversation-transcript",
  initial.tenantId,
  initial.actorId,
  clientId,
  conversationId,
];
cache
  .getQueryCache()
  .build(cache, { queryKey: historyKey })
  .setState({
    status: "error",
    error: new ConversationHistoryUnavailable(404, "NOT_FOUND"),
  });
const seededHistoryError = cache.getQueryState(historyKey)?.error;
const historySeedWasNotFound =
  seededHistoryError instanceof ConversationHistoryUnavailable &&
  seededHistoryError.status === 404;
let latest: ReturnType<typeof useConversationConnection>;
let journal: ReturnType<typeof useRunCommandJournal> | undefined;
let history: ReturnType<typeof useConversationHistory>;
let renders = 0,
  corruptions = 0,
  unmounts = 0;
const retained: Array<ReturnType<typeof conversationIntentJournal>> = [
  original,
];
const ports: MeriConversationPort[] = [];

function Journal({ port }: { port: MeriConversationPort }) {
  const alive = useRef(true);
  const current = useRunCommandJournal(port, undefined, alive);
  useEffect(() => {
    journal = current;
  }, [current]);
  useEffect(() => {
    retained.push(current.journal);
    ports.push(port);
    return () => {
      alive.current = false;
      unmounts++;
    };
  }, [port, current.journal]);
  return (
    <output data-testid="journal">
      {current.storageError
        ? "blocked"
        : (current.intent.submit?.state ?? "no-retained-request")}
    </output>
  );
}

function Probe({
  account,
  client,
}: {
  account: ConversationAccount;
  client: string;
}) {
  const connection = useConversationConnection(
    account,
    client,
    Date.now,
    conversationId,
  );
  const currentHistory = useConversationHistory(
    account,
    client,
    conversationId,
    false,
  );
  const [, rerender] = useState(0);
  useEffect(() => {
    latest = connection;
    history = currentHistory;
    renders++;
  });
  return (
    <>
      <output data-testid="connection">{connection.state.status}</output>
      <output data-testid="run">
        {connection.state.status === "ready"
          ? connection.state.port.context.runId
          : ""}
      </output>
      <button onClick={() => connection.retry()}>Retry exact</button>
      <button onClick={() => connection.revoke()}>Revoke access</button>
      <button onClick={() => rerender((n) => n + 1)}>Rerender</button>
      {connection.state.status === "ready" && (
        <Journal
          key={connection.state.lifetimeKey}
          port={connection.state.port}
        />
      )}
    </>
  );
}

function App() {
  const [account, setAccount] = useState(initial);
  const [client, setClient] = useState(clientId);
  const [mounted, setMounted] = useState(true);
  return (
    <QueryClientProvider client={cache}>
      <button onClick={() => setClient(id(6))}>Change client</button>
      <button
        onClick={() => {
          syncMeriTabIdentity("synthetic-other-session", sessionStorage);
          setAccount({ ...initial, actorId: "synthetic-other-actor" });
        }}
      >
        Change identity
      </button>
      <button onClick={() => setMounted(false)}>Unmount</button>
      {mounted && (
        <Probe
          key={JSON.stringify([account.tenantId, account.actorId, client])}
          account={account}
          client={client}
        />
      )}
    </QueryClientProvider>
  );
}

const recoveryFixture = {
  inspect: () => ({
    status: latest?.state.status,
    accessLost: latest?.accessLost,
    renders,
    corruptions,
    unmounts,
    historySeedWasNotFound,
    historyQueries: cache.getQueryCache().findAll({ queryKey: historyKey })
      .length,
    exposesHistoryAuthority: Object.hasOwn(history ?? {}, "unstarted"),
    journal: journal && {
      blocked: journal.journal.recoveryBlocked,
      current: journal.journal.current(),
      storageError: !!journal.storageError,
      intent: journal.intent,
    },
    retainedCurrent: retained.map((value) => value.current()),
    portCount: ports.length,
    portStates: ports.map((port) => port.getSnapshot().status),
  }),
  corruptRequest: () => {
    const keys = Object.keys(sessionStorage).filter(
      (key) =>
        key.startsWith("capiro-meri-chat-v1:") &&
        JSON.parse(key.slice("capiro-meri-chat-v1:".length))[1] === "request",
    );
    if (keys.length !== 1) throw Error("Expected one real serialized request");
    const stored = JSON.parse(sessionStorage.getItem(keys[0]!)!);
    if (stored.value.submit.state !== "unknown")
      throw Error("Expected a retained unknown request");
    sessionStorage.setItem(keys[0]!, "{invalid-json");
    corruptions++;
    return stored.value.submit.requestId;
  },
};
export type RecoveryFixture = typeof recoveryFixture;
Object.assign(window, { recoveryFixture });
createRoot(document.getElementById("root")!).render(<App />);
