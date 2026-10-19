import ui from "../../ui/meri-ui.module.css";
import styles from "./settings.module.css";

/** Settings confirmation actions: the confirm action stays disabled in a fixture; Cancel closes. */
export function ConfirmActions({
  confirm,
  unavailable,
  onCancel,
}: {
  confirm: string;
  unavailable: string;
  onCancel: () => void;
}) {
  return (
    <div className={styles.stack}>
      <button type="button" className={ui.primary} disabled title={unavailable}>
        {confirm}
      </button>
      <button type="button" className={ui.outline} onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
