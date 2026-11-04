import { useId, type ReactNode } from "react";
import styles from "./profile-build.module.css";

/** Figma 3.4 onboarding card shell; the caller supplies real state and controls. */
export function ProfileBuildCard({
  state,
  title,
  description,
  children,
  actions,
}: {
  state: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const titleId = useId();
  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <p className={styles.eyebrow}>{state}</p>
      <h3 className={styles.title} id={titleId}>
        {title}
      </h3>
      {description && <div className={styles.description}>{description}</div>}
      {children && <div className={styles.evidence}>{children}</div>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </section>
  );
}
