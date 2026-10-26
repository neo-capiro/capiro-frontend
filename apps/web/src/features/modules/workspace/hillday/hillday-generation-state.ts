"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { CapiroApiError } from "@/shared/capiro/http";
import { useCapiroQuery } from "@/shared/capiro/queries";
import { workspaceId } from "@/shared/capiro/operations/workspace-schemas";
import type { HillDayJobStatus } from "@/shared/capiro/operations/workspace-hillday";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import {
  acknowledgeRecovery,
  readRecovery,
  readRecoveryDisposition,
  reserveRecovery,
  updateRecovery,
  withRecoveryCommandLock,
  RecoveryStorageError,
  type RecoveryContract,
} from "@/shared/session/recovery/journal";

export type HillDayGenerationScope = {
  tenantId: string;
  userId: string;
  actorId: string;
  documentId: string;
  clientId: string;
};
const startIntent = z
  .object({
    requestId: workspaceId,
    documentId: workspaceId,
    clientId: workspaceId,
    jobId: workspaceId.optional(),
  })
  .strict();
type StartIntent = z.infer<typeof startIntent>;
class HillDayScopeError extends Error {}
export const hillDayStartContract: RecoveryContract<StartIntent> = {
  schema: startIntent,
  requestId: (value) => value.requestId,
  validateUpdate(previous, next) {
    if (
      previous.requestId !== next.requestId ||
      previous.documentId !== next.documentId ||
      previous.clientId !== next.clientId ||
      (previous.jobId && previous.jobId !== next.jobId)
    )
      throw new RecoveryStorageError();
  },
};
export function hillDayStartScope(scope: HillDayGenerationScope) {
  return JSON.stringify([
    "hillday-generation",
    scope.tenantId,
    scope.userId,
    scope.actorId,
    scope.documentId,
    scope.clientId,
  ]);
}
export function bindHillDayJob(
  job: HillDayJobStatus,
  documentId: string,
  jobId = job.jobId,
) {
  if (job.documentId !== documentId || job.jobId !== jobId)
    throw new Error(
      "Generation progress does not match this document and job.",
    );
  return job;
}

/** The existing journal owns storage/locking and the existing query owns polling.
 * This local glue binds a start acknowledgement to the authorized document/job. */
export function useHillDayGeneration(scope: HillDayGenerationScope) {
  const api = useCapiro();
  const key = hillDayStartScope(scope);
  const journal = useRetainedIntent(
    key,
    hillDayStartContract,
    async (signal, guard) => {
      const me = await api.request("me.read", {}, { signal });
      guard();
      if (
        me.tenant.id !== scope.tenantId ||
        me.user.id !== scope.userId ||
        me.user.clerkUserId !== scope.actorId
      )
        throw new HillDayScopeError(
          "The current account changed. Reopen this document.",
        );
      const document = await api.request(
        "workspace.hillday.document",
        { params: { id: scope.documentId } },
        { signal },
      );
      guard();
      if (
        document.id !== scope.documentId ||
        document.client.id !== scope.clientId
      )
        throw new HillDayScopeError(
          "The document or its client changed. Reopen it from Workspace.",
        );
    },
  );
  const [attachedId, setAttachedId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [controlUncertain, setControlUncertain] = useState(false);
  const working = useRef(false);
  const known = useRef<StartIntent | null>(null);
  const latest = useCapiroQuery(
    "workspace.hillday.generation",
    { params: { id: scope.documentId } },
    { enabled: journal.ready && !attachedId && !journal.record?.jobId },
  );
  const jobId =
    attachedId || journal.record?.jobId || latest.data?.job?.jobId || "";
  const progress = useCapiroQuery(
    "workspace.hillday.job",
    { params: { id: scope.documentId, jobId } },
    { enabled: journal.ready && Boolean(jobId) },
  );
  const candidate = progress.error
    ? undefined
    : (progress.data ?? latest.data?.job);
  const mismatch =
    candidate &&
    (candidate.documentId !== scope.documentId || candidate.jobId !== jobId);
  const job = mismatch ? undefined : candidate;
  const active = job?.status === "queued" || job?.status === "running";
  useEffect(() => {
    if (!active || !journal.ready) return;
    const timer = setTimeout(progress.reload, 2500);
    return () => clearTimeout(timer);
  }, [active, journal.ready, progress.data, progress.reload]);
  function install(record: StartIntent | null) {
    journal.install(record);
    known.current = record;
  }
  async function retained() {
    const value = await readRecovery(key, hillDayStartContract, journal.guard);
    const expected = known.current ?? journal.record;
    if (expected && (!value || value.requestId !== expected.requestId)) {
      const disposition = await readRecoveryDisposition(
        key,
        expected.requestId,
        journal.guard,
      );
      if (
        value ||
        disposition?.requestId !== expected.requestId ||
        disposition.state !== "acknowledged"
      )
        throw new RecoveryStorageError();
    }
    if (
      value &&
      (value.documentId !== scope.documentId ||
        value.clientId !== scope.clientId)
    )
      throw new RecoveryStorageError();
    install(value);
    return value;
  }
  async function action(run: () => Promise<void>) {
    if (working.current || !journal.ready) return;
    known.current ??= journal.record;
    working.current = true;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await withRecoveryCommandLock(key, journal.guard, async () => {
        await journal.verify();
        await run();
        journal.guard();
      });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      try {
        journal.guard();
      } catch {
        return;
      }
      if (
        cause instanceof HillDayScopeError ||
        cause instanceof RecoveryStorageError ||
        (cause instanceof CapiroApiError &&
          [401, 403, 404].includes(cause.status))
      )
        journal.block(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Generation command is unconfirmed.",
      );
    } finally {
      working.current = false;
      try {
        journal.guard();
        setPending(false);
      } catch {
        /* disposed */
      }
    }
  }
  async function dispatch(original: StartIntent) {
    let acknowledged = original;
    if (!acknowledged.jobId) {
      const response = await api.request(
        "workspace.hillday.generate",
        {
          params: { id: original.documentId },
          body: { requestId: original.requestId },
        },
        { signal: journal.signal() },
      );
      journal.guard();
      acknowledged = { ...original, jobId: response.jobId };
      await updateRecovery(
        key,
        original.requestId,
        acknowledged,
        hillDayStartContract,
        journal.guard,
      );
      install(acknowledged);
    }
    const current = bindHillDayJob(
      await api.request(
        "workspace.hillday.job",
        { params: { id: scope.documentId, jobId: acknowledged.jobId! } },
        { signal: journal.signal() },
      ),
      scope.documentId,
      acknowledged.jobId,
    );
    journal.guard();
    await acknowledgeRecovery(key, original.requestId, journal.guard);
    install(null);
    setAttachedId(current.jobId);
    progress.reload();
    setMessage("Generation request acknowledged. Following its saved job.");
  }
  async function generate() {
    await action(async () => {
      if (await retained()) {
        setMessage("A retained start needs explicit recovery.");
        return;
      }
      const current = await api.request(
        "workspace.hillday.generation",
        { params: { id: scope.documentId } },
        { signal: journal.signal() },
      );
      journal.guard();
      if (current.job) {
        setAttachedId(bindHillDayJob(current.job, scope.documentId).jobId);
        return;
      }
      const original = {
        requestId: crypto.randomUUID(),
        documentId: scope.documentId,
        clientId: scope.clientId,
      };
      const record = await reserveRecovery(
        key,
        original.requestId,
        original,
        hillDayStartContract,
        journal.guard,
      );
      install(record);
      if (record.requestId !== original.requestId) {
        setMessage("A retained start needs explicit recovery.");
        return;
      }
      await dispatch(record);
    });
  }
  async function replay() {
    await action(async () => {
      const original = await retained();
      if (!original) {
        latest.reload();
        return;
      }
      await dispatch(original);
    });
  }
  async function control(kind: "retry" | "cancel") {
    await action(async () => {
      if (await retained())
        throw new Error("Recover the retained start before changing its job.");
      if (!jobId || controlUncertain) return;
      try {
        const response = await api.request(
          kind === "retry"
            ? "workspace.hillday.retry"
            : "workspace.hillday.cancel",
          { params: { id: scope.documentId, jobId } },
          { signal: journal.signal() },
        );
        journal.guard();
        const current = bindHillDayJob(response, scope.documentId, jobId);
        setAttachedId(current.jobId);
        progress.reload();
        setMessage(
          kind === "retry"
            ? "Retry acknowledged for this job. Completed units are preserved."
            : current.status === "cancelled"
              ? "Workspace reports this job cancelled."
              : current.cancelRequestedAt
                ? "Cancellation requested. Work already in flight may finish; waiting for Workspace."
                : "Current job read. No cancellation is confirmed.",
        );
      } catch (cause) {
        journal.guard();
        setControlUncertain(true);
        progress.reload();
        throw cause;
      }
    });
  }
  async function refresh() {
    await action(async () => {
      await retained();
      if (jobId)
        bindHillDayJob(
          await api.request(
            "workspace.hillday.job",
            { params: { id: scope.documentId, jobId } },
            { signal: journal.signal() },
          ),
          scope.documentId,
          jobId,
        );
      journal.guard();
      setControlUncertain(false);
      progress.reload();
      latest.reload();
      setMessage(
        "Current progress read. Review it before choosing another action; this read does not acknowledge a retained start.",
      );
    });
  }
  return {
    journal,
    job,
    active,
    pending,
    error:
      error ||
      (mismatch
        ? "Generation progress does not match this document and job."
        : (progress.error?.message ?? latest.error?.message ?? "")),
    message,
    controlUncertain,
    loading: latest.loading || (Boolean(jobId) && progress.loading),
    noJob:
      !latest.error && !latest.loading && latest.data?.job === null && !jobId,
    generate,
    replay,
    control,
    refresh,
  };
}
