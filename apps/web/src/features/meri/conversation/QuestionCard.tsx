"use client";

import { useEffect, useState } from "react";
import { Button } from "@capiro/ui/button";
import type {
  ConversationQuestion,
  PendingQuestion,
  QuestionSelection,
} from "@capiro/meri-client/conversation";
import styles from "./question-card.module.css";

export type QuestionCardState =
  | "open"
  | "waiting"
  | "unknown"
  | "rejected"
  | "local"
  | "retention"
  | "unavailable"
  | "error";

/**
 * The clarifying question Claude asked, as the run's own durable events describe it.
 *
 * Nothing here decides authority: selecting options only prepares the answer, and submitting it posts one lifecycle
 * control that Core authenticates for the current actor. A question whose run is no longer live is shown as no longer
 * answerable instead of being silently dropped — an answer to a stopped run would never reach a suspended call.
 */
export function QuestionCard({
  question,
  state,
  error,
  onSubmit,
  onCheckAgain,
}: {
  question: PendingQuestion;
  state: QuestionCardState;
  error: string | null;
  onSubmit: (
    selection: QuestionSelection,
    freeText: Readonly<Record<string, string>>,
  ) => void;
  /** Ask the run again about the answer already attempted, under that same control identity. */
  onCheckAgain?: () => void;
}) {
  const [selection, setSelection] = useState<QuestionSelection>({});
  const [freeText, setFreeText] = useState<Record<string, string>>({});
  // Only a state that genuinely cannot accept input locks the card. A local selection problem or a rejected answer stays
  // editable so the user can correct it and send again; a delivered or unknown answer does not.
  // A conversation that is no longer current cannot deliver an answer at all, so "error" is locked like the other
  // terminal states; only a correctable local problem or an explicit refusal stays editable.
  const disabled =
    state === "waiting" ||
    state === "unknown" ||
    state === "unavailable" ||
    state === "retention" ||
    state === "error";
  // A different question is a fresh decision: no selection or typed text carries over from the previous one.
  useEffect(() => {
    setSelection({});
    setFreeText({});
  }, [question.questionId]);

  const select = (questionText: string, label: string, multiSelect: boolean) =>
    setSelection((current) => {
      if (!multiSelect) return { ...current, [questionText]: label };
      const existing = current[questionText];
      const values = Array.isArray(existing) ? existing : [];
      return {
        ...current,
        [questionText]: values.includes(label)
          ? values.filter((value) => value !== label)
          : [...values, label],
      };
    });

  return (
    <section
      className={styles.card}
      aria-labelledby="meri-question-title"
      aria-busy={state === "waiting"}
    >
      <div className={styles.heading}>
        <h2 id="meri-question-title">Claude needs a decision</h2>
        <span className={styles.state} role="status">
          {state === "waiting"
            ? "Sending answer"
            : state === "unknown"
              ? "Delivery unconfirmed"
              : state === "unavailable"
                ? "No longer answerable"
                : state === "rejected"
                  ? "Not accepted"
                  : state === "local"
                    ? "Choose an answer"
                    : state === "retention"
                      ? "Answer not recorded"
                      : state === "error"
                        ? "Conversation not current"
                        : "Waiting for you"}
        </span>
      </div>
      {error !== null && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {question.questions.map((item: ConversationQuestion) => (
        <fieldset className={styles.question} key={item.question} disabled={disabled}>
          <legend>
            <span className={styles.header}>{item.header}</span>
            {item.question}
          </legend>
          <p className={styles.hint}>
            {item.multiSelect ? "Select one or more" : "Select one"}
          </p>
          {item.options.map((option) => {
            const value = selection[item.question];
            const checked = Array.isArray(value)
              ? value.includes(option.label)
              : value === option.label;
            return (
              <label className={styles.option} key={option.label}>
                <input
                  type={item.multiSelect ? "checkbox" : "radio"}
                  name={item.question}
                  value={option.label}
                  checked={checked}
                  onChange={() => select(item.question, option.label, item.multiSelect)}
                />
                <span>
                  <strong>{option.label}</strong>
                  {option.description}
                </span>
              </label>
            );
          })}
          <label className={styles.freeText}>
            <span>Or answer in your own words</span>
            <input
              type="text"
              value={freeText[item.question] ?? ""}
              onChange={(event) =>
                setFreeText((current) => ({
                  ...current,
                  [item.question]: event.target.value,
                }))
              }
            />
          </label>
        </fieldset>
      ))}
      <div className={styles.actions}>
        <Button
          type="button"
          disabled={disabled}
          onClick={() => onSubmit(selection, freeText)}
        >
          Send answer
        </Button>
        {state === "unknown" && onCheckAgain ? (
          <Button type="button" variant="secondary" onClick={onCheckAgain}>
            Check the same answer again
          </Button>
        ) : null}
      </div>
    </section>
  );
}
