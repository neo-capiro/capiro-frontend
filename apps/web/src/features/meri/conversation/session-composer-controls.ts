"use client";
import {
  useEffect,
  useEffectEvent,
  useState,
  useSyncExternalStore,
} from "react";
import { useRunQuestion } from "./useRunQuestion";
import { useComposerAttachments } from "../uploads/useComposerAttachments";
import {
  CONNECTING_TO_MERI,
  pendingConversationComposer,
} from "./ConnectionPending";
import type { LiveComposer } from "../MeriComposer";
import type { ConversationComposerChannel } from "./conversation-composer";
import type { useConversationSession } from "./useConversationSession";
import { selectionAvailable } from "../model-selection/model-selection";

type Session = ReturnType<typeof useConversationSession>;

/** Why Send waits while an attachment is still being checked. */
export const ATTACHMENT_CHECK_BLOCKED =
  "Checking your attachment… You can remove it to send now.";

/** How long one Enter waits for the conversation session before the reason it is not ready shows instead. */
export const CONNECT_WAIT_MS = 20_000;
/** A handed-over message the run controls did not send, with no reason of their own to show. */
export const CONNECT_NOT_SENT =
  "Your message was not sent. Press Enter to send it now.";

/** The run controls a waiting message is handed to: the same attachment-check wrapper the ordinary Send uses. */
export function withAttachmentCheck(
  controls: LiveComposer,
  attachmentsChecking: boolean,
): LiveComposer {
  return attachmentsChecking && !controls.sendBlocked
    ? { ...controls, sendBlocked: ATTACHMENT_CHECK_BLOCKED }
    : controls;
}

/** What the run controls do with a message that waited for them: their own queue, a send, or a reason. */
export function connectingHandOff(
  live: LiveComposer,
): "queue" | "send" | { reason: string } {
  if (live.onQueue) return "queue";
  if (live.sendBlocked ?? live.draftBlocked)
    return { reason: (live.sendBlocked ?? live.draftBlocked)! };
  return "send";
}

/**
 * Acceptance 2 Nov: after a reload the saved transcript shows before the conversation session is issued, and the
 * first Enter in that window was refused ("Connecting to Meri.") while a second one sent. An Enter while connecting
 * now waits as the one queued message. When the session's run controls mount it is handed to them once (their own
 * queue while the conversation is still being checked, otherwise sent, through the same attachment check as Send);
 * if they cannot take it, or the session does not come within CONNECT_WAIT_MS, or connecting turns into another
 * block, the wait lets go and says why. An emptied box releases it quietly, as the run queue does.
 */
function useConnectingQueue(
  pending: LiveComposer,
  current: { controls: LiveComposer } | null,
  draft: string,
) {
  const [queued, setQueued] = useState(false);
  const [released, setReleased] = useState<{ reason: string; draft: string }>();
  const [handoffs, setHandoffs] = useState(0);
  const connecting = !current && pending.sendBlocked === CONNECTING_TO_MERI;
  // Render-phase transitions, decided once per change.
  if (queued && !draft.trim()) setQueued(false);
  else if (queued && current) {
    setQueued(false);
    const handOff = connectingHandOff(current.controls);
    if (typeof handOff === "object")
      setReleased({ reason: handOff.reason, draft });
    // The send itself runs after this render commits.
    else setHandoffs(handoffs + 1);
  } else if (queued && !connecting) {
    setQueued(false);
    setReleased({ reason: pending.sendBlocked ?? CONNECTING_TO_MERI, draft });
  }
  const handOff = useEffectEvent(() => {
    const live = current?.controls;
    if (!live) return;
    if (live.onQueue) return live.onQueue();
    // The run controls refused it after all: say so instead of ending silently.
    if (live.onSend() === false)
      void Promise.resolve().then(() =>
        setReleased({ reason: live.sendBlocked ?? CONNECT_NOT_SENT, draft }),
      );
  });
  useEffect(() => {
    if (handoffs > 0) handOff();
  }, [handoffs]);
  // The wait is bounded from when it began; typing does not restart it.
  const expire = useEffectEvent(() => {
    setQueued(false);
    setReleased({ reason: CONNECTING_TO_MERI, draft });
  });
  useEffect(() => {
    if (!queued) return;
    const timer = setTimeout(() => expire(), CONNECT_WAIT_MS);
    return () => clearTimeout(timer);
  }, [queued]);
  // A released reason stays until the person changes the text or queues again.
  const notice =
    released && released.draft === draft ? released.reason : undefined;
  return {
    pending: {
      ...pending,
      onQueue:
        connecting && !queued && draft.trim()
          ? () => {
              setReleased(undefined);
              setQueued(true);
            }
          : undefined,
      queued: queued
        ? { onCancel: () => setQueued(false), until: "Meri connects" }
        : undefined,
      ...(notice ? { notice } : {}),
    } satisfies LiveComposer,
    notice,
  };
}

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
  const pending = pendingConversationComposer(session, scope);
  // The attachment slot follows the displayed conversation; a replaced port discards its results.
  const attachments = useComposerAttachments(
    current?.port ?? null,
    (current?.controls ?? pending).attachUnavailable,
  );
  // Send waits only while the service is genuinely still checking an attachment, and only for the
  // controller's bounded wait; after it the person may send without the attachment or remove it. A message
  // that waited for the session is handed to the same wrapped controls.
  const checked = current
    ? {
        ...current,
        controls: withAttachmentCheck(current.controls, attachments.checking),
      }
    : null;
  const connectingQueue = useConnectingQueue(pending, checked, session.draft);
  const live = checked
    ? connectingQueue.notice
      ? { ...checked.controls, notice: connectingQueue.notice }
      : checked.controls
    : connectingQueue.pending;
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
