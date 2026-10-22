"use client";
import { useLayoutEffect } from "react";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import type { LiveComposer } from "../MeriComposer";

type ComposerView = Readonly<{
  port: MeriConversationPort;
  running: boolean;
  controls: LiveComposer;
}>;

/** One mounted conversation's presentation bridge; it grants no service authority. */
export function createConversationComposer() {
  let current: ComposerView | null = null;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  return {
    read: () => current,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish: (view: ComposerView) => {
      current = view;
      notify();
      return () => {
        // A late cleanup cannot remove a newer publication, even for the same port.
        if (current !== view) return;
        current = null;
        notify();
      };
    },
  };
}
export type ConversationComposerChannel = ReturnType<
  typeof createConversationComposer
>;

/** Publish committed run controls before paint; aborting a render publishes nothing. */
export function useLiveComposer(
  channel: ConversationComposerChannel,
  view: ComposerView,
) {
  useLayoutEffect(() => channel.publish(view), [channel, view]);
}
