import styles from "./impact-tracker.module.css";

export const impactDirectionLabel = {
  positive: "Positive",
  negative: "Negative",
  mixed: "Mixed",
  uncertain: "Uncertain",
};

export function recordLabel(value: string) {
  const label = value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function billStatusLabel(value: string | null) {
  if (!value) return "Status unavailable";
  if (value === "passed_chamber") return "Passed one chamber";
  if (value === "committee") return "In committee";
  return recordLabel(value);
}

export function SourceRevision({ revision }: { revision: string }) {
  return (
    <details>
      <summary>Source revision</summary>
      <p className={styles.hash}>{revision}</p>
    </details>
  );
}

/** Preserve source fields and explicit unknowns while making structured facts readable. */
export function ClientFactValue({ value }: { value: string }) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return <p>{value}</p>;
  }
  return parsed && typeof parsed === "object" ? (
    <FactFields value={parsed} />
  ) : (
    <p>{value}</p>
  );
}

function FactFields({ value }: { value: unknown }) {
  if (value === null) return <span>Unknown</span>;
  if (Array.isArray(value))
    return value.length ? (
      <ul>
        {value.map((entry, index) => (
          <li key={index}>
            <FactFields value={entry} />
          </li>
        ))}
      </ul>
    ) : (
      <span>None recorded</span>
    );
  if (typeof value === "object")
    return (
      <dl className={styles.factFields}>
        {Object.entries(value).map(([key, entry]) => (
          <div key={key}>
            <dt>{recordLabel(key)}</dt>
            <dd>
              <FactFields value={entry} />
            </dd>
          </div>
        ))}
      </dl>
    );
  return (
    <span>
      {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
    </span>
  );
}
