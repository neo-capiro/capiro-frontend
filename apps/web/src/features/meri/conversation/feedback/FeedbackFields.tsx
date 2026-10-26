import type { ConversationFeedbackRequest } from "@capiro/meri-contracts/conversation-application";
import type { TurnView } from "../conversation-view";
import styles from "./feedback.module.css";
export type FeedbackKind = ConversationFeedbackRequest["signal"]["kind"];
export type FeedbackDraft = {
  target: string;
  kind: FeedbackKind;
  preference: "helpful" | "not_helpful";
  text: string;
  sourceEventId: string;
};
export function feedbackTargets(turn: TurnView) {
  const base = { runId: turn.runId, throughSequence: turn.throughSequence! };
  return [
    ...turn.messages.map((message, index) => ({
      key: message.messageId,
      label: turn.messages.length === 1 ? "Answer" : `Answer ${index + 1}`,
      value: {
        ...base,
        kind: "message" as const,
        messageId: message.messageId,
      },
    })),
    ...turn.artifacts.map((artifact, index) => ({
      key: artifact.versionId,
      label: `File ${index + 1} · this version`,
      value: { ...base, kind: "artifact" as const, ...artifact },
    })),
  ];
}
export function FeedbackFields({
  turn,
  draft,
  setDraft,
  disabled,
  id,
}: {
  turn: TurnView;
  draft: FeedbackDraft;
  setDraft: (value: FeedbackDraft) => void;
  disabled: boolean;
  id: string;
}) {
  const update = <K extends keyof FeedbackDraft>(
    key: K,
    value: FeedbackDraft[K],
  ) => setDraft({ ...draft, [key]: value });
  return (
    <fieldset className={styles.fields} disabled={disabled}>
      <label htmlFor={`${id}-target`}>Feedback about</label>
      <select
        id={`${id}-target`}
        value={draft.target}
        onChange={(event) => update("target", event.target.value)}
      >
        {feedbackTargets(turn).map((target) => (
          <option key={target.key} value={target.key}>
            {target.label}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-kind`}>Type of feedback</label>
      <select
        id={`${id}-kind`}
        value={draft.kind}
        onChange={(event) => update("kind", event.target.value as FeedbackKind)}
      >
        <option value="preference">Preference</option>
        <option value="factual_correction">Factual correction</option>
        <option value="recommendation">Recommendation</option>
      </select>
      {draft.kind === "preference" && (
        <>
          <label htmlFor={`${id}-preference`}>Was this helpful?</label>
          <select
            id={`${id}-preference`}
            value={draft.preference}
            onChange={(event) =>
              update(
                "preference",
                event.target.value as FeedbackDraft["preference"],
              )
            }
          >
            <option value="helpful">Helpful</option>
            <option value="not_helpful">Not helpful</option>
          </select>
        </>
      )}
      <label htmlFor={`${id}-text`}>
        {draft.kind === "factual_correction"
          ? "What should be corrected?"
          : draft.kind === "recommendation"
            ? "What do you recommend?"
            : "Add a note (optional)"}
      </label>
      <textarea
        id={`${id}-text`}
        rows={3}
        maxLength={2000}
        value={draft.text}
        required={draft.kind !== "preference"}
        onChange={(event) => update("text", event.target.value)}
      />
      {turn.nativeSources.length > 0 && (
        <>
          <label htmlFor={`${id}-source`}>Related source (optional)</label>
          <select
            id={`${id}-source`}
            value={draft.sourceEventId}
            onChange={(event) => update("sourceEventId", event.target.value)}
          >
            <option value="">No source selected</option>
            {turn.nativeSources.map((source, index) => (
              <option key={source.eventId} value={source.eventId}>
                Source {index + 1} · saved revision
              </option>
            ))}
          </select>
        </>
      )}
    </fieldset>
  );
}
