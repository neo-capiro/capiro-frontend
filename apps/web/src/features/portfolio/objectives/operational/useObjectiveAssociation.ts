"use client";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import {
  assertClientWriter,
  currentClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import {
  operationalReadInput,
  operationalReadRequest,
  requireOperationalRead,
  type OperationalCycle,
  type OperationalProvenance,
} from "@/shared/capiro/operations/objective-operational";
import { scopedObjectivesSchema, type Objective } from "../contracts";
import {
  captureAssociation,
  requireUnchangedAssociationSource,
  type AssociationKind,
  type RetainedAssociation,
} from "./association-command";
import { readAssociationSource } from "./association-sources";
import {
  createAssociationRecovery,
  dispatchAssociation,
  finishAssociationReview,
  reconcileAssociation,
} from "./association-recovery";

type AssociationSession = {
  key: string;
  signal: AbortSignal;
  guard: () => void;
  recovery: ReturnType<typeof createAssociationRecovery>;
  busy: boolean;
};
type AssociationState = {
  key: string;
  ready: boolean;
  busy: boolean;
  pending: RetainedAssociation | null;
  review?: RetainedAssociation;
  error?: Error;
};
type AssociationContext = {
  api: ReturnType<typeof useApi>;
  operations: ReturnType<typeof useCapiro>;
  objective: Objective;
};
type Choice =
  | {
      action: "link";
      kind: AssociationKind;
      id: string;
      cycles: OperationalCycle[];
    }
  | {
      action: "unlink";
      provenance: Extract<OperationalProvenance, { kind: "manual" }>;
    };
type SetState = Dispatch<SetStateAction<AssociationState>>;
type Action = (
  session: AssociationSession,
) => Promise<Partial<AssociationState>>;

function openAssociationSession(
  cache: QueryClient,
  actor: ClientWriter,
  key: string,
  target: { clientId: string; id: string },
) {
  const controller = new AbortController();
  const guard = () => {
    controller.signal.throwIfAborted();
    assertClientWriter(cache, actor);
  };
  const session: AssociationSession = {
    key,
    signal: controller.signal,
    guard,
    recovery: createAssociationRecovery(actor, target, guard),
    busy: false,
  };
  const unsubscribe = cache.getQueryCache().subscribe((event) => {
    if (event.query.queryKey[0] === "identity") {
      try {
        guard();
      } catch {
        controller.abort();
      }
    }
  });
  return {
    session,
    close: () => {
      controller.abort();
      unsubscribe();
    },
  };
}

function useAssociationLifetime(objective: Objective) {
  const cache = useQueryClient();
  const identity = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe((event) => {
        if (event.query.queryKey[0] === "identity") notify();
      }),
    () => JSON.stringify(currentClientWriter(cache) ?? null),
    () => "null",
  );
  const { clientId, id, version } = objective;
  const key = JSON.stringify([identity, clientId, id, version]);
  const live = useRef<AssociationSession | null>(null);
  useLayoutEffect(() => {
    const actor = currentClientWriter(cache);
    if (!actor) {
      live.current = null;
      return;
    }
    const opened = openAssociationSession(cache, actor, key, { clientId, id });
    live.current = opened.session;
    return opened.close;
  }, [cache, key, clientId, id]);
  const capture = useCallback(() => {
    const value = live.current;
    if (!value || value.key !== key)
      throw new Error("A current signed-in session is required.");
    value.guard();
    return value;
  }, [key]);
  return { key, capture };
}

async function readCurrentAssociation(
  { api, operations, objective }: AssociationContext,
  signal: AbortSignal,
) {
  const objectives = await api.request(
    "core",
    `clients/${encodeURIComponent(objective.clientId)}/objectives`,
    scopedObjectivesSchema(objective.clientId),
    { signal },
  );
  const saved = objectives.find((row) => row.id === objective.id);
  if (!saved) throw new Error("This Objective is no longer available.");
  const request = operationalReadRequest(saved.clientId, saved.id);
  const read = requireOperationalRead(
    await operations.request(
      "objectives.operational.read",
      operationalReadInput(request),
      { signal },
    ),
    request,
    saved,
  );
  return { saved, read };
}

async function recoverActionError(
  session: AssociationSession,
  key: string,
  error: unknown,
  setState: SetState,
) {
  if (session.signal.aborted) return;
  let pending: RetainedAssociation | null = null,
    ready = true;
  try {
    pending = await session.recovery.load();
    session.guard();
  } catch {
    ready = false;
  }
  if (!session.signal.aborted)
    setState((value) => ({
      ...value,
      key,
      busy: false,
      ready,
      pending,
      error:
        error instanceof Error
          ? error
          : new Error("Association action unavailable."),
    }));
}

async function runAssociationAction(
  key: string,
  capture: () => AssociationSession,
  setState: SetState,
  action: Action,
) {
  let session: AssociationSession;
  try {
    session = capture();
  } catch (error) {
    setState({
      key,
      ready: false,
      busy: false,
      pending: null,
      error: error as Error,
    });
    return;
  }
  if (session.busy) return;
  session.busy = true;
  setState((value) => ({ ...value, key, busy: true, error: undefined }));
  try {
    const result = await action(session);
    session.guard();
    setState((value) => ({
      ...value,
      ...result,
      key,
      ready: true,
      busy: false,
    }));
  } catch (error) {
    await recoverActionError(session, key, error, setState);
  } finally {
    session.busy = false;
  }
}

async function reviewAssociationChoice(
  context: AssociationContext,
  { signal, guard, recovery }: AssociationSession,
  choice: Choice,
) {
  const pending = await recovery.load();
  if (pending) return { pending, review: undefined };
  const { saved, read } = await readCurrentAssociation(context, signal);
  if (saved.version !== context.objective.version)
    throw new Error(
      "The Objective changed. Refresh it before reviewing a link.",
    );
  const selected =
    choice.action === "link"
      ? {
          action: "link" as const,
          source: await readAssociationSource(
            context.api,
            choice.kind,
            choice.id,
            saved.clientId,
            signal,
          ),
          cycles: choice.cycles,
        }
      : choice;
  guard();
  return {
    review: await captureAssociation(read, saved, selected),
    pending: null,
  };
}

async function submitAssociationReview(
  context: AssociationContext,
  { signal, guard, recovery }: AssociationSession,
  reviewed?: RetainedAssociation,
) {
  if (!reviewed) throw new Error("Review the link or unlink action first.");
  const pending = await dispatchAssociation(
    recovery,
    context.operations,
    reviewed,
    signal,
    async () => {
      const { saved, read } = await readCurrentAssociation(context, signal);
      if (
        saved.version !== reviewed.command.expectedObjectiveVersion ||
        read.associationSetVersion !==
          reviewed.command.expectedAssociationSetVersion
      )
        throw new Error(
          "The Objective or its links changed. Review the action again.",
        );
      if (reviewed.source)
        requireUnchangedAssociationSource(
          reviewed.source,
          await readAssociationSource(
            context.api,
            reviewed.source.kind,
            reviewed.source.id,
            saved.clientId,
            signal,
          ),
        );
      guard();
    },
  );
  return { pending, review: undefined };
}

export function useObjectiveAssociation(
  objective: Objective,
  onRefresh: () => void,
) {
  const api = useApi(),
    operations = useCapiro(),
    cache = useQueryClient();
  const { key, capture } = useAssociationLifetime(objective);
  const [state, setState] = useState<AssociationState>({
    key: "",
    ready: false,
    busy: false,
    pending: null,
  });
  const visible =
    state.key === key
      ? state
      : { key, ready: false, busy: false, pending: null };
  const context = { api, operations, objective };
  const run = useCallback(
    (action: Action) => runAssociationAction(key, capture, setState, action),
    [key, capture],
  );
  useLayoutEffect(() => {
    void run(async ({ recovery }) => ({
      pending: await recovery.load(),
      review: undefined,
    }));
  }, [run]);
  const acknowledge = () =>
    run(async ({ signal, recovery }) => {
      await finishAssociationReview(recovery, async () => {
        await readCurrentAssociation(context, signal);
      });
      void cache.invalidateQueries({
        queryKey: ["objectives", objective.clientId],
      });
      onRefresh();
      return { pending: null, review: undefined };
    });
  return {
    ...visible,
    reviewAction: (choice: Choice) =>
      run((session) => reviewAssociationChoice(context, session, choice)),
    submit: () =>
      run((session) =>
        submitAssociationReview(context, session, visible.review),
      ),
    acknowledge,
    recover: () =>
      run(async ({ recovery, signal }) => ({
        pending: await reconcileAssociation(recovery, operations, signal),
        review: undefined,
      })),
    discardReview: () => setState((value) => ({ ...value, review: undefined })),
  };
}
