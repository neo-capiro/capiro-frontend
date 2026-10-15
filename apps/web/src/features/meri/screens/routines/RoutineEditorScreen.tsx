"use client";
import { useState } from "react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { FormField } from "../../ui/FormField";
import { LinkAction } from "../../ui/LinkAction";
import { Panel } from "../../ui/Panel";
import ui from "../../ui/meri-ui.module.css";
import styles from "./routines.module.css";

export type RoutineDraft = {
  name: string;
  instructions: string;
  scope: string;
  initiator: string;
  destination: string;
  frequency: string;
  startTime: string;
  timezone: string;
  budget: string;
  retry: string;
  notifications: string;
};
type FieldSpec = {
  key: keyof RoutineDraft;
  label: string;
  multiline?: boolean;
  /** Authority-bound values are shown, never chosen in the browser. */
  bound?: boolean;
};

const taskFields: readonly FieldSpec[] = [
  { key: "name", label: "Name" },
  { key: "instructions", label: "Instructions", multiline: true },
  { key: "scope", label: "Client / data scope", bound: true },
  { key: "initiator", label: "Initiating user", bound: true },
  { key: "destination", label: "Output destination" },
];
const timeFields: readonly FieldSpec[] = [
  { key: "startTime", label: "Start time" },
  { key: "timezone", label: "Timezone" },
];
const limitFields: readonly FieldSpec[] = [
  { key: "budget", label: "Budget / deadline", bound: true },
  { key: "retry", label: "Retry policy" },
  { key: "notifications", label: "Notifications" },
];

export type RoutineEditorView = {
  /** New routine (08.02) or an existing routine being edited (08.02A). */
  mode: "create" | "edit";
  description: string;
  draft: RoutineDraft;
  nextRuns: string;
  cancelHref?: string;
};

/** 08.02 Create and 08.02A Edit routine: a local draft; saving is a trusted schedule-owner action. */
export function RoutineEditorScreen({
  view,
  unavailable,
}: {
  view: RoutineEditorView;
  unavailable: string;
}) {
  const [draft, setDraft] = useState(view.draft);
  const field = (spec: FieldSpec) => (
    <FormField
      key={spec.key}
      label={spec.label}
      value={draft[spec.key]}
      multiline={spec.multiline ?? false}
      onChange={
        spec.bound
          ? undefined
          : (value) =>
              setDraft((current) => ({ ...current, [spec.key]: value }))
      }
    />
  );
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title={view.mode === "edit" ? "Edit routine" : "New routine"}
        description={view.description}
      />
      <Panel label="Routine form">
        <form
          className={styles.form}
          aria-label="Routine"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className={styles.columns}>
            <fieldset aria-label="Task and scope">
              {taskFields.map(field)}
            </fieldset>
            <fieldset aria-label="Timing and limits">
              {field({ key: "frequency", label: "Frequency" })}
              <div className={styles.pair}>{timeFields.map(field)}</div>
              {limitFields.map(field)}
            </fieldset>
          </div>
          <hr className={styles.divider} />
          <p className={ui.muted}>{view.nextRuns}</p>
          <div className={ui.row}>
            <LinkAction
              variant="outline"
              href={view.cancelHref}
              unavailable={unavailable}
            >
              Cancel
            </LinkAction>
            <button
              type="submit"
              className={ui.primary}
              disabled
              title={unavailable}
            >
              {view.mode === "edit" ? "Save changes" : "Create routine"}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
