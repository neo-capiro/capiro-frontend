"use client";
import { useState } from "react";
import { InlineDialog } from "../../ui/InlineDialog";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import { WorkflowField, type WorkflowFieldView } from "./WorkflowField";
import styles from "./tooling.module.css";

/** One named workflow's typed setup: subject, window and context fields, sources and output contract. */
export type WorkflowSetupView = {
  /** Original skill identifier, e.g. quick_skill.research_company. */
  skill: string;
  title: string;
  fields: readonly WorkflowFieldView[];
  requiredSources: string;
  output: string;
};

/**
 * Meri/Workflow setup: one form for all fourteen workflows. Field edits stay
 * local drafts; the trusted control layer resolves identity and revision.
 */
export function WorkflowSetup({
  setup,
  closeHref,
  continueHref,
  unavailable,
}: {
  setup: WorkflowSetupView;
  closeHref?: string | undefined;
  continueHref?: string | undefined;
  unavailable: string;
}) {
  const [values, setValues] = useState(() =>
    setup.fields.map((field) => field.value),
  );
  return (
    <InlineDialog
      title={setup.title}
      context="Set up a defined workflow"
      closeHref={closeHref}
      unavailable={unavailable}
    >
      {setup.fields.map((field, index) => (
        <WorkflowField
          key={field.label}
          field={field}
          value={values[index] ?? field.value}
          onChange={(value) =>
            setValues((current) =>
              current.map((old, at) => (at === index ? value : old)),
            )
          }
        />
      ))}
      <section className={styles.requiredSources} aria-label="Required sources">
        <h3>Required sources</h3>
        <p>{setup.requiredSources}</p>
      </section>
      <section className={styles.receive} aria-label="What you will receive">
        <h3>What you will receive</h3>
        <p>{setup.output}</p>
      </section>
      <div className={`${ui.row} ${styles.end}`}>
        <LinkAction variant="ghost" href={closeHref} unavailable={unavailable}>
          Cancel
        </LinkAction>
        <LinkAction
          variant="primary"
          href={continueHref}
          unavailable={unavailable}
        >
          Continue
        </LinkAction>
      </div>
    </InlineDialog>
  );
}
