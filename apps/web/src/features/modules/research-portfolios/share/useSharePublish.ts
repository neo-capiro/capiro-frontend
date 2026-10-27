"use client";
import { useRef, useState } from "react";
import { useCapiroMutation } from "../../../../shared/capiro/queries";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { CapiroApiError } from "../../../../shared/capiro/http";
import type { ResearchShareLink } from "../../../../shared/capiro/operations/research-share-schemas";
import { useRetainedIntent } from "../../../../shared/session/recovery/useRetainedIntent";
import {
  acknowledgeRecovery,
  reserveRecovery,
  RecoveryStorageError,
} from "../../../../shared/session/recovery/journal";
import {
  sharePublishRecovery,
  sharePublishScope,
  type SharePublishActor,
  type SharePublishInput as Input,
} from "./share-publish-recovery";

/** Keeps a possibly dispatched publication fixed until an explicit read resolves it. */
export function useSharePublish(
  actor: SharePublishActor,
  portfolioId: string,
  onChanged: () => void,
) {
  const api = useCapiro();
  const scope = sharePublishScope(actor, portfolioId);
  const retained = useRetainedIntent(
    scope,
    sharePublishRecovery,
    async (signal, guard) => {
      const me = await api.request("me.read", {}, { signal });
      guard();
      if (me.tenant.id !== actor.tenantId || me.user.id !== actor.userId)
        throw new Error(
          "Your sharing session changed. Reopen this portfolio with the current account.",
        );
      const portfolio = await api.request(
        "research.detail",
        { params: { id: portfolioId } },
        { signal },
      );
      guard();
      if (portfolio.id !== portfolioId || portfolio.myRole === "viewer")
        throw new Error(
          "Current portfolio editing access is required to recover this publication.",
        );
    },
  );
  const mutation = useCapiroMutation("research.shareLinks.publish");
  const lookup = useCapiroMutation("research.shareLinks.operation");
  const active = useRef(false);
  const pending = retained.record;
  const [busy, setBusy] = useState(false);
  const [retryReady, setRetryReady] = useState(false);
  const [error, setError] = useState<string>();
  const [issued, setIssued] = useState<{
    token: string;
    link: ResearchShareLink;
  }>();
  const [lost, setLost] = useState(false);
  async function settle(input: Input) {
    await acknowledgeRecovery(scope, input.body.operationKey, retained.guard);
    retained.install(null);
  }
  async function publish(input: Input) {
    if (active.current || !retained.ready || (pending && !retryReady)) return;
    active.current = true;
    setBusy(true);
    setRetryReady(false);
    setError(undefined);
    try {
      await retained.verify();
      const original = await reserveRecovery(
        scope,
        input.body.operationKey,
        input,
        sharePublishRecovery,
        retained.guard,
      );
      retained.install(original);
      if (JSON.stringify(original) !== JSON.stringify(input)) {
        setError(
          "Another view retained a publication. Check that recorded result before continuing.",
        );
        return;
      }
      const result = await mutation.run(input);
      if (result.token) setIssued({ token: result.token, link: result.link });
      else setLost(true);
      await settle(input);
      onChanged();
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError")
        return;
      if (caught instanceof RecoveryStorageError) {
        retained.block(caught);
        return;
      }
      const knownRefusal =
        caught instanceof CapiroApiError &&
        caught.status >= 400 &&
        caught.status < 500 &&
        caught.status !== 408 &&
        caught.status !== 499;
      if (knownRefusal) {
        try {
          await settle(input);
        } catch (failure) {
          retained.block(failure);
        }
      }
      setError(
        knownRefusal
          ? caught.message
          : "The publication result is unknown. Check its recorded result before continuing.",
      );
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  async function reconcile() {
    if (!pending || active.current || !retained.ready) return;
    active.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await retained.verify();
      const result = await lookup.run({
        params: {
          id: pending.params.id,
          operationKey: pending.body.operationKey,
        },
      });
      if (result.link) {
        await settle(pending);
        setLost(true);
        onChanged();
      } else setRetryReady(true);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError")
        return;
      setError(
        "The publication result is still unknown. No new link has been requested. Try checking again.",
      );
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  return {
    pending,
    busy,
    retryReady,
    ready: retained.ready,
    recoveryError: retained.error,
    reloadRecovery: retained.retry,
    error,
    issued,
    lost,
    publish,
    reconcile,
    retry: () => (pending && retryReady ? publish(pending) : undefined),
  };
}
