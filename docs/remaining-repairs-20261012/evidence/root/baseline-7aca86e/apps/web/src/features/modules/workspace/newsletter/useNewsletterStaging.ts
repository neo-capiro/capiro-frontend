"use client";
import { useRef, useState } from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { CapiroApiError } from "../../../../shared/capiro/http";
import type { NewsletterStagingReceipt } from "../../../../shared/capiro/operations/workspace-newsletter-staging";
import { useRetainedIntent } from "../../../../shared/session/recovery/useRetainedIntent";
import {
  acknowledgeRecovery,
  reserveRecovery,
  RecoveryStorageError,
} from "../../../../shared/session/recovery/journal";
import {
  readStagingSelection,
  stagingRecovery,
  stagingScope,
  verifyStagingActor,
  verifyStagingReceipt,
  type StagingActor,
  type StagingIntent,
} from "./staging-model";

export function useNewsletterStaging(actor: StagingActor, draftId: string) {
  const api = useCapiro();
  const scope = stagingScope(actor, draftId);
  const retained = useRetainedIntent(scope, stagingRecovery, (signal, guard) =>
    verifyStagingActor(api, actor, draftId, signal, guard),
  );
  const [receipt, setReceipt] = useState<NewsletterStagingReceipt>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  async function stage(
    selection: Omit<StagingIntent["body"], "requestId"> & { sessionId: string },
  ) {
    if (working.current || !retained.ready || receipt) return;
    working.current = true;
    setBusy(true);
    setError("");
    let authorized = false;
    try {
      await retained.verify();
      const original = retained.record ?? {
        sessionId: selection.sessionId,
        body: {
          requestId: crypto.randomUUID(),
          draftId,
          versionId: selection.versionId,
          snapshotHash: selection.snapshotHash,
          expectedStateVersion: selection.expectedStateVersion,
        },
      };
      const current = await readStagingSelection(
        api,
        draftId,
        original.body.versionId,
        original.sessionId,
        retained.signal(),
        retained.guard,
      );
      if (current.revision.snapshotHash !== original.body.snapshotHash)
        throw new Error(
          "The saved revision hash changed. The original request remains held.",
        );
      if (
        !retained.record &&
        (current.session.currentStateVersion !==
          original.body.expectedStateVersion ||
          current.session.session.archivedAt ||
          current.session.session.status !== "active")
      )
        throw new Error(
          "The Outreach session changed or is unavailable. Refresh and review its current version before staging.",
        );
      authorized = true;
      const reserved = await reserveRecovery(
        scope,
        original.body.requestId,
        original,
        stagingRecovery,
        retained.guard,
      );
      retained.install(reserved);
      if (JSON.stringify(reserved) !== JSON.stringify(original))
        throw new Error(
          "Another view retained an original staging request. Review and recover that original request.",
        );
      const result = await api.request(
        "workspace.newsletter.stage",
        { params: { sessionId: original.sessionId }, body: original.body },
        { signal: retained.signal() },
      );
      retained.guard();
      verifyStagingReceipt(result, original, current.revision);
      setReceipt(result);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (
        !authorized ||
        cause instanceof RecoveryStorageError ||
        (cause instanceof CapiroApiError && [401, 403].includes(cause.status))
      )
        retained.block(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Staging is unconfirmed. Recover only the original request.",
      );
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  async function acknowledge() {
    if (working.current || !receipt || !retained.record) return;
    working.current = true;
    setBusy(true);
    try {
      await retained.verify();
      const current = await readStagingSelection(
        api,
        draftId,
        retained.record.body.versionId,
        retained.record.sessionId,
        retained.signal(),
        retained.guard,
      );
      if (current.revision.snapshotHash !== retained.record.body.snapshotHash)
        throw new Error(
          "The original saved revision is unavailable. Its staging receipt remains retained.",
        );
      verifyStagingReceipt(receipt, retained.record, current.revision);
      await acknowledgeRecovery(scope, receipt.batchId, retained.guard);
      retained.install(null);
      setReceipt(undefined);
    } catch (cause) {
      retained.block(cause);
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  return { retained, receipt, error, busy, stage, acknowledge };
}
