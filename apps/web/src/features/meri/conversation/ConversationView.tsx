"use client";
import { useState, useSyncExternalStore } from "react";
import { MeriComposer } from "../MeriComposer";
import {
  ConnectionPending,
  pendingConversationComposer,
} from "./ConnectionPending";
import { ConversationFrame } from "./ConversationFrame";
import { ConversationHistoryStatus } from "./ConversationHistoryStatus";
import { MeriLiveConversation } from "./MeriLiveConversation";
import {
  createConversationComposer,
  type ConversationComposerChannel,
} from "./conversation-composer";
import type { useConversationSession } from "./useConversationSession";

type Session = ReturnType<typeof useConversationSession>;

/** Only this sibling subscribes: publishing controls never rerenders their run owner. */
export function SessionComposer({
  session,
  scope,
  channel,
}: {
  session: Session;
  scope: string;
  channel: ConversationComposerChannel;
}) {
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
  return (
    <MeriComposer
      draft={session.accessLost ? "" : session.draft}
      onDraft={session.setDraft}
      textareaRef={session.textarea}
      assetSet="cited-answer"
      running={current?.running ?? false}
      live={current?.controls ?? pendingConversationComposer(session, scope)}
    />
  );
}

/** One selected-conversation frame/composer; only the session-bound body is replaced. */
export function ConversationView({
  session,
  scope,
}: {
  session: Session;
  scope: string;
}) {
  const [composer] = useState(createConversationComposer);
  const ready =
    !session.accessLost && !session.latestTarget ? session.ready : undefined;
  return (
    <ConversationFrame
      scope={scope}
      historyStatus={
        session.accessLost ? null : (
          <ConversationHistoryStatus session={session} />
        )
      }
      composer={
        <SessionComposer session={session} scope={scope} channel={composer} />
      }
    >
      {ready ? (
        <MeriLiveConversation
          key={ready.lifetimeKey}
          port={ready.port}
          composer={composer}
          initialPrompt={session.connection.pending}
          earlier={session.earlier}
          scope={scope}
          draft={session.draft}
          onDraft={session.setDraft}
          initialDraft={session.initialDraft}
          storageError={session.storageError}
          textareaRef={session.textarea}
          onNextTurn={session.startNext}
          nextTurnBlocked={session.nextBlocked}
          nextTurnVerified={!!session.source && !session.nextBlocked}
          initialBlocked={session.initialBlocked}
          promptKey={session.logicalKey}
          savedCurrent={session.savedCurrent}
          acceptedRequest={session.acceptedRequest}
          onSettled={session.refresh}
        />
      ) : (
        <ConnectionPending session={session} />
      )}
    </ConversationFrame>
  );
}
