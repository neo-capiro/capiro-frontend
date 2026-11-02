import type { ReactNode } from "react";
import styles from "./meri-ui.module.css";

/** Inner-page heading: title, one-line context and optional page-level action.
 * A second section on the same route uses `level={2}` so the page keeps one H1. */
export function MeriPageHeading({
  title,
  description,
  action,
  level = 1,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  level?: 1 | 2;
}) {
  const Title = level === 1 ? "h1" : "h2";
  return (
    <header className={styles.heading}>
      <div className={styles.headingCopy}>
        <Title>{title}</Title>
        <p>{description}</p>
      </div>
      <div className={styles.headingAside}>
        {action ? (
          <>
            {action}
            <span className={styles.actionDivider} aria-hidden="true" />
          </>
        ) : null}
        <span className={styles.wordmark} role="img" aria-label="Meri" />
      </div>
    </header>
  );
}
