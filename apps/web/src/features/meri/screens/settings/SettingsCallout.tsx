import type { SettingsNotice } from "./settings-view";
import styles from "./settings.module.css";

/**
 * Figma 09.xx "Notice · …" callout (14px padding, 10px radius, no border). Settings callouts
 * describe policy and designed states, so they are notes, never live alerts.
 */
export function SettingsCallout({ notice }: { notice: SettingsNotice }) {
  return (
    <div
      className={styles.callout}
      data-tone={notice.tone ?? "neutral"}
      role="note"
      aria-label={notice.title}
    >
      <p className={styles.calloutTitle}>{notice.title}</p>
      <p className={styles.calloutDetail}>{notice.detail}</p>
    </div>
  );
}
