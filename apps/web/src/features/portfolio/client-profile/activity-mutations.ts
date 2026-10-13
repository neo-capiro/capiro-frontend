"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { ApiError } from "@/shared/portfolio/api/http";
import type { Activity } from "./contracts";
import { profileKey } from "./queries";
import { assertClientWriter, ambiguousClientWrite } from "./quick-log/public";
import { useProfileActor } from "./profile-access";
import { observeActivityCompletion } from "./activity-completion";
import {
  assertActivityReviewAttempt,
  beginActivityAttempt,
  currentActivityAttempt,
  settleActivityAttempt,
  useActivityAttempt,
} from "./activity-attempt";
import {
  changeActivity,
  readActivityForChange,
  type ActivityChange,
} from "./activity-change";

type ActivityReview = {
  scope: string;
  controller: AbortController;
  pending: boolean;
  error: Error | null;
  value?: { item: Activity | undefined };
};

export function useChangeActivity(
  clientId: string,
  item: Activity,
  onSaved?: () => void,
) {
  const api = useApi();
  const cache = useQueryClient();
  const identity = useIdentity();
  const actor = useProfileActor();
  const { key, scope, attempt } = useActivityAttempt(clientId, item.id, actor);
  const lifetime = useRef<{
    scope: string;
    controller: AbortController;
  } | null>(null);
  const operation = useRef<AbortController | null>(null);
  const [lifetimeRevision, setLifetimeRevision] = useState(0);
  const [mutationOwner, setMutationOwner] = useState<{
    scope: string;
    controller: AbortController;
  }>();
  const [review, setReview] = useState<ActivityReview>();
  const currentReview =
    review?.scope === scope && !review.controller.signal.aborted
      ? review
      : undefined;
  useLayoutEffect(() => {
    const controller = new AbortController();
    lifetime.current = { scope, controller };
    const unsubscribe = cache.getQueryCache().subscribe((event) => {
      if (event.query.queryKey[0] !== "identity" || !actor) return;
      try {
        assertClientWriter(cache, actor);
      } catch {
        if (controller.signal.aborted) return;
        controller.abort();
        // A batched identity round trip still retires this execution, while a
        // later deliberate operation can capture a fresh current lifetime.
        setLifetimeRevision((value) => value + 1);
      }
    });
    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [cache, scope, actor, lifetimeRevision]);
  const mutation = useMutation({
    retry: false,
    mutationFn: async (change: ActivityChange) => {
      const held = lifetime.current;
      if (
        !actor ||
        !held ||
        held.scope !== scope ||
        operation.current === held.controller ||
        (currentReview?.value && !currentReview.value.item)
      )
        throw new ApiError(
          403,
          "Review this activity with a current session before changing it.",
        );
      const { controller } = held;
      setMutationOwner({ scope, controller });
      let authorityChanged = false;
      const guard = () => {
        controller.signal.throwIfAborted();
        try {
          assertClientWriter(cache, actor);
        } catch (error) {
          authorityChanged = true;
          throw error;
        }
      };
      guard();
      const captured = beginActivityAttempt(cache, key, change);
      const completion = observeActivityCompletion(cache, clientId, actor);
      let sent = false;
      let unknown = false;
      operation.current = controller;
      setReview({
        scope,
        controller,
        pending: false,
        error: null,
        value: currentReview?.value,
      });
      try {
        await changeActivity(
          api,
          clientId,
          actor,
          item,
          captured.change,
          guard,
          controller.signal,
          () => {
            sent = true;
            setReview({ scope, controller, pending: false, error: null });
          },
        );
        guard();
      } catch (error) {
        unknown =
          sent &&
          (authorityChanged ||
            controller.signal.aborted ||
            ambiguousClientWrite(error));
        throw error;
      } finally {
        settleActivityAttempt(cache, key, captured.token, unknown);
        try {
          if (sent) await completion.invalidate();
        } finally {
          completion.dispose();
          if (operation.current === controller) operation.current = null;
        }
      }
      return { controller, actor };
    },
    onSuccess: ({ controller, actor: savedActor }) => {
      if (controller.signal.aborted) return;
      try {
        assertClientWriter(cache, savedActor);
      } catch {
        return;
      }
      onSaved?.();
    },
  });
  const ownsMutation =
    mutationOwner?.scope === scope && !mutationOwner.controller.signal.aborted;
  const error = ownsMutation ? mutation.error : null;
  const reviewLatest = async () => {
    const held = lifetime.current;
    const captured = currentActivityAttempt(cache, key);
    if (
      !actor ||
      !held ||
      held.scope !== scope ||
      operation.current === held.controller ||
      captured?.status === "pending"
    )
      return;
    const { controller } = held;
    const guard = () => {
      controller.signal.throwIfAborted();
      assertClientWriter(cache, actor);
    };
    operation.current = controller;
    setReview({ scope, controller, pending: true, error: null });
    try {
      const rows = await readActivityForChange(
        api,
        clientId,
        guard,
        controller.signal,
      );
      assertActivityReviewAttempt(cache, key, captured?.token);
      cache.setQueryData(profileKey(clientId, "activity"), rows);
      if (captured) settleActivityAttempt(cache, key, captured.token, false);
      setReview({
        scope,
        controller,
        pending: false,
        error: null,
        value: {
          item: rows.find(
            (row) => row.id === item.id && row.origin === "recorded",
          ),
        },
      });
      mutation.reset();
    } catch (error) {
      if (!controller.signal.aborted)
        setReview({
          scope,
          controller,
          pending: false,
          error:
            error instanceof Error
              ? error
              : new Error("The latest activity could not be loaded."),
        });
    } finally {
      if (operation.current === controller) operation.current = null;
    }
  };
  const canOpen =
    Boolean(actor) &&
    !identity.isPending &&
    !identity.isFetching &&
    !identity.isError;
  const uncertain = attempt?.status === "unknown";
  const needsReview =
    uncertain || (error instanceof ApiError && error.status === 409);
  const pending =
    attempt?.status === "pending" || (ownsMutation && mutation.isPending);
  return {
    mutation: { ...mutation, error, isPending: pending },
    uncertain,
    needsReview,
    reviewing: Boolean(currentReview?.pending),
    reviewError: currentReview?.error ?? null,
    reviewed: currentReview?.value,
    reviewLatest,
    canOpen,
    canWrite:
      canOpen &&
      !pending &&
      !needsReview &&
      !(currentReview?.value && !currentReview.value.item),
  };
}
export type ActivityMutationState = ReturnType<typeof useChangeActivity>;
