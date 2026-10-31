"use client";
import { useSyncExternalStore } from "react";
import { useRunQuestion } from "./useRunQuestion";
import { useComposerAttachments } from "../uploads/useComposerAttachments";
import { pendingConversationComposer } from "./ConnectionPending";
import type { ConversationComposerChannel } from "./conversation-composer";
import type { useConversationSession } from "./useConversationSession";
import { selectionAvailable } from "../model-selection/model-selection";

type Session = ReturnType<typeof useConversationSession>;

/**
 * The composer's session-bound controls, read once per mounted conversation so the compact composer
 * and the tools panel present the same exact state without duplicating subscriptions.
 */
export function useComposerControls(
  session: Session,
  scope: string,
  channel: ConversationComposerChannel,
) {
  const published = useSyncExternalStore(
    channel.subscribe,
    channel.read,
    channel.read,
  );
  const current =
    !session.accessLost &&
    !session.latestTarget &&
    session.ready?.port === published?.port
      ? published
      : null;
  const modelDocument = session.modelCatalog?.document;
  // The skill picker follows the genuine lock set only: a QuickActions refusal closes Send but must
  // leave an unsent selection editable so the user can clear it or switch to an allowed skill.
  const selectionDisabled =
    !current ||
    current.running ||
    !!current.controls.selectionLocked ||
    !!current.controls.draftBlocked ||
    !!session.continuation.busy;
  const modelDisabled =
    !current ||
    current.running ||
    (!!current.controls.sendBlocked &&
      current.controls.sendBlocked !== session.modelBlocked) ||
    !!current.controls.draftBlocked ||
    !!session.continuation.busy;
  const selection =
    current?.controls.modelSelection ?? session.modelSelection ?? null;
  const live = current?.controls ?? pendingConversationComposer(session, scope);
  // The attachment slot follows the displayed conversation; a replaced port discards its results.
  const attachments = useComposerAttachments(
    current?.port ?? null,
    live.attachUnavailable,
  );
  // A clarifying question is durable run state: it is re-derived from this conversation's own events on every render,
  // survives a refresh, and is answered with one lifecycle control.
  const question = useRunQuestion(current?.port ?? null);
  return {
    current,
    live,
    attachments,
    question,
    modelDocument,
    modelSelection: selection,
    modelAvailable: selectionAvailable(
      modelDocument?.modelCatalog,
      session.modelSelection ?? null,
    ),
    selectionDisabled,
    modelDisabled,
  };
}

export type ComposerControls = ReturnType<typeof useComposerControls>;
