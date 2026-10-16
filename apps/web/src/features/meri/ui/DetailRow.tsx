import type { ReactNode } from "react";
import styles from "./detail-row.module.css";

/** Icon, title and supporting line with an optional trailing control (Figma 3.4 list row). */
export function DetailRow({
  icon,
  title,
  detail,
  state,
  as: Element = "div",
  children,
}: {
  icon: ReactNode;
  title: string;
  detail?: string | undefined;
  /** Screen-reader state conveyed visually by the icon. */
  state?: string | undefined;
  as?: "div" | "li";
  children?: ReactNode;
}) {
  return (
    <Element className={styles.detailRow}>
      <span className={styles.rowIcon} aria-hidden>
        {icon}
      </span>
      <span className={styles.rowCopy} data-slot="detail-row-copy">
        <span className={styles.rowTitle}>
          {state ? <span className="sr-only">{state}: </span> : null}
          {title}
        </span>
        {detail ? <span className={styles.rowDetail}>{detail}</span> : null}
      </span>
      {children}
    </Element>
  );
}
