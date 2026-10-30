"use client";
import { DocumentRevisionDraft } from "./DocumentRevisionDraft";
import { useState, useSyncExternalStore } from "react";
import { MeriComposer } from "../MeriComposer";
import { QuestionCard } from "./QuestionCard";
import { useRunQuestion } from "./useRunQuestion";
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
import { useQuickActionCatalog } from "./useQuickActionCatalog";
import { SiteWorkflowPicker } from "./SiteWorkflowPicker";
import { WorkSelectionPicker } from "../work/WorkSelectionPicker";
import { ProcedureSelectionPicker } from "./ProcedureSelectionPicker";
import { ClientHandoffDraft } from "./ClientHandoffDraft";
import { FeedbackContext } from "./feedback/FeedbackContext";
import { useComposerAttachments } from "../uploads/useComposerAttachments";
import { ConnectedBrowserViewer } from "../browser/ConnectedBrowserViewer";

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
  const live = current?.controls ?? pendingConversationComposer(session, scope);
  // The attachment slot follows the displayed conversation; a replaced port discards its results.
  const attachments = useComposerAttachments(
    current?.port ?? null,
    live.attachUnavailable,
  );
  // A clarifying question is durable run state: it is re-derived from this conversation's own events on every render,
  // survives a refresh, and is answered with one lifecycle control.
  const question = useRunQuestion(current?.port ?? null);
  // Core owns the QuickActions rollout; this only decides which skills a NEW selection may offer.
  const quickActions = useQuickActionCatalog(
    session.ready?.port.context.tenantId ?? null,
  );
  return (
    <>
      {question.pending !== null && (
        <QuestionCard
          question={question.pending}
          state={
            current === null ? "unavailable" : question.state
          }
          error={question.error}
          onSubmit={question.submit}
          onCheckAgain={question.retryable ? question.reconcile : undefined}
        />
      )}
    <MeriComposer
      draft={session.accessLost ? "" : session.draft}
      onDraft={session.setDraft}
      textareaRef={session.textarea}
      assetSet="cited-answer"
      running={current?.running ?? false}
      live={live}
      attachments={attachments}
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
          {session.ready && (
            <DocumentRevisionDraft
              key={JSON.stringify(session.ready.port.context)}
              context={session.ready.port.context}
              selection={session.skillSelection}
              disabled={modelDisabled}
              onChange={(selection) => {
                session.setSkillSelection(selection);
                if (
                  session.initialDraft.error() ||
                  JSON.stringify(session.initialDraft.selection()) !==
                    JSON.stringify(selection)
                )
                  throw Error("Selection could not be retained");
              }}
            />
          )}
          <SkillSelectionPicker
            key={JSON.stringify(session.skillSelection)}
            selection={session.skillSelection}
            clientId={session.ready?.port.context.selectedClientId ?? null}
            disabled={modelDisabled}
            gate={quickActions.gate}
            onChange={session.setSkillSelection}
          />
          {current && (
            <SiteWorkflowPicker
              key={`website:${JSON.stringify(current.port.context)}`}
              conversationId={current.port.context.conversationId}
              selection={session.skillSelection}
              disabled={modelDisabled}
              onChange={session.setSkillSelection}
            />
          )}
          {/* Start Work / Delegate is additive: it never withdraws another selected input. */}
          <WorkSelectionPicker
            key={JSON.stringify(session.skillSelection.work ?? null)}
            selection={session.skillSelection}
            disabled={modelDisabled}
            onChange={session.setSkillSelection}
          />
          {/*
            The native procedure control lists what Core currently offers this account and tenant, and
            retires a choice the catalog no longer lists. Listing is not execution: the canonical
            receiver still decides what a draft may carry, and Core re-resolves the exact procedure,
            version, digest and client access when the message is actually sent.
          */}
          {session.ready && (
            <ProcedureSelectionPicker
              key={`procedure:${JSON.stringify(session.ready.port.context)}`}
              tenantId={session.ready.port.context.tenantId}
              lifetime={JSON.stringify(session.ready.port.context)}
              selection={session.skillSelection}
              disabled={modelDisabled}
              onChange={session.setSkillSelection}
            />
          )}
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
    </>
  );
}

/** One selected-conversation frame; credential renewal preserves the same run's local presentation. */
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
  const [retained, setRetained] = useState(ready);
  if (ready && retained !== ready) setRetained(ready);
  const displayed =
    ready ??
    (!session.accessLost && !session.latestTarget && session.connection.renewing
      ? retained
      : undefined);
  return (
    <FeedbackContext.Provider value={displayed?.port ?? null}>
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
        {displayed ? (
          <MeriLiveConversation
            key={displayed.lifetimeKey}
            port={displayed.port}
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
        {!session.history.denied &&
          !session.latestTarget &&
          session.selectedId &&
          session.connection.runId && (
            <ConnectedBrowserViewer
              key={JSON.stringify([
                session.account,
                session.clientId,
                session.selectedId,
                session.connection.runId,
              ])}
              account={session.account}
              clientId={session.clientId}
              conversationId={session.selectedId}
              runId={session.connection.runId}
              onTarget={session.openBrowserTarget}
            />
          )}
      </ConversationFrame>
    </FeedbackContext.Provider>
  );
}
