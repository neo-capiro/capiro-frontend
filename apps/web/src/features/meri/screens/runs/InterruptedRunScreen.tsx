"use client";
import { useState } from "react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { Notice } from "../../ui/Notice";
import { InlineDialog } from "../../ui/InlineDialog";
import { FormField } from "../../ui/FormField";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import panel from "../../ui/panel.module.css";
import styles from "./runs.module.css";

export type InterruptedRunView = {
  title: string;
  /** Interruption reason from the projected run error; absent while the run has not failed. */
  interruption?: { title: string; detail: string };
  forkName: string;
  startFrom: string;
  restoreHref?: string;
  runHref?: string;
};

/** 02.08 Interrupted run and fork: the preserved checkpoint and a fork draft from it. */
export function InterruptedRunScreen({
  view,
  unavailable,
}: {
  view: InterruptedRunView;
  unavailable: string;
}) {
  const [name, setName] = useState(view.forkName);
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title={view.title}
        description="Your verified checkpoint and partial outputs are available."
      />
      {view.interruption ? (
        <Notice
          tone="warning"
          title={view.interruption.title}
          action={
            <LinkAction
              variant="outline"
              href={view.restoreHref}
              unavailable={unavailable}
            >
              Restore checkpoint
            </LinkAction>
          }
        >
          {view.interruption.detail}
        </Notice>
      ) : null}
      <div className={styles.enter}>
        <InlineDialog
          title="Fork this conversation"
          context="A new conversation will use the verified checkpoint and authorized files."
          closeHref={view.runHref}
          unavailable={unavailable}
        >
          <FormField
            label="New conversation name"
            value={name}
            onChange={setName}
          />
          <FormField label="Start from" value={view.startFrom} />
          <p className={panel.context}>
            Completed actions stay in the original conversation. The new run
            rechecks current permissions.
          </p>
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
              Create fork
            </button>
          </div>
        </InlineDialog>
      </div>
    </div>
  );
}
