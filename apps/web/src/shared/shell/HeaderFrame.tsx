import type { ReactNode } from "react";
import styles from "./header-frame.module.css";

/** Shared header geometry; each product owns its navigation and session actions. */
export function HeaderFrame({
  brand,
  modes,
  actions,
  leading,
  className = "",
}: {
  brand: ReactNode;
  modes: ReactNode;
  actions: ReactNode;
  leading?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`${styles.header} ${className}`}>
      {leading}
      {brand}
      {modes}
      {actions}
    </header>
  );
}
