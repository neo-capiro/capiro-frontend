import type { ReactNode } from "react";
import { Check } from "lucide-react";
import styles from "./status-toast.module.css";

/** Figma 3.4 Sonner-pattern outcome toast; the caller owns visibility and its action. */
export function StatusToast({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action: ReactNode;
}) {
  return (
    <section className={styles.toast} role="status" aria-label={title}>
      <span className={styles.icon} aria-hidden>
        <Check />
      </span>
      <div className={styles.content}>
        <h2>{title}</h2>
        <p>{children}</p>
        {action}
      </div>
    </section>
  );
}
