import type { ReactNode } from "react";
import { safeEvidenceUrl, type ProfileSourceEvidence } from "./source-evidence";
import styles from "./profile-build.module.css";

export function ProfileSourceList<Evidence extends ProfileSourceEvidence>({
  evidence,
  details,
}: {
  evidence: readonly Evidence[];
  details?: (source: Evidence) => ReactNode;
}) {
  if (!evidence.length) return <p>No source evidence was supplied.</p>;
  return (
    <ul className={styles.sourceList} aria-label="Source evidence">
      {evidence.map((item, index) => {
        const href = safeEvidenceUrl(item.url);
        return (
          <li key={index}>
            <blockquote className={styles.source}>
              <p>
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer">
                    {item.label}
                  </a>
                ) : (
                  item.label
                )}
              </p>
              {item.excerpt && <p>{item.excerpt}</p>}
              {item.source && <cite>{item.source}</cite>}
              {item.observedAt && (
                <p>
                  Observed:{" "}
                  <time dateTime={item.observedAt}>{item.observedAt}</time>
                </p>
              )}
              {details?.(item)}
            </blockquote>
          </li>
        );
      })}
    </ul>
  );
}
