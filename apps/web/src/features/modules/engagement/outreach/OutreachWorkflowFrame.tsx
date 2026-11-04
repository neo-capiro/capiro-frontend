"use client";

import type { ReactNode } from "react";
import {
  ActionButton,
  PageHeader,
  SelectInput,
} from "../../../../shared/module-ui";
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
  renderFinalStep,
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
  renderFinalStep?: (footer: (action?: ReactNode) => ReactNode) => ReactNode;
  children: ReactNode;
}) {
  const stage =
    outreachSteps.find((item) => Number(item.id) === step) ?? outreachSteps[0];
  const nextStage = outreachSteps.find((item) => Number(item.id) === step + 1);
  const footer = (action?: ReactNode) => (
    <footer className={styles.footer}>
      {step === 1 && (
        <ActionButton
          variant="ghost"
          className={styles.quietAction}
          disabled={busy}
          onClick={onExit}
        >
          Cancel
        </ActionButton>
      )}
      {step > 1 && (
        <ActionButton
          variant="ghost"
          className={styles.quietAction}
          disabled={busy || fenced}
          onClick={() => onStep((step - 1) as OutreachStep)}
        >
          Back
        </ActionButton>
      )}
      <span className={styles.saveStatus}>
        {fenced
          ? "Confirmation needed"
          : saved
            ? "Draft saved"
            : "Unsaved changes"}
      </span>
      <ActionButton
        className={styles.saveAction}
        disabled={busy || fenced || readOnly || saved}
        onClick={onSave}
      >
        Save draft
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
      {nextStage && (
        <ActionButton
          primary
          disabled={busy || fenced || Boolean(nextDisabled)}
          title={nextDisabled}
          onClick={() => onStep((step + 1) as OutreachStep)}
        >
          {step === 6 ? "Review emails" : "Continue"}
        </ActionButton>
      )}
      {action}
    </footer>
  );
  return (
    <section className={styles.workflow} aria-label="Outreach campaign">
      <PageHeader
        eyebrow={
          title && title !== "New outreach"
            ? `Outreach / ${title}`
            : "Outreach / New campaign"
        }
        title={title || "New outreach"}
        actions={
          <ActionButton
            variant="ghost"
            className={styles.quietAction}
            disabled={busy}
            onClick={onExit}
          >
            All outreach
          </ActionButton>
        }
        description={
          readOnly
            ? "View saved messages and delivery status."
            : saved
              ? "Your draft is saved. Review before sending."
              : "Unsaved changes"
        }
      />
      <div className={styles.mobileSteps}>
        <SelectInput
          aria-label="Outreach step"
          value={String(step)}
          disabled={busy || fenced}
          options={outreachSteps.map((item, index) => ({
            value: item.id,
            label: `Step ${item.id} of 7 · ${item.label}`,
            disabled:
              (!readOnly && index + 1 > step + 1) ||
              (index + 1 > step && Boolean(nextDisabled)),
          }))}
          onValueChange={(value) => onStep(Number(value) as OutreachStep)}
        />
      </div>
      <div className={styles.workspace}>
        <nav className={styles.stepRail} aria-label="Outreach steps">
          <p className={styles.railTitle}>YOUR CAMPAIGN</p>
          <ol>
            {outreachSteps.map((item, index) => (
              <li key={item.id} data-visited={index + 1 < step || undefined}>
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
                    {index + 1 < step ? "✓" : item.id}
                  </span>
                  {item.label}
                </ActionButton>
              </li>
            ))}
          </ol>
          <div className={styles.railSummary}>
            <span>{readOnly ? "CAMPAIGN" : "DRAFT"}</span>
            <strong>Review before sending</strong>
            <p>Your progress stays with this campaign.</p>
          </div>
        </nav>
        <div className={styles.workPane}>
          <header className={styles.stageHeader}>
            <p className={styles.eyebrow}>
              Step {step} of {outreachSteps.length}
            </p>
            <h2>{stage.label}</h2>
            <p className={styles.stageDescription}>{stage.description}</p>
          </header>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div className={styles.step} aria-busy={busy}>
            {children}
            {renderFinalStep?.(footer)}
          </div>
          {!renderFinalStep && footer()}
          {nextDisabled && <p className={styles.hint}>{nextDisabled}</p>}
        </div>
      </div>
    </section>
  );
}
