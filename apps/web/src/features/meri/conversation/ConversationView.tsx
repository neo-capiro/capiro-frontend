"use client";
import { useCallback, useState } from "react";
import { DocumentRevisionDraft } from "./DocumentRevisionDraft";
import { MeriComposer, type ComposerChip } from "../MeriComposer";
import { QuestionCard } from "./QuestionCard";
import { ConnectionPending, UnverifiedAccessNotice } from "./ConnectionPending";
import { ConversationFrame } from "./ConversationFrame";
import { ConversationHistoryStatus } from "./ConversationHistoryStatus";
import { MeriLiveConversation } from "./MeriLiveConversation";
import {
  createConversationComposer,
  type ConversationComposerChannel,
} from "./conversation-composer";
import type { useConversationSession } from "./useConversationSession";
import { useComposerControls } from "./session-composer-controls";
import { selectionLabel } from "../model-selection/model-selection";
import { useQuickActionCatalog } from "./useQuickActionCatalog";
import { newIntentRefusal, type QuickActionGate } from "./quick-action-gate";
import { ClientHandoffDraft } from "./ClientHandoffDraft";
import { FeedbackContext } from "./feedback/FeedbackContext";
import { SessionTools } from "./SessionTools";
import { composerChips } from "./composer-chips";
import styles from "./live.module.css";

type Session = ReturnType<typeof useConversationSession>;

/** Only this sibling subscribes: publishing controls never rerender their run owner. */
export function SessionComposer({
  session,
  scope,
  channel,
  gate,
  toolsOpen = false,
  onToggleTools,
  scopeControl,
}: {
  session: Session;
  scope: string;
  channel: ConversationComposerChannel;
  gate: QuickActionGate;
  /** Optional per-message settings panel; closed by default. */
  toolsOpen?: boolean;
  onToggleTools?: (() => void) | undefined;
  scopeControl?: React.ReactNode;
}) {
  const controls = useComposerControls(session, scope, channel);
  const {
    current,
    live,
    attachments,
    question,
    modelDocument,
    modelSelection,
  } = controls;
  const model = modelSelection ?? session.modelSelection ?? null;
  const catalog = modelDocument?.modelCatalog;
  const modelChip: readonly ComposerChip[] =
    model && catalog
      ? [
          {
            key: "model",
            label: `Model · ${selectionLabel(catalog, model)}`,
            onRemove: controls.modelDisabled
              ? undefined
              : () => session.setModelSelection(undefined),
          },
        ]
      : [];
  return (
    <>
      {question.pending !== null && (
        <QuestionCard
          question={question.pending}
          state={current === null ? "unavailable" : question.state}
          error={question.error}
          onSubmit={question.submit}
          onCheckAgain={question.retryable ? question.reconcile : undefined}
        />
      )}
      {/* These two only synchronise an admitted handoff/revision selection into the draft owner. */}
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
          disabled={controls.modelDisabled}
        />
      )}
      {session.ready && (
        <DocumentRevisionDraft
          key={JSON.stringify(session.ready.port.context)}
          context={session.ready.port.context}
          selection={session.skillSelection}
          disabled={controls.modelDisabled}
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
      <MeriComposer
        draft={session.accessLost ? "" : session.draft}
        onDraft={session.setDraft}
        textareaRef={session.textarea}
        assetSet="cited-answer"
        running={current?.running ?? false}
        live={live}
        attachments={attachments}
        chips={[
          ...composerChips(session.skillSelection, session.setSkillSelection),
          ...modelChip,
        ]}
        scopeControl={scopeControl}
        tools={
          onToggleTools
            ? { open: toolsOpen, onToggle: onToggleTools }
            : undefined
        }
      />
      <SessionTools
        open={toolsOpen}
        session={session}
        controls={controls}
        gate={gate}
        onClose={onToggleTools ?? (() => undefined)}
      />
    </>
  );
}

/** One selected-conversation frame; credential renewal preserves the same run's local presentation. */
export function ConversationView({
  session,
  scope,
  scopeControl,
}: {
  session: Session;
  scope: string;
  scopeControl?: React.ReactNode;
}) {
  const [composer] = useState(createConversationComposer);
  const ready =
    !session.accessLost && !session.latestTarget ? session.ready : undefined;
  const [retained, setRetained] = useState(ready);
  if (ready && retained !== ready) setRetained(ready);
  // The admitted display outlives a credential reload and an access check that was not answered; a
  // refusal (accessLost) still hides it. The retained port is disposed and can issue no request.
  const { renewing, unverified } = session.connection;
  const displayed =
    ready ??
    (!session.accessLost && !session.latestTarget && (renewing || unverified)
      ? retained
      : undefined);
  // Optional per-message settings stay a non-modal column on desktop and a sheet on a phone.
  const [toolsOpen, setToolsOpen] = useState(false);
  const toggleTools = useCallback(() => setToolsOpen((open) => !open), []);
  // Core owns the QuickActions rollout. One read per mounted conversation decides both which skills
  // a NEW selection may offer and whether a NEW first submission or next turn may be dispatched:
  // an applied-but-never-submitted draft is refused while the current catalog is closed, and the
  // selection itself is left intact for correction or retry.
  const quickActions = useQuickActionCatalog(
    session.ready?.port.context.tenantId ?? null,
  );
  const newIntentBlocked = newIntentRefusal(
    quickActions.gate,
    session.skillSelection,
  );
  return (
    <FeedbackContext.Provider value={displayed?.port ?? null}>
      <div className={styles.chat} data-tools={toolsOpen ? "open" : undefined}>
        <ConversationFrame
          scope={scope}
          historyStatus={
            session.accessLost || (!session.selectedId && !displayed) ? null : (
              <ConversationHistoryStatus session={session} />
            )
          }
          notice={
            unverified && displayed ? (
              <UnverifiedAccessNotice session={session} />
            ) : null
          }
          composer={
            <SessionComposer
              session={session}
              scope={scope}
              channel={composer}
              gate={quickActions.gate}
              toolsOpen={toolsOpen}
              onToggleTools={toggleTools}
              scopeControl={scopeControl}
            />
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
              newIntentBlocked={newIntentBlocked}
              modelBlocked={session.modelBlocked}
              textareaRef={session.textarea}
              onNextTurn={session.startNext}
              onLifecycleTarget={session.openLifecycleTarget}
              onBrowserTarget={session.openBrowserTarget}
              browserAllowed={toolsOpen}
              historyUnavailable={session.history.unavailable}
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
      </div>
    </FeedbackContext.Provider>
  );
}
