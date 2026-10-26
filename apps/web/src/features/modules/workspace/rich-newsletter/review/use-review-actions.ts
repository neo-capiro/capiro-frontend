"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  NewsletterReceiveResult,
  NewsletterAccountInvitationReceipt,
} from "@capiro/shared/newsletter";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import { CapiroApiError } from "../../../../../shared/capiro/http";

export function isReviewAccessLoss(error: unknown) {
  return (
    error instanceof CapiroApiError && [401, 403, 404].includes(error.status)
  );
}

/** One mounted review writer; its unresolved action outlives individual dialogs. */
export function useReviewActions(onAccessLost: () => void) {
  const comment = useCapiroMutation("workspace.richNewsletter.commentCreate");
  const resolve = useCapiroMutation("workspace.richNewsletter.commentResolve");
  const grant = useCapiroMutation("workspace.richNewsletter.reviewerGrant");
  const remove = useCapiroMutation("workspace.richNewsletter.reviewerRemove");
  const invite = useCapiroMutation("workspace.richNewsletter.invitationCreate");
  const cancel = useCapiroMutation("workspace.richNewsletter.invitationCancel");
  const preference = useCapiroMutation(
    "workspace.richNewsletter.reviewPreference",
  );
  const watchers = useCapiroMutation("workspace.richNewsletter.threadUpdate");
  const dispatch = useCapiroMutation(
    "workspace.richNewsletter.accountInvitationDispatch",
  );
  const alive = useRef(true);
  const generation = useRef(0);
  const running = useRef(false);
  const fence = useRef(false);
  const accountUnknown = useRef<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [unknown, setUnknown] = useState(false);
  const [recovery, setRecovery] = useState<(() => void) | undefined>();
  const clearRecovery = useCallback(() => {
    setRecovery(undefined);
    accountUnknown.current = undefined;
  }, []);
  const revoke = useCallback(() => {
    generation.current += 1;
    clearRecovery();
  }, [clearRecovery]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function perform<T>(
    label: string,
    send: () => Promise<unknown>,
    receive: (value: unknown) => NewsletterReceiveResult<T>,
    apply: (value: T) => void,
    replayable = false,
    recovering = false,
    accountInvitationId?: string,
  ): Promise<boolean> {
    if (!alive.current || running.current || (fence.current && !recovering))
      return false;
    running.current = true;
    const started = generation.current;
    setPending(true);
    setNotice(`${label} in progress…`);
    try {
      const received = receive(await send());
      if (!alive.current || started !== generation.current) return false;
      if (!received.ok) throw new Error("The response could not be verified.");
      apply(received.value);
      fence.current = false;
      accountUnknown.current = undefined;
      setUnknown(false);
      setRecovery(undefined);
      setNotice(`${label} acknowledged.`);
      return true;
    } catch (error) {
      if (!alive.current || started !== generation.current) return false;
      if (isReviewAccessLoss(error)) {
        onAccessLost();
      } else if (
        !recovering &&
        error instanceof CapiroApiError &&
        [400, 409, 422].includes(error.status)
      ) {
        setNotice(error.message);
      } else {
        fence.current = true;
        accountUnknown.current = accountInvitationId;
        setUnknown(true);
        setNotice(
          `${label} outcome unconfirmed. ${accountInvitationId ? "Use Check firm invitation before considering another attempt." : replayable ? "A refresh cannot confirm this action. Use Recover original invitation request to continue with the same details." : "A refresh can show current state, but cannot confirm this action. Do not repeat it."}`,
        );
        if (replayable)
          setRecovery(() => () => {
            void perform(label, send, receive, apply, true, true);
          });
      }
      return false;
    } finally {
      running.current = false;
      if (alive.current) setPending(false);
    }
  }
  return {
    comment,
    resolve,
    grant,
    remove,
    invite,
    cancel,
    preference,
    watchers,
    dispatch,
    perform,
    pending,
    unknown,
    notice,
    recovery,
    clearRecovery,
    revoke,
    blocked: pending || unknown,
    acceptAccountStatus(receipt: NewsletterAccountInvitationReceipt) {
      if (accountUnknown.current?.toLowerCase() !== receipt.id.toLowerCase())
        return;
      accountUnknown.current = undefined;
      fence.current = false;
      setUnknown(false);
      setNotice(
        `Firm invitation status: ${receipt.status.replaceAll("_", " ")}. ${receipt.message} Email delivery is not confirmed.`,
      );
    },
  };
}
export type ReviewActions = ReturnType<typeof useReviewActions>;
