import type { ReactNode } from "react";
import { Button } from "@capiro/ui/button";
import { DesignIcon } from "../../../../shared/shell/DesignIcon";
import styles from "../../cited-answer.module.css";

/** 01.02 synthetic Meri answer body: citations open the sample sources; follow-ups fill the draft. */
export function CitedAnswerMessage({
  followUps,
  onShowSource,
  onChooseDraft,
  children,
}: {
  followUps: { brief: string; task: string };
  onShowSource: (id: "funding" | "task") => void;
  onChooseDraft: (draft: string) => void;
  /** Answer actions and the disclosed sources render after the body. */
  children: ReactNode;
}) {
  return (
    <article className={styles.answer} aria-label="Synthetic Meri answer">
      <div className={styles.identity}>
        <DesignIcon name="assistant-sparkle" assetSet="cited-answer" />
        <span>Meri</span>
      </div>
      <p>Three items need attention before your meeting.</p>
      <h2>1. Confirm the FY27 funding position</h2>
      <p>
        The latest authorized funding update provides the current public
        baseline. Confirm the client’s priorities before turning this into an
        outreach recommendation.
      </p>
      <Button
        type="button"
        variant="ghost"
        className={styles.citation}
        onClick={() => onShowSource("funding")}
        aria-label="Show sample source 1, Funding update"
      >
        <DesignIcon name="external" assetSet="cited-answer" />
        [1] Funding update
      </Button>
      <h2>2. Resolve the open commitment</h2>
      <p>
        The client task record shows a restoration request awaiting follow-up.{" "}
        <button
          type="button"
          className={styles.inlineCitation}
          onClick={() => onShowSource("task")}
          aria-label="Show sample source 2, Client task record"
        >
          [2]
        </button>
      </p>
      <CommitmentTable />
      <h2>3. Take a short, sourced brief</h2>
      <p>
        I can create a meeting brief from these sources, flag the missing
        attachment, and preserve links to the original records.
      </p>
      <div className={styles.followups} aria-label="Local draft suggestions">
        <Button
          type="button"
          variant="outline"
          onClick={() => onChooseDraft(followUps.brief)}
        >
          <DesignIcon name="files" assetSet="cited-answer" />
          Create meeting brief
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onChooseDraft(followUps.task)}
        >
          <DesignIcon name="plus-secondary" assetSet="cited-answer" />
          Draft a task
        </Button>
      </div>
      {children}
    </article>
  );
}

function CommitmentTable() {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table} aria-label="Sample open commitments">
        <colgroup>
          <col className={styles.itemColumn} />
          <col className={styles.statusColumn} />
          <col className={styles.nextColumn} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Status</th>
            <th scope="col">Next step</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Restoration request</td>
            <td>Open</td>
            <td>Confirm owner</td>
          </tr>
          <tr>
            <td>Client brief</td>
            <td>Due 10 Oct</td>
            <td>Review latest version</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
