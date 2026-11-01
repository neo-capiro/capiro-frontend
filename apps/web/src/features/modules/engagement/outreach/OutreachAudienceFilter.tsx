import { ActionButton } from "../../../../shared/module-ui";
import type { OutreachAudience } from "./outreach-audience-model";

export function OutreachAudienceFilter({
  value,
  supported,
  onChange,
}: {
  value: OutreachAudience;
  supported: boolean;
  onChange: (value: OutreachAudience) => void;
}) {
  return (
    <div role="group" aria-label="Outreach audience">
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
      {!supported && (
        <p role="status">
          Audience filtering is awaiting the Core update. All audiences remain
          available.
        </p>
      )}
    </div>
  );
}
