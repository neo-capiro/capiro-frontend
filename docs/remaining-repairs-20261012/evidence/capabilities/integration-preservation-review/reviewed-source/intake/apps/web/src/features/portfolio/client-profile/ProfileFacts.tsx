import styles from "./profile-details.module.css";

export function ProfileFacts({
  rows,
}: {
  rows: readonly (readonly [string, string | readonly string[]])[];
}) {
  return (
    <dl className={styles.facts}>
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            {Array.isArray(value) ? (
              value.length ? (
                <span className={styles.tags}>
                  {value.map((item, index) => (
                    <span key={`${index}:${item}`}>{item}</span>
                  ))}
                </span>
              ) : (
                <span className="muted">Not provided</span>
              )
            ) : typeof value === "string" && value.trim() ? (
              value
            ) : (
              <span className="muted">Not provided</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
