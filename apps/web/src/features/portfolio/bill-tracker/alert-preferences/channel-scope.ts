"use client";
import { useLayoutEffect, useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { assertPreferenceActor, type PreferenceActor } from "./personal-access";
import {
  assertPreferenceReview,
  capturePreferenceReview,
  type PreferenceReview,
} from "./personal-queries";
import type { PersonalPreferences } from "./personal-contracts";

export type ChannelView = {
  owner: PreferenceActor;
  clientId: string;
  baseline: PersonalPreferences;
  available: boolean;
  draftKey: string;
};
export type ChannelOperation = {
  controller: AbortController;
  review: PreferenceReview;
  draftKey: string;
  dispatched: boolean;
  finished: boolean;
  interrupt: () => void;
};
export function assertChannelOperation(
  cache: QueryClient,
  view: ChannelView,
  operation: ChannelOperation,
) {
  operation.controller.signal.throwIfAborted();
  if (
    !view.available ||
    operation.finished ||
    view.draftKey !== operation.draftKey
  )
    throw new DOMException(
      "The current saved alert settings changed.",
      "AbortError",
    );
  assertPreferenceReview(cache, view.clientId, view.owner, operation.review);
}

/** Only the alert-channel view/preflight lifetime; no provider dispatch or retry. */
export function useChannelScope(view: ChannelView) {
  const cache = useQueryClient();
  const current = useRef(view);
  const active = useRef<ChannelOperation | null>(null);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    const unsubscribe = cache.getQueryCache().subscribe((event) => {
      const operation = active.current;
      if (!operation || operation.finished) return;
      const root = event.query.queryKey[0];
      if (
        root !== "identity" &&
        root !== "client-profile" &&
        root !== "portfolio" &&
        root !== "bill-alert-preferences"
      )
        return;
      try {
        assertChannelOperation(cache, current.current, operation);
      } catch {
        operation.interrupt();
      }
    });
    return () => {
      mounted.current = false;
      active.current?.interrupt();
      active.current = null;
      unsubscribe();
    };
  }, [cache, view.owner, view.clientId]);
  useLayoutEffect(() => {
    current.current = view;
    const operation = active.current;
    if (operation && (!view.available || view.draftKey !== operation.draftKey))
      operation.interrupt();
  }, [view]);

  function begin(onInterrupted: (dispatched: boolean) => void) {
    if (!mounted.current || active.current || !current.current.available)
      throw new Error(
        "Reload current saved settings before this channel action.",
      );
    const captured = current.current;
    const review = capturePreferenceReview(
      cache,
      captured.clientId,
      captured.owner,
      captured.baseline,
    );
    const operation: ChannelOperation = {
      controller: new AbortController(),
      review,
      draftKey: captured.draftKey,
      dispatched: false,
      finished: false,
      interrupt: () => {
        if (operation.finished) return;
        operation.finished = true;
        operation.controller.abort();
        if (active.current === operation) active.current = null;
        onInterrupted(operation.dispatched);
      },
    };
    active.current = operation;
    return operation;
  }
  function assert(operation: ChannelOperation) {
    if (!mounted.current || active.current !== operation)
      throw new DOMException("The alert action view changed.", "AbortError");
    assertChannelOperation(cache, current.current, operation);
    assertPreferenceActor(cache, current.current.owner);
  }
  function finish(operation: ChannelOperation) {
    assert(operation);
    operation.finished = true;
    active.current = null;
  }
  function release(operation: ChannelOperation) {
    operation.finished = true;
    if (active.current === operation) active.current = null;
  }
  return { begin, assert, finish, release };
}
