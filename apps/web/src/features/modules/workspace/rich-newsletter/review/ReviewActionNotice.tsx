import { ActionButton } from "../../../../../shared/module-ui";
import type { ReviewActions } from "./use-review-actions";
import styles from "./newsletter-collaboration.module.css";

export function ReviewActionNotice({ actions }: { actions: ReviewActions }) {
  return actions.notice ? (
    <div className={styles.notice} role={actions.unknown ? "alert" : "status"}>
      <p>{actions.notice}</p>
      {actions.unknown && actions.recovery && (
        <ActionButton disabled={actions.pending} onClick={actions.recovery}>
          Recover original invitation request
        </ActionButton>
      )}
    </div>
  ) : null;
}
