"use client";

import { useState } from "react";
import { Button } from "@capiro/ui/button";
import type {
  ConversationQuestion,
  PendingQuestion,
  QuestionSelection,
} from "@capiro/meri-client/conversation";
import styles from "./question-card.module.css";

export type QuestionCardState = "open" | "waiting" | "unavailable" | "error";

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
}: {
  question: PendingQuestion;
  state: QuestionCardState;
  error: string | null;
  onSubmit: (
    selection: QuestionSelection,
    freeText: Readonly<Record<string, string>>,
  ) => void;
}) {
  const [selection, setSelection] = useState<QuestionSelection>({});
  const [freeText, setFreeText] = useState<Record<string, string>>({});
  const disabled = state !== "open";

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
            : state === "unavailable"
              ? "No longer answerable"
              : state === "error"
                ? "Answer not accepted"
                : "Waiting for you"}
        </span>
      </div>
      {state === "unavailable" && (
        <p className={styles.notice}>
          This run is no longer waiting for an answer, so the question can no
          longer reach it. Nothing was sent.
        </p>
      )}
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
      </div>
    </section>
  );
}
