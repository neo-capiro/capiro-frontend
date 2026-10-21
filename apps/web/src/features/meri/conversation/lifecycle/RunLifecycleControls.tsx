import { lifecycleAvailability } from "../../../../shared/meri-conversation-lifecycle/availability";
import styles from "../live.module.css";

/** Held lifecycle capabilities have one explanation and no inactive action inventory. */
export function RunLifecycleControls() {
  return (
    <details>
      <summary>Pause and recovery</summary>
      <p className={styles.muted}>{lifecycleAvailability.reason}</p>
    </details>
  );
}
