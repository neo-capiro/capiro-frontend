"use client";
import { useRef, useState } from "react";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { CapiroApiError } from "@/shared/capiro/http";
import { publicationConflictCodes } from "@/shared/capiro/workspace-ordinary-save-errors";
import type { SavedVersion } from "@/shared/capiro/operations/workspace-documents";
import type {
  ProspectPublicationBody,
  ProspectPublicationState,
} from "@/shared/capiro/operations/workspace-prospect-publication";
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
import {
  bindPublication,
  bindPublicationState,
  publicationSourceEligible,
  publicationRecoveryContract,
} from "./publication";

export function useProspectPublication(
  scope: ProspectDraftScope,
  actor: ProspectWriter,
) {
  const api = useCapiro();
  const key = prospectIntentScope(
    "prospect-publication",
    actor,
    scope.prospectId,
    scope.id,
  );
  const [state, setState] = useState<ProspectPublicationState>();
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const working = useRef(false);
  const journal = useRetainedIntent(
    key,
    publicationRecoveryContract,
    async (signal, guard) => {
      setState(undefined);
      await verifyProspectWriter(api, actor, signal, guard);
      const current = bindPublicationState(
        await api.request(
          "workspace.prospect.publication",
          {
            params: { draftId: scope.id },
            query: { prospectId: scope.prospectId },
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
      setState(undefined);
      if (
        cause instanceof RecoveryStorageError ||
        (cause instanceof CapiroApiError &&
          [401, 403, 404].includes(cause.status))
      )
        journal.block(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Publication was not confirmed. Recover the original request.",
      );
    } finally {
      working.current = false;
      setPending(false);
    }
  }
  async function submit(body: ProspectPublicationBody) {
    const original = await reserveRecovery(
      key,
      body.requestId,
      body,
      publicationRecoveryContract,
      journal.guard,
    );
    journal.install(original);
    if (original.expectedProspectId !== scope.prospectId)
      throw new RecoveryStorageError();
    if (original.requestId !== body.requestId)
      throw new Error(
        "Another view has an unfinished publication. Recover that request first.",
      );
    await journal.verify();
    try {
      const result = await api.request(
        "workspace.prospect.publish",
        { params: { draftId: scope.id }, body: original },
        { signal: journal.signal() },
      );
      journal.guard();
      await bindPublication(result, scope, actor.ownerId, original);
      journal.guard();
      await journal.verify();
      await acknowledgeRecovery(key, original.requestId, journal.guard);
      journal.install(null);
      setMessage(
        "Published saved revision confirmed. Later edits remain in the working draft.",
      );
    } catch (cause) {
      if (
        cause instanceof CapiroApiError &&
        publicationConflictCodes.some((code) => code === cause.code)
      ) {
        await acknowledgeRecovery(key, original.requestId, journal.guard);
        journal.install(null);
        throw new Error(
          "Publication was refused because the saved revision, document or prior publication changed. Refresh and review the current saved revision before publishing again.",
        );
      }
      throw cause;
    }
  }
  return {
    ready: journal.ready,
    recoveryError: journal.error,
    pending,
    error,
    message,
    state: journal.ready && !pending && !error ? state : undefined,
    retained: journal.record,
    retry: journal.retry,
    refresh: () => attempt(() => journal.verify()),
    recover: () =>
      attempt(async () => {
        if (journal.record) await submit(journal.record);
      }),
    publish: (version: SavedVersion) =>
      attempt(async () => {
        if (
          !state ||
          journal.record ||
          version.draftId !== scope.id ||
          !publicationSourceEligible(version, state.stateHash)
        )
          throw new Error(
            "Select and review the current saved draft before publishing.",
          );
        const sourceSnapshotHash = await workspaceSnapshotHash(
          version.snapshot,
        );
        journal.guard();
        await submit({
          requestId: crypto.randomUUID(),
          expectedProspectId: scope.prospectId,
          sourceVersionId: version.id,
          sourceSnapshotHash,
          expectedStateHash: state.stateHash,
          expectedPublicationId: state.current?.versionId ?? null,
        });
      }),
  };
}
