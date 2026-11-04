import { ActionButton } from "../../../../shared/module-ui";
import type { OutreachAudience } from "./outreach-audience-model";
import styles from "./outreach-overview.module.css";

export function OutreachAudienceNotice({ id }: { id?: string }) {
  return (
    <p id={id} className={styles.audienceNotice} role="status">
      Audience filtering is awaiting the Core update. All audiences remain
      available.
    </p>
  );
}

export function OutreachAudienceFilter({
  value,
  supported,
  onChange,
  noticeId,
}: {
  value: OutreachAudience;
  supported: boolean;
  onChange: (value: OutreachAudience) => void;
  /** A containing toolbar can render the same notice outside the compact button group. */
  noticeId?: string;
}) {
  return (
    <div
      className={styles.audienceFilter}
      role="group"
      aria-label="Outreach audience"
      aria-describedby={!supported ? noticeId : undefined}
    >
      {(
        [
          ["all", "All"],
          ["to-clients", "Client"],
          ["on-behalf", "External"],
        ] as const
      ).map(([id, label]) => (
        <ActionButton
          key={id}
          aria-pressed={value === id}
          disabled={id !== "all" && !supported}
          onClick={() => onChange(id)}
        >
          {label}
        </ActionButton>
      ))}
      {!supported && !noticeId && <OutreachAudienceNotice />}
    </div>
  );
}
