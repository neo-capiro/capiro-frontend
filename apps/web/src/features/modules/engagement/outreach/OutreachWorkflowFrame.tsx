"use client";

import type { ReactNode } from "react";
import { ActionButton, PageHeader } from "../../../../shared/module-ui";
import styles from "./outreach-workflow.module.css";

export const outreachSteps = [
  {
    id: "1",
    label: "Direction",
    description: "Choose who you represent and who you want to reach.",
  },
  {
    id: "2",
    label: "Campaign setup",
    description: "Name your campaign and choose a template, tone and length.",
  },
  {
    id: "3",
    label: "Recipients",
    description:
      "Add individuals, a list for separate messages, or a group for one shared message.",
  },
  {
    id: "4",
    label: "Context plan",
    description:
      "Explain the purpose of your outreach and what you want recipients to do.",
  },
  {
    id: "5",
    label: "Context builder",
    description:
      "Choose supporting sources and notes, then decide which recipients they apply to.",
  },
  {
    id: "6",
    label: "Generate & review",
    description:
      "Generate drafts from your campaign context, then review each saved message.",
  },
  {
    id: "7",
    label: "Send",
    description:
      "Confirm your sending mailbox, recipients and saved messages before delivery.",
  },
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
  const stage =
    outreachSteps.find((item) => Number(item.id) === step) ?? outreachSteps[0];
  const nextStage = outreachSteps.find((item) => Number(item.id) === step + 1);
  return (
    <section className={styles.workflow} aria-label="Outreach campaign">
      <PageHeader
        title={title || "New outreach"}
        description={
          readOnly
            ? "View saved messages and delivery status."
            : saved
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
      <div className={styles.workspace}>
        <nav className={styles.stepRail} aria-label="Outreach steps">
          <p className={styles.railTitle}>Create your outreach</p>
          <ol>
            {outreachSteps.map((item, index) => (
              <li key={item.id}>
                <ActionButton
                  aria-current={index + 1 === step ? "step" : undefined}
                  disabled={
                    busy ||
                    fenced ||
                    (!readOnly && index + 1 > step + 1) ||
                    (index + 1 > step && Boolean(nextDisabled))
                  }
                  onClick={() => onStep(Number(item.id) as OutreachStep)}
                >
                  <span className={styles.stepNumber} aria-hidden="true">
                    {item.id}
                  </span>
                  {item.label}
                </ActionButton>
              </li>
            ))}
          </ol>
        </nav>
        <div className={styles.workPane}>
          <header className={styles.stageHeader}>
            <p className={styles.eyebrow}>
              Step {step} of {outreachSteps.length}
            </p>
            <h2>{stage.label}</h2>
            <p>{stage.description}</p>
          </header>
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
            <progress
              className={styles.progress}
              aria-label="Campaign progress"
              value={step}
              max={outreachSteps.length}
            />
            <ActionButton
              disabled={busy || fenced || readOnly || saved}
              onClick={onSave}
            >
              Save draft
            </ActionButton>
            {nextStage && (
              <ActionButton
                primary
                disabled={busy || fenced || Boolean(nextDisabled)}
                title={nextDisabled}
                onClick={() => onStep((step + 1) as OutreachStep)}
              >
                Continue to {nextStage.label.toLowerCase()}
              </ActionButton>
            )}
          </footer>
          {nextDisabled && <p className={styles.hint}>{nextDisabled}</p>}
        </div>
      </div>
    </section>
  );
}
