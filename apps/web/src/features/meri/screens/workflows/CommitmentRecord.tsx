import { LinkAction } from "../../ui/LinkAction";
import styles from "./tooling.module.css";

export type CommitmentView = {
  promise: string;
  source: string;
  owner: string;
  due: string;
  status: string;
  tracking: string;
  evidenceHref?: string | undefined;
  /** Present only for promises with no tracked task in the checked sources. */
  draftTaskHref?: string | undefined;
  needsTask: boolean;
};

/** Meri/Commitment record: evidence-backed promise; unknown owner and date stay unknown. */
export function CommitmentRecord({
  record,
  unavailable,
}: {
  record: CommitmentView;
  unavailable: string;
}) {
  return (
    <li className={styles.commitment}>
      <div className={styles.commitmentPromise}>
        <strong>{record.promise}</strong>
        <span>{record.source}</span>
      </div>
      <div className={styles.commitmentOwner}>
        <p>{record.owner}</p>
        <span>{record.due}</span>
      </div>
      <div className={styles.commitmentStatus}>
        <strong>{record.status}</strong>
        <span>{record.tracking}</span>
      </div>
      <div className={styles.commitmentActions}>
        <LinkAction
          variant="ghost"
          href={record.evidenceHref}
          unavailable={unavailable}
        >
          Evidence<span className="sr-only"> for {record.promise}</span>
        </LinkAction>
        {record.needsTask ? (
          <LinkAction
            variant="outline"
            href={record.draftTaskHref}
            unavailable={unavailable}
          >
            Draft task<span className="sr-only"> for {record.promise}</span>
          </LinkAction>
        ) : null}
      </div>
    </li>
  );
}
