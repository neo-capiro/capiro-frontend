/**
 * VQA006 synthetic mounted lifecycle: the production readiness composition (saved history read,
 * retained turn intent, session run binding and sessionHistoryState) over a canonical synthetic
 * history. No browser credential, product model, provider or real conversation is involved.
 *
 * The only simulated boundary is control's transport: the transcript/next-turn endpoints and the
 * session's run binding, exactly as a fresh page receives them. Storage, query caching, React
 * commit order and readiness predicates are the product's own.
 */
import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConversationHistory } from "../../src/shared/meri-conversations/history-queries";
import { useConversationTurn } from "../../src/features/meri/conversation/useConversationTurn";
import { sessionHistoryState } from "../../src/features/meri/conversation/saved-turns";
import { syncMeriTabIdentity } from "../../src/shared/meri-conversations/tab-journal";
import { conversationTurnJournal } from "../../src/shared/meri-conversations/turn-journal";

const tenantId = "c0060000-0000-4000-8000-0000000000a1";
const actorId = "c0060000-0000-4000-8000-0000000000a2";
const clientId = "c0060000-0000-4000-8000-0000000000a3";
const conversationId = "c0060000-0000-4000-8000-000000000001";
const firstRunId = "c0060000-0000-4000-8000-000000000011";
const secondRunId = "c0060000-0000-4000-8000-000000000012";
const firstRequestId = "c0060000-0000-4000-8000-000000000021";
const secondRequestId = "c0060000-0000-4000-8000-000000000022";
const createdAt = "2026-10-13T00:00:00.000Z";
const account = { tenantId, actorId };
const scopes = [
  {
    tenantId,
    kind: "client" as const,
    resourceId: clientId,
    policyRevision: "policy1",
  },
];

type Binding = {
  tenantId: string;
  actorId: string;
  conversationId: string;
  runId: string;
  attemptId: string;
  workerId: string;
  writerFence: number;
};

const bindingOf = (runId: string, fence: number): Binding => ({
  tenantId,
  actorId,
  conversationId,
  runId,
  attemptId: `c0060000-0000-4000-8000-0000000001${fence}1`,
  workerId: `c0060000-0000-4000-8000-0000000001${fence}2`,
  writerFence: fence,
});
const firstBinding = bindingOf(firstRunId, 1);
const secondBinding = bindingOf(secondRunId, 2);

const runOf = (binding: Binding, state: string) => ({
  binding,
  state,
  scopes,
  createdAt,
  policyRevision: "policy1",
  versions: {
    imageDigest: `sha256:${"a".repeat(64)}`,
    sdk: "0.3.295",
    cli: "2.1.295",
    contracts: "0.1.0" as const,
    skillsDigest: "b".repeat(64),
    checkpointFormat: "0.1.0" as const,
  },
});

const eventOf = (
  sequence: number,
  type: string,
  data: object,
  binding: Binding,
) => ({
  contractVersion: "0.1.0",
  eventId: `c0060000-0000-4000-8000-${String(binding.writerFence)}${String(sequence).padStart(11, "0")}`,
  binding,
  sequence,
  createdAt,
  scopes,
  type,
  data,
});

const turnOf = (options: {
  binding: Binding;
  requestId: string;
  prompt: string;
  sequenceBase: number;
  sequenceEnd?: number | null;
  lastSequence: number;
  /** A stored choice the retained message never submitted: the canonical receiver refuses to pair
   * it with that input, so the journal must keep the intent and the page protected. */
  storedWindow?: object | null;
  storedUploads?: { uploadId: string; sha256: string }[];
}) => ({
  run: runOf(options.binding, "completed"),
  request: {
    requestId: options.requestId,
    prompt: options.prompt,
    skill: null,
    window: null,
    windowRequest: options.storedWindow ?? null,
    ...(options.storedUploads ? { uploads: options.storedUploads } : {}),
  },
  promptLineage: {
    kind: "submission" as const,
    logicalRequestId: options.requestId,
    sourceBinding: null,
    sourceRequestId: null,
  },
  sequenceBase: options.sequenceBase,
  sequenceEnd: options.sequenceEnd ?? null,
  lastSequence: options.lastSequence,
});

type Turn = ReturnType<typeof turnOf>;
type Event = ReturnType<typeof eventOf>;

/** Control's synthetic transcript: one completed run, later a second one, with its reservation. */
const world: {
  turns: Turn[];
  events: { sequence: number; event: Event }[];
  pendingTurn: object | null;
} = {
  turns: [
    turnOf({
      binding: firstBinding,
      requestId: firstRequestId,
      prompt: "Synthetic first question",
      sequenceBase: 0,
      lastSequence: 2,
    }),
  ],
  events: [
    {
      sequence: 1,
      event: eventOf(
        1,
        "message.delta",
        { messageId: firstRequestId, text: "Synthetic first answer" },
        firstBinding,
      ),
    },
    {
      sequence: 2,
      event: eventOf(
        2,
        "run.status",
        { state: "completed", reasonCode: null },
        firstBinding,
      ),
    },
  ],
  pendingTurn: null,
};

const conversation = {
  conversationId,
  owner: { tenantId, actorId },
  scopes,
  createdAt,
  policyRevision: "policy1",
};

const reservedTurn = () => ({
  schema: "meri.conversation-turn/1" as const,
  sourceBinding: firstBinding,
  targetBinding: secondBinding,
  state: "RESERVED" as const,
  replayed: true,
});

/** Control admits the reserved successor and it completes: the ordinary next-turn outcome. */
let submitted: { requestId: string; prompt: string } | null = null;
const message = "Synthetic rewrite";
const windowState: {
  storedWindow: object | null;
  storedUploads?: { uploadId: string; sha256: string }[];
  selection?: object;
} = { storedWindow: null };
function admitSecond() {
  const first = world.turns[0]!;
  first.sequenceEnd = first.sequenceBase + first.lastSequence;
  const base = world.events.at(-1)!.sequence;
  const requestId = submitted?.requestId ?? secondRequestId;
  world.turns.push(
    turnOf({
      binding: secondBinding,
      requestId,
      prompt: submitted?.prompt ?? message,
      sequenceBase: base,
      lastSequence: 2,
      storedWindow: windowState.storedWindow,
      storedUploads: windowState.storedUploads,
    }),
  );
  world.events = [
    ...world.events,
    {
      sequence: base + 1,
      event: eventOf(
        1,
        "message.delta",
        { messageId: requestId, text: "Synthetic rewrite answer" },
        secondBinding,
      ),
    },
    {
      sequence: base + 2,
      event: eventOf(
        2,
        "run.status",
        { state: "completed", reasonCode: null },
        secondBinding,
      ),
    },
  ];
  world.pendingTurn = null;
}

function transcriptPage(input: { after?: number; limit?: number }) {
  const after = input.after ?? 0;
  const limit = input.limit ?? 50;
  const events = world.events
    .filter((row) => row.sequence > after)
    .slice(0, limit);
  const touched = new Set(events.map(({ event }) => event.binding.runId));
  const latest = world.turns.at(-1)!;
  const lastSequence = world.events.at(-1)!.sequence;
  const nextSequence = events.at(-1)?.sequence ?? after;
  return {
    schema: "meri.conversation-transcript/1",
    conversation,
    latestRun: latest.run,
    latestSequenceBase: latest.sequenceBase,
    turns: world.turns.filter((row) => touched.has(row.run.binding.runId)),
    events,
    nextSequence,
    lastSequence,
    hasMore: nextSequence < lastSequence,
    pendingTurn: world.pendingTurn,
  };
}

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const decode = (body: BodyInit | null | undefined) => {
  if (body == null) return {};
  if (typeof body === "string") return JSON.parse(body);
  if (body instanceof Uint8Array)
    return JSON.parse(new TextDecoder().decode(body));
  if (body instanceof ArrayBuffer)
    return JSON.parse(new TextDecoder().decode(new Uint8Array(body)));
  return {};
};

const realFetch = window.fetch.bind(window);
let reserveCalls = 0;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (url.includes("/api/conversations/transcript"))
    return reply(transcriptPage(decode(init?.body)));
  if (url.includes("/api/conversations/next-turn")) {
    reserveCalls += 1;
    world.pendingTurn = reservedTurn();
    return reply(world.pendingTurn);
  }
  return realFetch(input as RequestInfo, init);
};

type Observed = {
  nextBlocked: string | null;
  unknown: boolean;
  recovery: boolean;
  source: string | null;
  intent: { state: string; source: string; target: string | null } | null;
  opened: string | null;
  storageError: string | null;
  reserveCalls: number;
  denied: boolean;
  error: string | null;
  hasCurrent: boolean;
  hasSaved: boolean;
  pages: number;
  pending: boolean;
  sessionRun: string | null;
  canAck: boolean | null;
  pendingTurn: boolean;
  latestState: string | null;
  latestRequest: string | null;
  intentRequest: string | null;
};

/** The probe the synthetic page exposes to the Playwright driver. */
type Review = {
  observed: Observed;
  sessionRun?: string;
  setSessionRun: (runId: string) => void;
  startNext: () => Promise<boolean>;
  refresh: () => void;
  root?: { unmount: () => void };
  away: () => void;
  reopen: (runId: string) => void;
  admit: () => void;
  controlStores: (windowRequest: object | null) => void;
  controlStoresUploads: (
    uploads: { uploadId: string; sha256: string }[] | undefined,
  ) => void;
  composer: (selection: object | undefined) => void;
};

/** The single probe the driver reads; published on window once, never during render. */
const page = {} as Review;

const observed: Observed = {
  nextBlocked: null,
  unknown: false,
  recovery: false,
  source: null,
  intent: null,
  opened: null,
  storageError: null,
  reserveCalls: 0,
  denied: false,
  error: null,
  hasCurrent: false,
  hasSaved: false,
  pages: 0,
  pending: true,
  sessionRun: null,
  canAck: null,
  pendingTurn: false,
  latestState: null,
  latestRequest: null,
  intentRequest: null,
};

function Screen({ epoch }: { epoch: number }) {
  const [sessionRun, setSessionRun] = useState<string | undefined>(
    () => page.sessionRun,
  );
  const history = useConversationHistory(
    account,
    clientId,
    conversationId,
    true,
  );
  const open = useCallback(
    (target: { runId: string; requestId?: string; prompt?: string }) => {
      if (target.requestId)
        submitted = { requestId: target.requestId, prompt: message };
      setSessionRun(target.runId);
    },
    [],
  );
  const continuation = useConversationTurn(
    account,
    clientId,
    conversationId,
    open,
    sessionRun === history.current?.latestRun.binding.runId
      ? history.current
      : undefined,
    epoch,
  );
  const view = sessionHistoryState(
    {
      ...history,
      reading: history.query.isPending || history.query.isRefetching,
    },
    sessionRun,
    [],
    continuation.intent,
    continuation.busy,
    continuation.failure,
    continuation.opened,
  );
  useEffect(() => {
    page.setSessionRun = setSessionRun;
    page.startNext = () =>
      view.source
        ? continuation.start(
            view.source,
            message,
            () => {},
            undefined,
            (windowState.selection ?? {}) as never,
            undefined,
          )
        : Promise.resolve(false);
    // The page re-reads the transcript when its session/run changes, as the product does.
    page.refresh = () => history.refresh();
  }, [view, continuation, setSessionRun, history]);
  useEffect(() => {
    observed.nextBlocked = view.nextBlocked ?? null;
    observed.unknown = view.unknownReservation;
    observed.recovery = view.recoveryNeeded;
    observed.source = view.source?.runId ?? null;
    observed.intent = continuation.intent
      ? {
          state: continuation.intent.state,
          source: continuation.intent.source.runId,
          target: continuation.intent.receipt?.targetBinding.runId ?? null,
        }
      : null;
    observed.opened = continuation.opened ?? null;
    observed.storageError = continuation.storageError ?? null;
    observed.reserveCalls = reserveCalls;
    const probe = conversationTurnJournal(
      cache,
      account,
      clientId,
      conversationId,
    );
    observed.canAck = history.current
      ? probe.canAcknowledgeCompleted(history.current)
      : null;
    observed.pendingTurn = !!history.current?.pendingTurn;
    observed.latestState = history.current?.latestRun.state ?? null;
    observed.latestRequest = history.current
      ? (history.current.turns.find(
          (turn) =>
            turn.run.binding.runId === history.current!.latestRun.binding.runId,
        )?.request.requestId ?? null)
      : null;
    observed.intentRequest = continuation.intent?.requestId ?? null;
    observed.denied = history.denied;
    observed.error = history.query.error ? String(history.query.error) : null;
    observed.hasCurrent = !!history.current;
    observed.hasSaved = !!history.saved;
    observed.pages = history.query.data?.pages?.length ?? 0;
    observed.pending = history.query.isPending;
    observed.sessionRun = sessionRun ?? null;
  });
  return null;
}

const options = { defaultOptions: { queries: { retry: false } } };
let cache = new QueryClient(options);
let epoch = 0;
const mount = () => {
  const container = document.getElementById("root")!;
  const root = createRoot(container);
  root.render(
    <QueryClientProvider client={cache}>
      <Screen epoch={epoch} />
    </QueryClientProvider>,
  );
  page.root = root;
};

/** Away: the page unmounts; only tab storage survives, as when the tab closes. */
page.away = () => {
  page.root?.unmount();
  epoch += 1;
};

/** Reopen: a fresh query owner over the same tab storage, with control reissuing the session. */
page.reopen = (runId: string) => {
  page.sessionRun = runId;
  cache = new QueryClient(options);
  mount();
};

page.observed = observed;
(window as unknown as { __vqa006: Review }).__vqa006 = page;
page.admit = admitSecond;
page.controlStores = (windowRequest: object | null) => {
  windowState.storedWindow = windowRequest;
};
page.controlStoresUploads = (uploads) => {
  windowState.storedUploads = uploads;
};
page.composer = (selection: object | undefined) => {
  windowState.selection = selection;
};
syncMeriTabIdentity(`${tenantId}/${actorId}`);
page.sessionRun = firstRunId;
mount();
