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
import { ModelSelectionPicker } from "../model-selection/ModelSelectionPicker";
import modelStyles from "../model-selection/model-selection.module.css";
import { SkillSelectionPicker } from "./SkillSelectionPicker";
import { ClientHandoffDraft } from "./ClientHandoffDraft";
import { FeedbackContext } from "./feedback/FeedbackContext";

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
  const modelDocument = session.modelCatalog?.document;
  const modelDisabled =
    !current ||
    current.running ||
    (!!current.controls.sendBlocked &&
      current.controls.sendBlocked !== session.modelBlocked) ||
    !!current.controls.draftBlocked ||
    !!session.continuation.busy;
  const selection =
    current?.controls.modelSelection ?? session.modelSelection ?? null;
  return (
    <MeriComposer
      draft={session.accessLost ? "" : session.draft}
      onDraft={session.setDraft}
      textareaRef={session.textarea}
      assetSet="cited-answer"
      running={current?.running ?? false}
      live={current?.controls ?? pendingConversationComposer(session, scope)}
      modelControl={
        <>
          {session.ready && (
            <ClientHandoffDraft
              key={JSON.stringify(session.ready.port.context)}
              context={session.ready.port.context}
              draft={session.draft}
              onDraft={(text) => {
                session.setDraft(text);
                if (
                  session.initialDraft.error() ||
                  session.initialDraft.draft() !== text
                )
                  throw Error("Draft could not be saved");
              }}
              disabled={modelDisabled}
            />
          )}
          <SkillSelectionPicker
            key={JSON.stringify(session.skillSelection)}
            selection={session.skillSelection}
            clientId={session.ready?.port.context.selectedClientId ?? null}
            disabled={modelDisabled}
            onChange={session.setSkillSelection}
          />
          {!session.accessLost && session.modelCatalog && (
            <div className={modelStyles.slot}>
              {modelDocument ? (
                <ModelSelectionPicker
                  catalog={modelDocument.modelCatalog}
                  label="Model for next message"
                  prefix="Model"
                  compact
                  value={selection}
                  disabled={modelDisabled}
                  onChange={(value) =>
                    session.setModelSelection(value ?? undefined)
                  }
                  defaultLabel={
                    session.acceptedRequest || session.earlier.length
                      ? "Continue current model"
                      : "Use personal default"
                  }
                  defaultShortLabel={
                    session.acceptedRequest || session.earlier.length
                      ? "Current"
                      : "Default"
                  }
                  defaultDescription="The server chooses your personal default for the first message and inherits the admitted model for later messages."
                />
              ) : (
                <span className={modelStyles.recovery} role="status">
                  {session.modelCatalog.loading
                    ? "Loading model choices…"
                    : "Model choices unavailable."}
                </span>
              )}
              {!modelDocument && !session.modelCatalog.loading && (
                <div className={modelStyles.recovery}>
                  <button type="button" onClick={session.modelCatalog.refresh}>
                    Reload models
                  </button>
                  {selection && (
                    <button
                      type="button"
                      disabled={modelDisabled}
                      onClick={() => session.setModelSelection(undefined)}
                    >
                      Use default
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      }
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
    <FeedbackContext.Provider value={ready?.port ?? null}>
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
            modelSelection={session.modelSelection}
            skillSelection={session.skillSelection}
            modelBlocked={session.modelBlocked}
            textareaRef={session.textarea}
            onNextTurn={session.startNext}
            onLifecycleTarget={session.openLifecycleTarget}
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
    </FeedbackContext.Provider>
  );
}
