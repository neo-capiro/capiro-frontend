import type { ReviewAction } from "./actions";
import styles from "./profile-build.module.css";
type Props = {
  action: ReviewAction;
  pending: boolean;
  busy: boolean;
  canRead: boolean;
  canEdit: boolean;
  onBack: () => void;
  onConfirm: () => void;
};
export function ReviewConfirmation({
  action,
  pending,
  busy,
  canRead,
  canEdit,
  onBack,
  onConfirm,
}: Props) {
  return (
    <section
      className={styles.confirm}
      role="region"
      aria-label="Confirm review action"
    >
      <h3>
        {action.kind === "apply"
          ? `Apply ${action.findingIds.length} selected findings?`
          : action.kind === "cancel"
            ? "Cancel this run?"
            : action.kind === "assign"
              ? "Apply finding and assign matter?"
              : action.kind === "reject"
                ? action.automatic
                  ? "Mark this fact not right?"
                  : "Ignore this finding?"
                : "Restore this finding?"}
      </h3>
      <p>
        {action.kind === "cancel"
          ? "Cancellation stops remaining work. It does not undo changes already saved."
          : action.kind === "reject" && action.automatic
            ? "This records the rejection and removes the automatic value only if it is still current. Your later edits stay saved."
            : "This changes the saved client review immediately. The service rechecks pending findings; a group apply can partially succeed."}
      </p>
      <div className="row">
        <button className="button" disabled={pending} onClick={onBack}>
          Back to review
        </button>
        <button
          className="button primary"
          disabled={busy || (!canEdit && action.kind !== "cancel") || !canRead}
          onClick={onConfirm}
        >
          Confirm {action.kind}
        </button>
      </div>
    </section>
  );
}
