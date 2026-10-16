"use client";
import { useState } from "react";
import { InlineDialog } from "../../ui/InlineDialog";
import { FormField } from "../../ui/FormField";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import panel from "../../ui/panel.module.css";
import styles from "./approvals.module.css";

/** Feedback on one immutable proposal: it closes or returns that revision and never edits it. */
export type RequestChangesView = {
  /** Proposal reference and kind, e.g. "FL-1042 · Pending artifact filing proposal". */
  context: string;
  requestedChange: string;
  /** What happens to the reviewed revision once feedback is sent. */
  guidance: string;
  submitLabel: string;
  closeHref?: string;
};

/** In-page "Request changes" dialog (06.02B, 06.07, 06.07A); the feedback is edited locally only. */
export function RequestChangesDialog({
  view,
  unavailable,
}: {
  view: RequestChangesView;
  unavailable: string;
}) {
  const [change, setChange] = useState(view.requestedChange);
  return (
    <InlineDialog
      title="Request changes"
      context={view.context}
      closeHref={view.closeHref}
      unavailable={unavailable}
    >
      <form
        className={styles.form}
        aria-label="Requested changes"
        onSubmit={(event) => event.preventDefault()}
      >
        <FormField
          label="What should change?"
          value={change}
          onChange={setChange}
          multiline
        />
        <p className={panel.context}>{view.guidance}</p>
        <div className={ui.row}>
          <LinkAction
            variant="outline"
            href={view.closeHref}
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
            {view.submitLabel}
          </button>
        </div>
      </form>
    </InlineDialog>
  );
}
