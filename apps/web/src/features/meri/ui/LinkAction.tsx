import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./meri-ui.module.css";

/** Navigation action that renders as an explained disabled control until its destination exists. */
export function LinkAction({
  href,
  variant,
  unavailable,
  children,
}: {
  href?: string | undefined;
  variant: "primary" | "outline" | "ghost";
  unavailable: string;
  children: ReactNode;
}) {
  return href ? (
    <Link className={styles[variant]} href={href}>
      {children}
    </Link>
  ) : (
    <button
      type="button"
      className={styles[variant]}
      disabled
      title={unavailable}
    >
      {children}
    </button>
  );
}
