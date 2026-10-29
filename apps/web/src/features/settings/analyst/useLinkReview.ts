"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { CapiroApiError } from "../../../shared/capiro/http";
import {
  assertLinkReviewReceipt,
  linkReviewAttempt,
  type LinkReviewAttempt,
  type LinkReviewKind,
  type LinkReviewReceipt,
} from "../../../shared/capiro/operations/settings-admin/analyst-links";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  retireAnalystLinkReviewRefusal,
  withRecoveryCommandLock,
} from "../../../shared/session/recovery/journal";
import { useRetainedIntent } from "../../../shared/session/recovery/useRetainedIntent";

const contract = {
  schema: linkReviewAttempt,
  requestId: (value: LinkReviewAttempt) => value.command.requestId,
};
export function useLinkReview(
  kind: LinkReviewKind,
  actor: { tenantId: string; userId: string },
  refresh: () => void,
) {
  const api = useCapiro();
  const scope = JSON.stringify([
    "analyst-link-review-v1",
    kind,
    actor.tenantId,
    actor.userId,
  ]);
  const retained = useRetainedIntent(scope, contract, async (signal, guard) => {
    const me = await api.request("me.read", {}, { signal });
    guard();
    if (
      me.role !== "capiro_admin" ||
      me.tenant.id !== actor.tenantId ||
      me.user.id !== actor.userId
    )
      throw new CapiroApiError(403, "Current HQ reviewer access is required.");
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [receipt, setReceipt] = useState<LinkReviewReceipt>();
  const submit = async (requested?: LinkReviewAttempt) => {
    if (busy || !retained.ready) return;
    setBusy(true);
    setError(undefined);
    setReceipt(undefined);
    try {
      await withRecoveryCommandLock(scope, retained.guard, async () => {
        await retained.verify();
        let saved = await readRecovery(scope, contract, retained.guard);
        if (saved) {
          retained.install(saved);
          if (requested && JSON.stringify(saved) !== JSON.stringify(requested))
            throw Error(
              "Recover the original decision before reviewing another candidate.",
            );
        } else if (requested) {
          saved = await reserveRecovery(
            scope,
            requested.command.requestId,
            requested,
            contract,
            retained.guard,
          );
          retained.install(saved);
        } else {
          retained.install(null);
          refresh();
          return;
        }
        if (saved.kind !== kind)
          throw Error("Saved review belongs to another queue.");
        const result = await api.request(
          "settings.analyst.links.decide",
          {
            params: { kind: saved.kind, id: saved.candidateId },
            body: saved.command,
          },
          { signal: retained.signal() },
        );
        retained.guard();
        assertLinkReviewReceipt(saved, result.receipt, actor.userId);
        if (result.receipt.status === "refused")
          await retireAnalystLinkReviewRefusal(
            scope,
            saved.command.requestId,
            result.receipt,
            retained.guard,
          );
        else
          await acknowledgeRecovery(
            scope,
            saved.command.requestId,
            retained.guard,
          );
        retained.install(null);
        setReceipt(result.receipt);
        refresh();
      });
    } catch (cause) {
      try {
        retained.guard();
        if (
          cause instanceof CapiroApiError &&
          [401, 403].includes(cause.status)
        )
          retained.block(cause);
        setError(
          cause instanceof Error
            ? cause.message
            : "Review outcome is unknown. Recover the original decision.",
        );
      } catch {
        /* replaced identity or unmounted screen */
      }
    } finally {
      setBusy(false);
    }
  };
  return {
    submit,
    busy,
    error: error ?? retained.error,
    receipt,
    pending: retained.record,
    ready: retained.ready && !retained.record && !busy,
    retry: retained.retry,
  };
}
