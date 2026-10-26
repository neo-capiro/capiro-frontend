import { Message, MessageContent } from "@capiro/ui/message";
import { unavailableResources } from "../../../shared/meri-resources/unavailable";
import { DesignIcon } from "../../../shared/shell/DesignIcon";
import { UserMessage } from "../screens/conversation/UserMessage";
import { TurnSources } from "../screens/sources/TurnSources";
import { Notice } from "../ui/Notice";
import { StatusPill, type StatusTone } from "../ui/StatusPill";
import { runStateLabels } from "../workspace/workspace-view";
import { isTerminal, type TurnView } from "./conversation-view";
import { useIntentApprovalsEnabled } from "./intents/approvals-enabled";
import answer from "../cited-answer.module.css";
import styles from "./live.module.css";

const tones: Readonly<Record<TurnView["runState"], StatusTone>> = {
  queued: "neutral",
  starting: "neutral",
  running: "neutral",
  "waiting-for-approval": "warning",
  paused: "warning",
  completed: "success",
  failed: "danger",
  cancelled: "warning",
};
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
  const working = turn.messages.length === 0 && turn.errors.length === 0;
  return (
    <article className={styles.turn} aria-label={label}>
      {showPrompt &&
        (turn.prompt !== null ? (
          <UserMessage>{turn.prompt}</UserMessage>
        ) : (
          <p className={styles.muted}>
            The request text for this run was not returned by the service.
          </p>
        ))}
      <Message from="assistant" className={styles.message}>
        <MessageContent className={answer.answer}>
          <div className={styles.answerHeading}>
            <span className={answer.identity}>
              <DesignIcon name="assistant-sparkle" assetSet="cited-answer" />
              Meri
            </span>
            <StatusPill tone={tones[turn.runState]}>
              {runStateLabels[turn.runState]}
            </StatusPill>
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
            <p key={message.messageId} className={styles.text}>
              {message.text}
            </p>
          ))}
          {working && !turn.incompleteHistory && (
            <p className={styles.muted}>
              {turn.runState === "completed"
                ? "This run finished without a text answer."
                : turn.runState === "failed" || turn.runState === "cancelled"
                  ? "No answer was published for this run."
                  : "Meri is working on this request."}
            </p>
          )}
          {turn.tools.length > 0 && (
            <ul className={styles.tools} aria-label="Tool activity">
              {turn.tools.map((tool) => (
                <li key={tool.requestId}>
                  {tool.name ?? "Tool"}
                  {" · "}
                  {tool.resultReference
                    ? "Result recorded · outcome unavailable"
                    : turn.omittedPrefix || turn.incompleteHistory
                      ? "Result not in loaded updates"
                      : isTerminal(turn.runState)
                        ? "No result recorded"
                        : "Awaiting result"}
                </li>
              ))}
            </ul>
          )}
          {(turn.sources.length > 0 || turn.nativeSources.length === 0) && (
            <TurnSources
              sources={turn.sources}
              historyIncomplete={
                !!(turn.omittedPrefix || turn.incompleteHistory)
              }
            />
          )}
        </MessageContent>
      </Message>
      <TurnNotices turn={turn} />
    </article>
  );
}

/** Approval requests, run errors and the service reason code published for the run. */
function TurnNotices({ turn }: { turn: TurnView }) {
  const approvals = useIntentApprovalsEnabled();
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
      {turn.reasonCode && turn.runState !== "completed" && (
        <p className={styles.muted}>Service reason: {turn.reasonCode}</p>
      )}
    </>
  );
}
