"use client";

// The mounted reads of the WS-22 document-agent panel, and the one place a
// planned action is sent.
//
// Every response is read through the *operation's own* closed receiving schema,
// so a drifted or absent shape is refused and rendered as no data rather than
// coerced into the panel - a mismeasured response must never look like a
// document state.
//
// `useGenerationDispatch` resolves the canonical Capiro client, so it is only
// called by a component that mounts once a document state was actually admitted
// (see `GenerationPanelHost`). That keeps the panel renderable in a tree without
// a signed-in boundary, where neither the reads nor the panel appear.
import { useState } from "react";
import type { z } from "zod";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { workspaceGenerationOperations } from "../../../../shared/capiro/operations/workspace-generation";
import type { ResolvedWorkspaceRole } from "./access";
import {
  authorizeGenerationDispatch,
  classifyGenerationFailure,
  generationRecovery,
  nativeAdmissionOutcome,
  type GenerationPlan,
  type GenerationRequestInput,
} from "./controller";
import {
  isNativeGenerationOperation,
  type WorkspaceGenerationOperationKey,
} from "./owner-map";

const operations = workspaceGenerationOperations;

function read<S extends z.ZodType>(
  schema: S,
  data: unknown,
): z.output<S> | undefined {
  const parsed = schema.safeParse(data);
  return parsed.success ? parsed.data : undefined;
}

export type GenerationReads = ReturnType<typeof useGenerationReads>;

export function useGenerationReads(draftId: string) {
  const state = useCapiroQuery("workspace.generation.state", {
    params: { draftId },
  });
  const proposals = useCapiroQuery("workspace.generation.proposals", {
    params: { draftId },
  });
  const generation = useCapiroQuery("workspace.generation.status", {
    params: { draftId },
  });
  const quality = useCapiroQuery("workspace.generation.quality", {
    params: { draftId },
  });
  const capability = useCapiroQuery(
    "workspace.generation.intake.capability",
    {},
  );
  const agent = read(
    operations["workspace.generation.state"].response,
    state.data,
  );
  const activeRunId = agent?.state.generation.activeRunId;
  const runQuery = useCapiroQuery(
    "workspace.generation.run.status",
    { params: { runId: activeRunId ?? "" } },
    { enabled: Boolean(activeRunId) },
  );
  return {
    agent: agent?.state,
    proposals:
      read(
        operations["workspace.generation.proposals"].response,
        proposals.data,
      )?.proposals ?? [],
    run:
      read(operations["workspace.generation.status"].response, generation.data)
        ?.run ?? undefined,
    quality: read(
      operations["workspace.generation.quality"].response,
      quality.data,
    ),
    capability: read(
      operations["workspace.generation.intake.capability"].response,
      capability.data,
    ),
    runStatus: read(
      operations["workspace.generation.run.status"].response,
      runQuery.data,
    ),
    loading: state.loading,
    error: state.error,
    reload: () => {
      state.reload();
      proposals.reload();
      generation.reload();
      quality.reload();
      if (activeRunId) runQuery.reload();
    },
  };
}

export function useGenerationDispatch(
  role: ResolvedWorkspaceRole,
  onSettled: () => void,
) {
  // One cast, at the single place a plan meets the typed client: the plan was
  // built by that operation's own planner and the decision below has already
  // refused anything this consumer does not declare.
  const server = useCapiro() as unknown as {
    request: (
      operation: WorkspaceGenerationOperationKey,
      input: GenerationRequestInput,
    ) => Promise<unknown>;
  };
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  async function dispatch(plan: GenerationPlan, label: string) {
    const decision = authorizeGenerationDispatch(plan, role);
    if (!decision.allowed) {
      setNotice("");
      setFailure(decision.reason);
      return;
    }
    if (plan.kind !== "request") return;
    setBusy(true);
    setFailure("");
    setNotice("");
    try {
      const result = await server.request(plan.operation, plan.input);
      // A supported generated phase answers with its own admission. The response
      // is read through that operation's own closed schema; anything that does
      // not parse is treated as an unconfirmed admission, never as success.
      if (isNativeGenerationOperation(plan.operation)) {
        const admitted = read(
          operations[plan.operation].response,
          result,
        ) as
          | {
              status: "result" | "proposed" | "approval-required" | "unknown";
              proposal: { proposalId: string } | null;
            }
          | undefined;
        const outcome = nativeAdmissionOutcome(admitted?.status ?? "unknown");
        if (generationRecovery(outcome) === "reconcile") {
          // The owner could not confirm the exact request. Re-read the document
          // and let the caller decide; never re-issue the turn blindly.
          onSettled();
          setFailure(
            "That generation request is unconfirmed. The current document was re-read; review it before acting again.",
          );
          return;
        }
        setNotice(
          admitted?.proposal
            ? `${label}: pending proposal ${admitted.proposal.proposalId}.`
            : `${label} applied.`,
        );
        onSettled();
        return;
      }
      setNotice(`${label} applied.`);
      onSettled();
    } catch (caught) {
      // An unconfirmed result is never retried: the reads are re-issued and the
      // caller must review the current document before another attempt.
      if (
        generationRecovery(classifyGenerationFailure(caught)) === "reconcile"
      ) {
        onSettled();
        setFailure(
          "The result of that action is unconfirmed. The current document was re-read; review it before acting again.",
        );
      } else
        setFailure(
          caught instanceof Error
            ? caught.message
            : "The action was not applied.",
        );
    } finally {
      setBusy(false);
    }
  }
  return { busy, notice, failure, dispatch };
}
