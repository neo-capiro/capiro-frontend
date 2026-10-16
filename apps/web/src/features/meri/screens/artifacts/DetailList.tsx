import { Check } from "lucide-react";
import type { DetailItem } from "./types";
import styles from "./artifacts.module.css";

/** Verified checks (with a check mark) or plain references, each a label with detail. */
export function DetailList({
  label,
  items,
  variant = "checks",
  tight = false,
}: {
  label: string;
  items: readonly DetailItem[];
  variant?: "checks" | "references";
  tight?: boolean;
}) {
  const checks = variant === "checks";
  return (
    <ul
      className={`${checks ? styles.checks : styles.refs} ${tight ? styles.tight : ""}`}
      aria-label={label}
    >
      {items.map((item) => (
        <li key={item.id} className={checks ? styles.check : undefined}>
          {checks ? <Check aria-hidden /> : null}
          <div>
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
