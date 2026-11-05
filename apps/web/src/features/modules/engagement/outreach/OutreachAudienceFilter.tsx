import { SelectInput } from "../../../../shared/module-ui";
import type { OutreachAudience } from "./outreach-audience-model";
import styles from "./outreach-overview.module.css";

export function OutreachAudienceNotice({ id }: { id?: string }) {
  return (
    <p id={id} className={styles.audienceNotice} role="status">
      Client and External filters are not available here yet. Use All to see
      outreach you can access. Ask a workspace administrator when audience
      filtering will be available.
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
  /** The containing filter panel can render this notice beside the audience selector. */
  noticeId?: string;
}) {
  return (
    <div
      className={styles.audienceFilter}
      role="group"
      aria-label="Outreach audience"
      aria-describedby={!supported ? noticeId : undefined}
    >
      <SelectInput
        id="outreach-audience"
        aria-label="Outreach audience"
        value={value}
        onValueChange={(next) => onChange(next as OutreachAudience)}
        options={[
          { value: "all", label: "All audiences" },
          { value: "to-clients", label: "Client", disabled: !supported },
          { value: "on-behalf", label: "External", disabled: !supported },
        ]}
      />
      {!supported && !noticeId && <OutreachAudienceNotice />}
    </div>
  );
}
