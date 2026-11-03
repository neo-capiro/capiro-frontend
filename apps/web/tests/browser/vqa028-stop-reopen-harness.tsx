import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMeriConversation } from "@capiro/meri-client/conversation";
import { useLiveRun } from "../../src/features/meri/conversation/useLiveRun";
import { RunStatus } from "../../src/features/meri/conversation/RunStatus";
import { composerAvailability } from "../../src/features/meri/conversation/MeriLiveConversation";
import {
  isTerminal,
  turnFromObservation,
} from "../../src/features/meri/conversation/conversation-view";
import { conversationIntentJournal } from "../../src/shared/meri-conversations/query-journal";
import { syncMeriTabIdentity } from "../../src/shared/meri-conversations/tab-journal";
import type { MeriConversationPort } from "../../src/shared/meri-conversations/host-controller";

/**
 * VQA-028 mounted regression fixture. Everything under test is the shipped module: the public
 * conversation client and its history receiver, the real query-cache/session-storage journal, the
 * real run hooks and command gate, the real RunStatus, and the production composerAvailability.
 * React is real too - no effect, ref or gate mocking - so commit batching and StrictMode apply.
 * The only synthetic parts are the transport responses and the identifiers below.
 */
const binding = {
  tenantId: "10000000-0000-4000-8000-000000000001",
  actorId: "20000000-0000-4000-8000-000000000002",
  conversationId: "30000000-0000-4000-8000-000000000003",
  runId: "40000000-0000-4000-8000-000000000004",
  attemptId: "50000000-0000-4000-8000-000000000005",
  workerId: "60000000-0000-4000-8000-000000000006",
  writerFence: 1,
};
const clientId = "11000000-0000-4000-8000-000000000001";
const context = {
  tenantId: binding.tenantId,
  actorId: binding.actorId,
  conversationId: binding.conversationId,
  runId: binding.runId,
  selectedClientId: clientId,
};
const stored = {
  requestId: "a0000000-0000-4000-8000-00000000000a",
  prompt: "Synthetic retained request",
  windowRequest: null,
  window: null,
  skill: null,
};

type Options = {
  state?: string;
  strict?: boolean;
  storedCancel?: "observed" | "unknown";
  noStoredCancel?: boolean;
  cancel?: "lost" | "cancelled" | "completed";
  readFails?: boolean;
  foreignRun?: boolean;
  writeFails?: boolean;
};

/** What the last committed render showed. Effects publish it on window; the render body never does. */
type ProbeHost = {
  vqa028Probe?: {
    run: ReturnType<typeof useLiveRun>;
    ready: boolean;
    controlsHeld: boolean;
  };
  vqa028Repaint?: () => void;
};
const probe = () => window as unknown as ProbeHost;

const root = createRoot(document.getElementById("root")!);
let options: Options = {};
let port: MeriConversationPort;
let cache: QueryClient;
let journal: ReturnType<typeof conversationIntentJournal>;
let cleanup = () => {};
let live = true;
let refuseWrites = false;
let emitTerminal: (() => void) | undefined;
let writes = 0;
const calls: string[] = [];

/** Count this tab's journal writes, and refuse them on request, without touching real storage. */
const nativeSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function (key, value) {
  if (this === sessionStorage) {
    writes += 1;
    if (refuseWrites) throw new Error("synthetic storage refusal");
  }
  return nativeSetItem.call(this, key, value);
};

function historyResponse() {
  const state = options.state ?? "cancelled";
  const runBinding = options.foreignRun
    ? { ...binding, runId: "40000000-0000-4000-8000-000000000099" }
    : binding;
  const scopes = [
    {
      tenantId: binding.tenantId,
      kind: "client" as const,
      resourceId: clientId,
      policyRevision: "policy1",
    },
  ];
  return {
    run: {
      binding: runBinding,
      state,
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
    request: stored,
    events: [
      {
        contractVersion: "0.1.0",
        eventId: "70000000-0000-4000-8000-000000000001",
        binding: runBinding,
        sequence: 1,
        createdAt: "2026-10-13T00:00:00Z",
        scopes,
        type: "run.status",
        data: { state, reasonCode: null },
      },
    ],
    nextSequence: 1,
    lastSequence: 1,
    hasMore: false,
  };
}

/** The producer's own UI-message-stream frames; the public client admits the event inside them. */
function sseFrames(event: unknown) {
  const frames = [
    { type: "start", messageId: "90000000-0000-4000-8000-000000000009" },
    {
      type: "data-meri-event",
      transient: true,
      id: (event as { eventId: string }).eventId,
      data: event,
    },
    { type: "finish" },
  ];
  return `${frames.map((frame) => `data: ${JSON.stringify(frame)}\n\n`).join("")}data: [DONE]\n\n`;
}

function Probe() {
  const [, update] = useState(0);
  const run = useLiveRun(port, undefined, stored);
  const turn = run.snapshot.observation
    ? turnFromObservation(run.snapshot.observation, context.runId)
    : null;
  const availability = composerAvailability(
    run,
    turn,
    [],
    undefined,
    undefined,
    undefined,
    undefined,
    true,
    false,
  );
  // The production readiness lock, unchanged from MeriLiveConversation.
  const controlsHeld =
    run.busy ||
    !!run.storageError ||
    run.snapshot.status !== "ready" ||
    run.intent.submit?.state === "unknown" ||
    run.intent.cancel === "unknown";
  useEffect(() => {
    // Publish after the commit: the spec reads what the person would actually see.
    probe().vqa028Probe = {
      run,
      ready: availability.readyForNext,
      controlsHeld,
    };
    probe().vqa028Repaint = () => update((value) => value + 1);
  });
  return (
    <>
      <h1>Synthetic VQA-028 reopen</h1>
      <RunStatus run={run} active={!isTerminal(turn?.runState)} />
      <button type="button" onClick={() => void run.cancel()}>
        Synthetic Stop
      </button>
      <output data-testid="state">
        {turn?.runState ?? run.snapshot.status}
      </output>
      <output data-testid="ready">{String(availability.readyForNext)}</output>
      <output data-testid="held">{String(controlsHeld)}</output>
    </>
  );
}

const api = {
  start(next: Options = {}) {
    cleanup();
    root.render(null);
    probe().vqa028Probe = undefined;
    sessionStorage.clear();
    syncMeriTabIdentity("synthetic-vqa028", sessionStorage);
    options = next;
    live = true;
    refuseWrites = false;
    // This tab's own record: the run's message was acknowledged, and its Stop may have been sent.
    const previous = new QueryClient();
    conversationIntentJournal(previous, context, sessionStorage).write({
      submit: {
        requestId: stored.requestId,
        prompt: stored.prompt,
        state: "observed",
      },
      ...(next.noStoredCancel
        ? {}
        : { cancel: next.storedCancel ?? "observed" }),
    });
    previous.clear();
    // Only the run's own traffic and writes are counted from here on.
    writes = 0;
    calls.length = 0;
    refuseWrites = !!next.writeFails;
    cache = new QueryClient();
    const controller = new AbortController();
    const sdk = createMeriConversation({
      context,
      credential: `action_session_${"s".repeat(43)}`,
      expiresAtMs: Date.now() + 60_000,
      signal: controller.signal,
      isCurrent: () => live,
      onAccessLost: () => {},
      fetchImpl: async (url, init) => {
        const path = String(url);
        calls.push(path);
        if (path.endsWith("/history")) {
          if (next.readFails)
            return Response.json(
              { error: { code: "PRODUCT_UNAVAILABLE" } },
              { status: 502 },
            );
          return Response.json(historyResponse());
        }
        if (path.endsWith("/cancel")) {
          if (next.cancel === "lost")
            throw new Error("synthetic response loss");
          return Response.json({ state: next.cancel ?? "cancelled" });
        }
        if (path.includes("/events") || path.includes("/subscribe"))
          return new Promise<Response>((resolve, reject) => {
            const signal = init?.signal;
            if (signal?.aborted)
              reject(new DOMException("aborted", "AbortError"));
            else
              signal?.addEventListener(
                "abort",
                () => reject(new DOMException("aborted", "AbortError")),
                { once: true },
              );
            // The run's own observation stream: one exact same-run terminal event, admitted by the
            // public client exactly as a live producer would, then the producer's finish frames.
            emitTerminal = () => {
              const event = {
                ...historyResponse().events[0],
                eventId: "70000000-0000-4000-8000-000000000002",
                sequence: 2,
                data: { state: "cancelled", reasonCode: null },
              };
              resolve(
                new Response(sseFrames(event), {
                  headers: {
                    "content-type": "text/event-stream",
                    "x-vercel-ai-ui-message-stream": "v1",
                  },
                }),
              );
            };
          });
        throw new Error(`Unexpected synthetic route ${path}`);
      },
    });
    port = { ...sdk, context } as MeriConversationPort;
    journal = conversationIntentJournal(cache, context, sessionStorage);
    cleanup = () => {
      controller.abort();
      sdk.dispose();
      cache.clear();
    };
    const view = (
      <QueryClientProvider client={cache}>
        <Probe />
      </QueryClientProvider>
    );
    root.render(next.strict ? <StrictMode>{view}</StrictMode> : view);
  },
  inspect() {
    const shown = probe().vqa028Probe;
    return {
      status: port.getSnapshot().status,
      runState: port.getSnapshot().observation?.runState ?? null,
      journal: journal.read(),
      cancel: shown?.run.intent.cancel ?? null,
      ready: shown?.ready ?? false,
      controlsHeld: shown?.controlsHeld ?? true,
      calls: [...calls],
      writes,
      error: shown?.run.error ?? null,
      storageError: shown?.run.storageError ?? null,
      receipt: port.getSnapshot().cancelReceipt,
    };
  },
  async stop() {
    await probe().vqa028Probe?.run.cancel();
  },
  /** The exact same-run terminal event the run's own observation stream would deliver next. */
  terminalEvent() {
    emitTerminal?.();
  },
  /** Refuse this tab's journal writes from now on, without touching real storage. */
  failWrites(next: boolean) {
    refuseWrites = next;
  },
  async history(state?: string) {
    if (state) options = { ...options, state };
    await probe().vqa028Probe?.run.history();
  },
  setState(state: string) {
    options = { ...options, state };
  },
  loseAccess() {
    live = false;
    probe().vqa028Repaint?.();
  },
  force() {
    probe().vqa028Repaint?.();
  },
  unmount() {
    root.render(null);
  },
  dispose() {
    root.render(null);
    cleanup();
    probe().vqa028Probe = undefined;
  },
};

(window as unknown as { vqa028: typeof api }).vqa028 = api;
