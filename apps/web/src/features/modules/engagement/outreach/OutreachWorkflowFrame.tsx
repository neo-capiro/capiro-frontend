"use client";

import type { ReactNode } from "react";
import { ActionButton, PageHeader, Tabs } from "../../../../shared/module-ui";
import styles from "./outreach-workflow.module.css";

export const outreachSteps = [
  { id: "1", label: "Direction" },
  { id: "2", label: "Campaign setup" },
  { id: "3", label: "Recipients" },
  { id: "4", label: "Context plan" },
  { id: "5", label: "Context builder" },
  { id: "6", label: "Generate & review" },
  { id: "7", label: "Send" },
] as const;

export type OutreachStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Presentation only; the campaign owner controls saving and step admission. */
export function OutreachWorkflowFrame({
  title,
  step,
  busy,
  saved,
  fenced,
  readOnly,
  error,
  nextDisabled,
  onExit,
  onStep,
  onSave,
  children,
}: {
  title: string;
  step: OutreachStep;
  busy: boolean;
  saved: boolean;
  fenced: boolean;
  readOnly: boolean;
  error?: string;
  nextDisabled?: string;
  onExit: () => void;
  onStep: (step: OutreachStep) => void;
  onSave: () => void;
  children: ReactNode;
}) {
  return (
    <section className={styles.workflow} aria-label="Outreach campaign">
      <PageHeader
        title={title || "New outreach"}
        description={
          saved
            ? "Your draft is saved. Review before sending."
            : "Unsaved changes"
        }
      />
      <ActionButton
        className={styles.backLink}
        disabled={busy}
        onClick={onExit}
      >
        ← All outreach
      </ActionButton>
      <Tabs
        label="Outreach steps"
        value={String(step)}
        items={outreachSteps.map((item, index) => ({
          ...item,
          disabled:
            busy ||
            fenced ||
            (!readOnly && index + 1 > step + 1) ||
            (index + 1 > step && Boolean(nextDisabled)),
        }))}
        onChange={(value) => onStep(Number(value) as OutreachStep)}
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.step} aria-busy={busy}>
        {children}
      </div>
      <footer className={styles.footer}>
        <ActionButton
          disabled={busy || fenced || step === 1}
          onClick={() => onStep((step - 1) as OutreachStep)}
        >
          Back
        </ActionButton>
        <span className={styles.stepCount}>
          Step {step} of {outreachSteps.length}
        </span>
        <ActionButton
          disabled={busy || fenced || readOnly || saved}
          onClick={onSave}
        >
          Save draft
        </ActionButton>
        {step < 7 && (
          <ActionButton
            primary
            disabled={busy || fenced || Boolean(nextDisabled)}
            title={nextDisabled}
            onClick={() => onStep((step + 1) as OutreachStep)}
          >
            Continue
          </ActionButton>
        )}
      </footer>
      {nextDisabled && <p className={styles.hint}>{nextDisabled}</p>}
    </section>
  );
}
