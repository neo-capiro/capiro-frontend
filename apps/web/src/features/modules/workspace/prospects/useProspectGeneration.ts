"use client";
import { useRef, useState } from "react";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { CapiroApiError } from "@/shared/capiro/http";
import type { SavedVersion } from "@/shared/capiro/operations/workspace-documents";
import type {
  ProspectGenerationList,
  ProspectGenerationProposal,
} from "@/shared/capiro/operations/workspace-prospect-generation";
import { workspaceSnapshotHash } from "@/shared/capiro/workspace-snapshot";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import {
  reserveRecovery,
  acknowledgeRecovery,
  RecoveryStorageError,
} from "@/shared/session/recovery/journal";
import {
  verifyProspectWriter,
  prospectIntentScope,
  type ProspectWriter,
} from "./recovery-authority";
import type { ProspectDraftScope } from "./manual-draft";
import { prospectSavedSourceEligible } from "./saved-source";
import {
  generationRecoveryContract,
  bindGenerationList,
  bindGenerationProposal,
  bindGenerationDecision,
  type GenerationIntent,
} from "./generation";

export function useProspectGeneration(
  scope: ProspectDraftScope,
  actor: ProspectWriter,
) {
  const api = useCapiro();
  const key = prospectIntentScope(
    "prospect-generation",
    actor,
    scope.prospectId,
    scope.id,
  );
  const [state, setState] = useState<ProspectGenerationList>();
  const [proposal, setProposal] = useState<ProspectGenerationProposal>();
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const working = useRef(false);
  const query = { prospectId: scope.prospectId };
  const journal = useRetainedIntent(
    key,
    generationRecoveryContract,
    async (signal, guard) => {
      await verifyProspectWriter(api, actor, signal, guard);
      const current = bindGenerationList(
        await api.request(
          "workspace.prospect.generation.list",
          {
            params: { draftId: scope.id },
            query,
          },
          { signal },
        ),
        scope,
      );
      guard();
      setState(current);
    },
  );
  async function attempt(work: () => Promise<void>) {
    if (!journal.ready || working.current) return;
    working.current = true;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (
        cause instanceof RecoveryStorageError ||
        (cause instanceof CapiroApiError &&
          [401, 403, 404].includes(cause.status))
      ) {
        setState(undefined);
        setProposal(undefined);
        journal.block(cause);
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "The request is unconfirmed. Recover the original request.",
      );
    } finally {
      working.current = false;
      setPending(false);
    }
  }
  async function submit(intent: GenerationIntent) {
    const original = await reserveRecovery(
      key,
      intent.body.requestId,
      intent,
      generationRecoveryContract,
      journal.guard,
    );
    journal.install(original);
    if (original.body.requestId !== intent.body.requestId)
      throw new Error(
        "Another view has an unfinished request. Recover it first.",
      );
    await journal.verify();
    try {
      let next: ProspectGenerationProposal;
      if (original.kind === "generate") {
        if (original.body.expectedProspectId !== scope.prospectId)
          throw new RecoveryStorageError();
        const raw = await api.request(
          "workspace.prospect.generation.create",
          { params: { draftId: scope.id }, body: original.body },
          { signal: journal.signal() },
        );
        journal.guard();
        next = await bindGenerationProposal(
          raw,
          scope,
          original.body.requestId,
          original.body,
          actor.ownerId,
        );
      } else {
        const raw = await api.request(
          "workspace.prospect.generation.decide",
          {
            params: { draftId: scope.id, proposalId: original.proposalId },
            query,
            body: original.body,
          },
          { signal: journal.signal() },
        );
        journal.guard();
        const saved =
          original.body.decision === "accept"
            ? await api.request(
                "workspace.draft.savedSnapshot",
                {
                  params: {
                    draftId: scope.id,
                    versionId: original.body.requestId,
                  },
                },
                { signal: journal.signal() },
              )
            : undefined;
        journal.guard();
        next = (
          await bindGenerationDecision(
            raw,
            scope,
            actor.ownerId,
            original,
            saved,
          )
        ).proposal;
      }
      journal.guard();
      await journal.verify();
      await acknowledgeRecovery(key, original.body.requestId, journal.guard);
      journal.install(null);
      setProposal(next);
      setMessage(
        original.kind === "decision"
          ? original.body.decision === "accept"
            ? "Accepted content is saved as a new draft version. Publishing is separate."
            : "Proposal rejected. Document content is unchanged."
          : "Generation request retained. Review its status and proposed content below.",
      );
    } catch (cause) {
      if (
        cause instanceof CapiroApiError &&
        cause.status === 409 &&
        [
          "WORKSPACE_SAVE_STATE_CONFLICT",
          "WORKSPACE_GENERATION_STATE_CONFLICT",
          "WORKSPACE_GENERATION_SOURCE_CONFLICT",
          "WORKSPACE_GENERATION_DECISION_CONFLICT",
          "WORKSPACE_GENERATION_OUTPUT_CONFLICT",
        ].includes(cause.code ?? "")
      ) {
        await acknowledgeRecovery(key, original.body.requestId, journal.guard);
        journal.install(null);
        await journal.verify();
        setProposal(undefined);
        throw new Error(
          "The document or proposal changed. Review the current saved version and proposal before deciding again.",
        );
      }
      throw cause;
    }
  }
  async function observe(
    proposalId: string,
    action: "read" | "reconcile" | "retry",
  ) {
    await journal.verify();
    const params = { draftId: scope.id, proposalId };
    const raw =
      action === "read"
        ? await api.request(
            "workspace.prospect.generation.read",
            { params, query },
            { signal: journal.signal() },
          )
        : action === "reconcile"
          ? await api.request(
              "workspace.prospect.generation.reconcile",
              { params, query },
              { signal: journal.signal() },
            )
          : await api.request(
              "workspace.prospect.generation.retry",
              { params, query },
              { signal: journal.signal() },
            );
    journal.guard();
    const next = await bindGenerationProposal(raw, scope, proposalId);
    journal.guard();
    setProposal(next);
    await journal.verify();
  }
  return {
    ready: journal.ready,
    recoveryError: journal.error,
    retryAccess: journal.retry,
    pending,
    error,
    message,
    retained: journal.record,
    state: journal.ready ? state : undefined,
    proposal: journal.ready ? proposal : undefined,
    refresh: () => attempt(() => journal.verify()),
    recover: () =>
      attempt(async () => {
        if (journal.record) await submit(journal.record);
      }),
    observe: (id: string, action: "read" | "reconcile" | "retry" = "read") =>
      attempt(() => observe(id, action)),
    generate: (
      version: SavedVersion,
      selectedSections: string[],
      writingBrief: string,
    ) =>
      attempt(async () => {
        if (
          !state?.available ||
          journal.record ||
          version.draftId !== scope.id ||
          !prospectSavedSourceEligible(version, state.stateHash)
        )
          throw new Error(
            "Save your current document and select that saved version first.",
          );
        const sourceSnapshotHash = await workspaceSnapshotHash(
          version.snapshot,
        );
        journal.guard();
        await submit({
          kind: "generate",
          body: {
            requestId: crypto.randomUUID(),
            expectedProspectId: scope.prospectId,
            expectedStateHash: state.stateHash,
            sourceVersionId: version.id,
            sourceSnapshotHash,
            selectedSections,
            writingBrief,
            paidGeneration: true,
          },
        });
      }),
    decide: (choice: "accept" | "reject") =>
      attempt(async () => {
        if (
          !proposal ||
          journal.record ||
          !proposal.outputHash ||
          proposal.phase !== "ready" ||
          proposal.status !== "pending"
        )
          throw new Error(
            "Read and review the complete proposal before deciding.",
          );
        await submit({
          kind: "decision",
          proposalId: proposal.proposalId,
          body: {
            requestId: crypto.randomUUID(),
            decision: choice,
            expectedStateHash: proposal.baseStateHash,
            outputHash: proposal.outputHash,
          },
        });
      }),
  };
}
