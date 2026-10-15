import type { ReactNode } from "react";
import styles from "./meri-ui.module.css";

/** Inner-page heading: title, one-line context and optional page-level action. */
export function MeriPageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className={styles.heading}>
      <div className={styles.headingCopy}>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className={styles.headingAside}>
        {action}
        <span className={styles.wordmark} role="img" aria-label="Meri" />
      </div>
    </header>
  );
}
