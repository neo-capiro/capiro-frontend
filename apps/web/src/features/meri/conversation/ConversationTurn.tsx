import { Message, MessageContent } from "@capiro/ui/message";
import { MarkdownContent } from "../../../shared/markdown/MarkdownContent";
import { unavailableResources } from "../../../shared/meri-resources/unavailable";
import { DesignIcon } from "../../../shared/shell/DesignIcon";
import { UserMessage } from "../screens/conversation/UserMessage";
import { TurnSources } from "../screens/sources/TurnSources";
import { Notice } from "../ui/Notice";
import { StatusPill, type StatusTone } from "../ui/StatusPill";
import { runStateLabels } from "../workspace/workspace-view";
import { isTerminal, type TurnView } from "./conversation-view";
import { describeRunFailure } from "./run-failure";
import { useIntentApprovalsEnabled } from "./intents/approvals-enabled";
import answer from "../cited-answer.module.css";
import styles from "./live.module.css";
import { TurnFeedback } from "./feedback/TurnFeedback";

/** Only a state that needs the person's attention earns a pill; a finished answer is its own signal. */
const attentionTones: Readonly<
  Partial<Record<TurnView["runState"], StatusTone>>
> = {
  "waiting-for-approval": "warning",
  paused: "warning",
  failed: "danger",
  cancelled: "warning",
};
const activeStates: ReadonlySet<TurnView["runState"]> = new Set([
  "queued",
  "starting",
  "running",
]);
const time = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString();
};

/** One request and Meri's admitted output for its run. Nothing here is sample content. */
export function ConversationTurn({
  turn,
  label,
  showPrompt = true,
}: {
  turn: TurnView;
  /** Accessible name of the turn, e.g. "Current turn". */
  label: string;
  /** Resumed segments retain their output/status while their logical prompt is shown once. */
  showPrompt?: boolean;
}) {
  const tone = attentionTones[turn.runState];
  const silent =
    isTerminal(turn.runState) &&
    turn.messages.length === 0 &&
    turn.errors.length === 0 &&
    !turn.incompleteHistory;
  return (
    <article
      className={styles.turn}
      aria-label={label}
      data-run-state={turn.runState}
    >
      {showPrompt && turn.prompt !== null && (
        <UserMessage>{turn.prompt}</UserMessage>
      )}
      <Message from="assistant" className={styles.message}>
        <MessageContent className={answer.answer}>
          <div className={styles.answerHeading}>
            <span className={answer.identity}>
              <DesignIcon name="assistant-sparkle" assetSet="cited-answer" />
              Meri
            </span>
            {tone ? (
              <StatusPill tone={tone}>
                {runStateLabels[turn.runState]}
              </StatusPill>
            ) : (
              activeStates.has(turn.runState) && (
                <span role="status" className={styles.working}>
                  Meri is working…
                </span>
              )
            )}
          </div>
          {turn.omittedPrefix && (
            <p className={styles.muted}>
              Earlier events of this run are not shown.
            </p>
          )}
          {turn.incompleteHistory && (
            <p className={styles.muted}>
              More saved updates for this run have not been loaded.
            </p>
          )}
          {turn.messages.map((message) => (
            <MarkdownContent key={message.messageId} source={message.text} />
          ))}
          {silent && (
            <p className={styles.muted}>
              {turn.runState === "completed"
                ? "This run finished without a text answer."
                : "No answer was published for this run."}
            </p>
          )}
          {turn.sources.length > 0 && (
            <TurnSources
              sources={turn.sources}
              historyIncomplete={
                !!(turn.omittedPrefix || turn.incompleteHistory)
              }
            />
          )}
          <TurnFeedback turn={turn} />
        </MessageContent>
      </Message>
      <TurnNotices turn={turn} />
    </article>
  );
}

/** Approval requests, run errors and why a failed run stopped. */
function TurnNotices({ turn }: { turn: TurnView }) {
  const approvals = useIntentApprovalsEnabled();
  const failure =
    turn.runState === "failed" ? describeRunFailure(turn.reasonCode) : null;
  return (
    <>
      {turn.approvals.map((approval) => (
        <Notice
          key={approval.proposalId}
          tone="warning"
          title="Approval required"
        >
          {approvals ? (
            <p>
              Meri is waiting for an approval that expires{" "}
              {time(approval.expiresAt)}. Review and decide it under “Actions
              for your approval”; nothing happens unless you approve it there.
            </p>
          ) : (
            <p>
              Meri is waiting for an approval that expires{" "}
              {time(approval.expiresAt)}. Decisions cannot be made here yet.{" "}
              {unavailableResources.approvals.missing}
            </p>
          )}
        </Notice>
      ))}
      {turn.errors.map((error, index) => (
        <Notice key={`${error.code}-${index}`} tone="danger" title="Run error">
          <p>
            {error.message} ({error.code})
            {error.retryable ? " You can send the request again." : ""}
          </p>
        </Notice>
      ))}
      {failure && (
        <p className={styles.muted}>
          {failure.message}
          {failure.code && <small> {failure.code}</small>}
        </p>
      )}
    </>
  );
}
