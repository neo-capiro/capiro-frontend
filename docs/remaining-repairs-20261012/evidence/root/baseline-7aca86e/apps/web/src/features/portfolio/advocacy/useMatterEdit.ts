"use client";
import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { ambiguousClientWrite } from "@/shared/portfolio/auth/client-writer";
import type { MatterDetail } from "./contracts";
import {
  assertMatterEditor,
  scopedAdvocacyKey,
  useAdvocacyRevision,
  watchMatterEditor,
} from "./read-state";
import {
  assertMatterEditSource,
  captureMatterEdit,
  type MatterEditReview,
} from "./matter-edit-scope";
import { prepareMatterUpdate, type MatterDraft } from "./matter-edit";
import {
  prepareMatterEdit,
  readMatterEditResult,
  reloadMatterEdit,
  submitMatterEdit,
} from "./matter-edit-request";
import {
  nextMatterEditAttempt,
  setMatterEditAttempt,
  updateMatterEditAttempt,
  useMatterEditAttempt,
  type MatterEditAttempt,
} from "./matter-edit-attempt";
import { matterKey, mattersKey } from "./queries";

function reviewError(check: () => void) {
  try {
    check();
    return undefined;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "The current review is unavailable.";
  }
}
export function useMatterEdit(
  review: MatterEditReview,
  onSaved: (message: string) => void,
  onReviewed: (review: MatterEditReview) => void,
) {
  const api = useApi();
  const cache = useAdvocacyRevision(review.clientId);
  const { key, attempt } = useMatterEditAttempt(
    review.clientId,
    review.matter.id,
    review.actor,
  );
  const mounted = useRef(false);
  const request = useRef<{
    controller: AbortController;
    kind: "save" | "check" | "reload";
  } | null>(null);
  const actorError = reviewError(() => assertMatterEditor(cache, review.actor));
  const sourceError = reviewError(() => assertMatterEditSource(cache, review));
  useEffect(() => {
    mounted.current = true;
    const stopWatching = watchMatterEditor(cache, review.actor, () =>
      request.current?.controller.abort(),
    );
    return () => {
      stopWatching();
      mounted.current = false;
      request.current?.controller.abort();
    };
  }, [cache, review]);
  useEffect(() => {
    if (actorError || (sourceError && request.current?.kind === "save"))
      request.current?.controller.abort();
  }, [actorError, sourceError]);
  function begin(kind: "save" | "check" | "reload") {
    if (!mounted.current || request.current)
      throw new ApiError(409, "Another matter operation is still in progress.");
    const controller = new AbortController();
    request.current = { controller, kind };
    return controller.signal;
  }
  function assertCurrent(signal: AbortSignal, source: boolean) {
    signal.throwIfAborted();
    if (!mounted.current)
      throw new DOMException("The matter review is closed.", "AbortError");
    if (source) assertMatterEditSource(cache, review);
    else assertMatterEditor(cache, review.actor);
  }
  function finish(
    current: MatterDetail,
    signal: AbortSignal,
    message: string,
    source: boolean,
  ) {
    assertCurrent(signal, source);
    cache.setQueryData(
      scopedAdvocacyKey(
        matterKey(review.clientId, review.matter.id),
        review.actor,
      ),
      current,
    );
    setMatterEditAttempt(cache, key, null);
    void cache.invalidateQueries({ queryKey: ["advocacy", review.clientId] });
    onSaved(message);
  }
  const save = useMutation({
    retry: false,
    mutationFn: async (draft: MatterDraft) => {
      if (cache.getQueryData<MatterEditAttempt | null>(key))
        throw new ApiError(
          409,
          "Check the submitted result before another save.",
        );
      const signal = begin("save");
      let token: number | undefined;
      let refused = false;
      try {
        assertCurrent(signal, true);
        const input = prepareMatterUpdate(review.matter, draft);
        await prepareMatterEdit(api, review, signal, () =>
          assertCurrent(signal, true),
        );
        assertCurrent(signal, true);
        token = nextMatterEditAttempt();
        setMatterEditAttempt(cache, key, {
          token,
          input,
          acknowledged: false,
          status: "pending",
        });
        try {
          await submitMatterEdit(
            api,
            review.clientId,
            review.matter.id,
            input,
            signal,
          );
        } catch (error) {
          refused = !ambiguousClientWrite(error);
          throw error;
        }
        assertCurrent(signal, true);
        updateMatterEditAttempt(cache, key, token, { acknowledged: true });
        const current = await readMatterEditResult(
          api,
          review.clientId,
          review.matter.id,
          input,
          signal,
        );
        finish(
          current,
          signal,
          "Advocacy matter saved and confirmed by current details.",
          true,
        );
      } catch (error) {
        if (token !== undefined) {
          let current = true;
          try {
            assertCurrent(signal, true);
          } catch {
            current = false;
          }
          if (refused && current) setMatterEditAttempt(cache, key, null);
          else
            updateMatterEditAttempt(cache, key, token, { status: "unknown" });
        }
        throw error;
      } finally {
        request.current = null;
      }
    },
  });
  const check = useMutation({
    retry: false,
    mutationFn: async () => {
      const submitted = cache.getQueryData<MatterEditAttempt | null>(key);
      if (!submitted)
        throw new ApiError(
          409,
          "There is no submitted matter result to check.",
        );
      const signal = begin("check");
      try {
        assertCurrent(signal, false);
        const current = await readMatterEditResult(
          api,
          review.clientId,
          review.matter.id,
          submitted.input,
          signal,
        );
        finish(
          current,
          signal,
          submitted.acknowledged
            ? "Advocacy matter saved and confirmed by current details."
            : "Current matter matches your reviewed changes. The original response was not acknowledged.",
          false,
        );
      } finally {
        request.current = null;
      }
    },
  });
  const reload = useMutation({
    retry: false,
    mutationFn: async () => {
      if (cache.getQueryData<MatterEditAttempt | null>(key))
        throw new ApiError(
          409,
          "Check the submitted result before reviewing another save.",
        );
      const signal = begin("reload");
      try {
        const current = await reloadMatterEdit(api, review, signal, () =>
          assertCurrent(signal, false),
        );
        assertCurrent(signal, false);
        cache.setQueryData(
          scopedAdvocacyKey(mattersKey(review.clientId), review.actor),
          current.matters,
        );
        cache.setQueryData(
          scopedAdvocacyKey(
            matterKey(review.clientId, review.matter.id),
            review.actor,
          ),
          current.matter,
        );
        const next = captureMatterEdit(cache, review.clientId, current.matter);
        save.reset();
        check.reset();
        onReviewed(next);
      } finally {
        request.current = null;
      }
    },
  });
  return {
    save,
    check,
    reload,
    attempt,
    actorError,
    sourceError,
    reviewConflict:
      !attempt &&
      save.error instanceof ApiError &&
      [404, 409].includes(save.error.status),
    pending: save.isPending || check.isPending || reload.isPending,
  };
}
