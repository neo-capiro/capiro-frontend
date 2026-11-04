import { useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMeriConversation } from "@capiro/meri-client/conversation";
import { useLiveRun } from "../../src/features/meri/conversation/useLiveRun";
import { syncMeriTabIdentity } from "../../src/shared/meri-conversations/tab-journal";
import type { MeriConversationPort } from "../../src/shared/meri-conversations/host-controller";

// Real hooks, SDK and journals, with two credentials for the same synthetic run. The host
// retires the old port during commit, as happens when a renewed session replaces it.
const binding = {
  tenantId: "10000000-0000-4000-8000-000000000001",
  actorId: "20000000-0000-4000-8000-000000000002",
  conversationId: "30000000-0000-4000-8000-000000000003",
  runId: "40000000-0000-4000-8000-000000000004",
  attemptId: "50000000-0000-4000-8000-000000000005",
  workerId: "60000000-0000-4000-8000-000000000006",
  writerFence: 1,
};
const context = {
  tenantId: binding.tenantId,
  actorId: binding.actorId,
  conversationId: binding.conversationId,
  runId: binding.runId,
  selectedClientId: null,
};
const scopes = [
  {
    tenantId: binding.tenantId,
    kind: "private-user" as const,
    resourceId: binding.actorId,
    policyRevision: "policy1",
  },
];
const calls: string[] = [];
let retiredSettled = false;
let releaseOld = () => {};
const late = new URLSearchParams(location.search).has("late");
const history = () => ({
  run: {
    binding,
    state: "completed",
    scopes,
    createdAt: "2026-10-13T00:00:00Z",
    policyRevision: "policy1",
    versions: {
      imageDigest: `sha256:${"a".repeat(64)}`,
      sdk: "0.3.295",
      cli: "2.1.295",
      contracts: "0.1.0",
      skillsDigest: "b".repeat(64),
      checkpointFormat: "0.1.0",
    },
  },
  request: {
    requestId: "a0000000-0000-4000-8000-00000000000a",
    prompt: "Synthetic saved message",
    windowRequest: null,
    window: null,
    skill: null,
  },
  events: [
    {
      contractVersion: "0.1.0",
      eventId: "70000000-0000-4000-8000-000000000001",
      binding,
      sequence: 1,
      createdAt: "2026-10-13T00:00:00Z",
      scopes,
      type: "run.status",
      data: { state: "completed", reasonCode: null },
    },
  ],
  nextSequence: 1,
  lastSequence: 1,
  hasMore: false,
});
function makePort(name: "old" | "new") {
  const controller = new AbortController();
  const sdk = createMeriConversation({
    context,
    credential: `action_session_${name === "old" ? "a".repeat(43) : "b".repeat(43)}`,
    expiresAtMs: Date.now() + 60_000,
    signal: controller.signal,
    isCurrent: () => !controller.signal.aborted,
    onAccessLost: () => {},
    fetchImpl: async (url, init) => {
      calls.push(`${name}:${String(url)}`);
      if (!String(url).endsWith("/history"))
        throw new Error("Unexpected synthetic write or observation");
      if (name === "new") return Response.json(history());
      return new Promise<Response>((resolve, reject) => {
        releaseOld = () => resolve(Response.json(history()));
        if (!late) {
          const abort = () => reject(new DOMException("aborted", "AbortError"));
          if (init?.signal?.aborted) abort();
          else init?.signal?.addEventListener("abort", abort, { once: true });
        }
      });
    },
  });
  return {
    ...sdk,
    context,
    history: (...args: Parameters<typeof sdk.history>) =>
      sdk.history(...args).finally(() => {
        if (name === "old") retiredSettled = true;
      }),
    dispose: () => {
      controller.abort();
      sdk.dispose();
    },
  } as MeriConversationPort;
}
function Probe({ port }: { port: MeriConversationPort }) {
  const run = useLiveRun(port, undefined);
  return (
    <>
      <output data-testid="transcript">{run.transcript}</output>
      <output data-testid="busy">{String(run.busy)}</output>
      <output data-testid="error">{run.error ?? "none"}</output>
      <output data-testid="state">
        {run.snapshot.observation?.runState ?? "none"}
      </output>
    </>
  );
}
function Harness() {
  const [port, setPort] = useState(() => makePort("old"));
  useLayoutEffect(() => () => port.dispose(), [port]);
  return (
    <>
      <button onClick={() => setPort(makePort("new"))}>Replace session</button>
      <button onClick={() => releaseOld()}>Release retired read</button>
      <Probe port={port} />
    </>
  );
}
syncMeriTabIdentity("synthetic-renewal");
(window as unknown as { retiredSettled: () => boolean }).retiredSettled = () =>
  retiredSettled;
(window as unknown as { replacementCalls: () => string[] }).replacementCalls =
  () => [...calls];
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={new QueryClient()}>
    <Harness />
  </QueryClientProvider>,
);
