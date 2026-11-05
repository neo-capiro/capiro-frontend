import type { FacilityRepresentation as Representation } from "./facility-map-contracts";
import styles from "./facility-map.module.css";

export function FacilityRepresentation({
  value,
}: {
  value: Representation | undefined;
}) {
  if (!value)
    return (
      <p className="muted">
        Representation is not available for this facility.
      </p>
    );
  if (value.unresolved)
    return (
      <p className="muted">
        {
          {
            no_state: "Add a state to resolve elected representation.",
            no_geocode:
              "Resolve or enter a district to find elected representation.",
            stale_boundary:
              "Office links need re-resolution for the serving boundary term.",
            needs_review:
              "Review the resolved physical point before assigning representation.",
            not_applicable:
              "US representation is not applicable for this international site.",
          }[value.reason]
        }
      </p>
    );
  const facts = [
    [
      "U.S. House",
      value.federal.house?.fullName ??
        "No matching member in the current roster",
    ],
    [
      "U.S. Senate",
      value.federal.senate.map((member) => member.fullName).join(" · ") ||
        "No matching members in the current roster",
    ],
    [
      "State House",
      value.stateOfficeTermStatus === "unverified"
        ? "Office term not verified"
        : (value.state.lower?.name ??
          "No matching legislator in the current roster"),
    ],
    [
      "State Senate",
      value.stateOfficeTermStatus === "unverified"
        ? "Office term not verified"
        : (value.state.upper?.name ??
          "No matching legislator in the current roster"),
    ],
  ];
  return (
    <div className="stack">
      <dl className={styles.facts}>
        {facts.map(([label, text]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
      {value.stateOfficeTermStatus === "unverified" && (
        <div role="note">
          <strong>State office term unverified</strong>
          <p className="muted">
            Current directory roles are context only; their terms have not been
            matched to this boundary.
          </p>
          {value.stateCurrentRole && (
            <p>
              {[
                value.stateCurrentRole.lower?.name,
                value.stateCurrentRole.upper?.name,
              ]
                .filter(Boolean)
                .join(" · ") || "No current directory role available."}
            </p>
          )}
        </div>
      )}
      {value.officeStatus === "unresolved_office" && (
        <p className="muted">
          No matching federal office is available for this serving term.
        </p>
      )}
    </div>
  );
}
