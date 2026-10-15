"use client";
import { useState } from "react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { InlineDialog } from "../../ui/InlineDialog";
import { FormField } from "../../ui/FormField";
import { LinkAction } from "../../ui/LinkAction";
import { Panel } from "../../ui/Panel";
import { StatusPill } from "../../ui/StatusPill";
import { StopRunControl } from "./StopRunControl";
import ui from "../../ui/meri-ui.module.css";
import panel from "../../ui/panel.module.css";
import surfaces from "../../ui/surfaces.module.css";
import styles from "./runs.module.css";

export type SteerRunView = {
  title: string;
  instruction: string;
  /** Receipt of the last direction the run accepted, if any. */
  accepted?: string;
  timing: string;
  runHref?: string;
};

/** 02.05 Steer and stop a run: a direction draft for the next safe step and the stop decision. */
export function SteerRunScreen({
  view,
  unavailable,
}: {
  view: SteerRunView;
  unavailable: string;
}) {
  const [instruction, setInstruction] = useState(view.instruction);
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title={view.title}
        description="You can add direction or stop the remaining work."
      />
      <div className={styles.enter}>
        <InlineDialog
          title="Add a direction"
          context="Meri will apply this instruction at the next safe step."
          closeHref={view.runHref}
          unavailable={unavailable}
        >
          <FormField
            label="New instruction"
            value={instruction}
            onChange={setInstruction}
          />
          {view.accepted ? (
            <span className={`${surfaces.pillSlot} ${styles.acceptedPill}`}>
              <StatusPill tone="success">{view.accepted}</StatusPill>
            </span>
          ) : null}
          <p className={ui.muted}>{view.timing}</p>
          <div className={ui.row}>
            <LinkAction
              variant="outline"
              href={view.runHref}
              unavailable={unavailable}
            >
              Cancel
            </LinkAction>
            <button
              type="button"
              className={ui.primary}
              disabled
              title={unavailable}
            >
              Send direction
            </button>
          </div>
        </InlineDialog>
      </div>
      <Panel label="Stop this run" tone="muted" narrow>
        <h2 className={panel.title}>Stop this run?</h2>
        <p className={panel.body}>
          Remaining work will be cancelled. Completed files and action receipts
          stay in this conversation.
        </p>
        <div className={ui.row}>
          <LinkAction
            variant="outline"
            href={view.runHref}
            unavailable={unavailable}
          >
            Keep running
          </LinkAction>
          <StopRunControl
            label="Stop remaining work"
            variant="primary"
            unavailable={unavailable}
          />
        </div>
      </Panel>
    </div>
  );
}
