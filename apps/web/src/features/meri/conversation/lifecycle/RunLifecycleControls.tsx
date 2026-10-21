import { Button } from "@capiro/ui/button";
import { lifecycleAvailability } from "../../../../shared/meri-conversation-lifecycle/availability";
import ui from "../../ui/meri-ui.module.css";
import styles from "../live.module.css";

/** Figma 450:88532 / 443:84112 / 443:84534. Held actions cannot claim continuation is ready. */
export function RunLifecycleControls() {
  return (
    <details>
      <summary>Pause and recovery</summary>
      <p className={styles.muted} id="meri-lifecycle-unavailable">
        {lifecycleAvailability.reason}
      </p>
      <div className={styles.statusRow}>
        {[
          "Pause",
          "Steer",
          "Resume from checkpoint",
          "Retry from checkpoint",
          "Fork conversation",
        ].map((label) => (
          <Button
            key={label}
            type="button"
            variant="outline"
            className={ui.outline}
            disabled
            aria-describedby="meri-lifecycle-unavailable"
            title={lifecycleAvailability.reason}
          >
            {label}
          </Button>
        ))}
      </div>
    </details>
  );
}
