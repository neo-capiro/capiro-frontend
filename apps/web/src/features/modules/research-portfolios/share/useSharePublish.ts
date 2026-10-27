"use client";
import { useRef, useState } from "react";
import { useCapiroMutation } from "../../../../shared/capiro/queries";
import { CapiroApiError } from "../../../../shared/capiro/http";
import type { OperationRequest } from "../../../../shared/capiro/contracts";
import type { researchShareOperations } from "../../../../shared/capiro/operations/research-share";
import type { ResearchShareLink } from "../../../../shared/capiro/operations/research-share-schemas";

type Input = OperationRequest<
  (typeof researchShareOperations)["research.shareLinks.publish"]
>;

/** Keeps a possibly dispatched publication fixed until an explicit read resolves it. */
export function useSharePublish(onChanged: () => void) {
  const mutation = useCapiroMutation("research.shareLinks.publish");
  const lookup = useCapiroMutation("research.shareLinks.operation");
  const active = useRef(false);
  const [pending, setPending] = useState<Input>();
  const [busy, setBusy] = useState(false);
  const [retryReady, setRetryReady] = useState(false);
  const [error, setError] = useState<string>();
  const [issued, setIssued] = useState<{
    token: string;
    link: ResearchShareLink;
  }>();
  const [lost, setLost] = useState(false);
  async function publish(input: Input) {
    if (active.current || (pending && !retryReady)) return;
    active.current = true;
    setBusy(true);
    setPending(input);
    setRetryReady(false);
    setError(undefined);
    try {
      const result = await mutation.run(input);
      setPending(undefined);
      if (result.token) setIssued({ token: result.token, link: result.link });
      else setLost(true);
      onChanged();
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError")
        return;
      const knownRefusal =
        caught instanceof CapiroApiError &&
        caught.status >= 400 &&
        caught.status < 500 &&
        caught.status !== 408 &&
        caught.status !== 499;
      if (knownRefusal) setPending(undefined);
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
    if (!pending || active.current) return;
    active.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const result = await lookup.run({
        params: {
          id: pending.params.id,
          operationKey: pending.body.operationKey,
        },
      });
      if (result.link) {
        setPending(undefined);
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
    error,
    issued,
    lost,
    publish,
    reconcile,
    retry: () => (pending && retryReady ? publish(pending) : undefined),
  };
}
