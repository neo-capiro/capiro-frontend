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

/**
 * Acceptance 2 Nov: after a reload the saved transcript shows before the conversation session is issued, and the
 * first Enter in that window was refused ("Connecting to Meri.") while a second one sent. An Enter while connecting
 * now waits as the one queued message: when the session's run controls mount it is handed to them (their own queue
 * while the conversation is still being checked, otherwise sent), and if the session does not come within
 * CONNECT_WAIT_MS, or connecting turns into another block, the queue lets go and says why.
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
  // Render-phase transitions: the run controls arrived (hand the message over once, after this render
  // commits), or connecting became another block such as unreachable, access or storage (let go, say it).
  if (queued && current) {
    setQueued(false);
    const live = current.controls;
    if (live.onQueue || (!live.sendBlocked && !live.draftBlocked))
      setHandoffs(handoffs + 1);
    else setReleased({ reason: live.sendBlocked ?? live.draftBlocked!, draft });
  } else if (queued && !connecting) {
    setQueued(false);
    setReleased({ reason: pending.sendBlocked ?? CONNECTING_TO_MERI, draft });
  }
  const handOff = useEffectEvent(() => {
    const live = current?.controls;
    if (live?.onQueue) live.onQueue();
    else if (live && !live.sendBlocked && !live.draftBlocked) live.onSend();
  });
  useEffect(() => {
    if (handoffs > 0) handOff();
  }, [handoffs]);
  useEffect(() => {
    if (!queued) return;
    const timer = setTimeout(() => {
      setQueued(false);
      setReleased({ reason: CONNECTING_TO_MERI, draft });
    }, CONNECT_WAIT_MS);
    return () => clearTimeout(timer);
  }, [queued, draft]);
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
  const connectingQueue = useConnectingQueue(
    pendingConversationComposer(session, scope),
    current,
    session.draft,
  );
  const controls = current
    ? connectingQueue.notice
      ? { ...current.controls, notice: connectingQueue.notice }
      : current.controls
    : connectingQueue.pending;
  // The attachment slot follows the displayed conversation; a replaced port discards its results.
  const attachments = useComposerAttachments(
    current?.port ?? null,
    controls.attachUnavailable,
  );
  // Send waits only while the service is genuinely still checking an attachment, and only for the
  // controller's bounded wait; after it the person may send without the attachment or remove it.
  const live =
    attachments.checking && !controls.sendBlocked
      ? { ...controls, sendBlocked: ATTACHMENT_CHECK_BLOCKED }
      : controls;
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
