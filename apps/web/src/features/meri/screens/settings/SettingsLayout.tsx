import type { ReactNode } from "react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { SettingsCallout } from "./SettingsCallout";
import { SettingsNav } from "./SettingsNav";
import { SettingsToast } from "./SettingsToast";
import type {
  SettingsChrome,
  SettingsHeading,
  SettingsOutcome,
} from "./settings-view";
import styles from "./settings.module.css";

/** Figma 09.xx page frame: heading, Settings navigation, connection notice and two content columns. */
export function SettingsLayout({
  chrome,
  heading,
  primary,
  supporting,
  outcome,
}: {
  chrome: SettingsChrome;
  heading: SettingsHeading;
  primary: ReactNode;
  supporting: ReactNode;
  outcome?: SettingsOutcome | undefined;
}) {
  return (
    <div className={styles.page} data-embedded={chrome.embedded || undefined}>
      {chrome.embedded ? null : (
        <MeriPageHeading
          title={heading.title}
          description={heading.description}
        />
      )}
      <SettingsNav chrome={chrome} />
      <SettingsCallout notice={chrome.notice} />
      <div className={styles.columns}>
        <div className={styles.column}>{primary}</div>
        <div className={styles.column}>{supporting}</div>
      </div>
      {outcome ? <SettingsToast outcome={outcome} /> : null}
    </div>
  );
}
