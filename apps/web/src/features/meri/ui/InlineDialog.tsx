import type { ReactNode } from "react";
import { X } from "lucide-react";
import { LinkAction } from "./LinkAction";
import { Panel } from "./Panel";
import styles from "./panel.module.css";

/** Full-page Figma dialog frame rendered in the page flow, with a close route back to its origin. */
export function InlineDialog({
  title,
  context,
  closeHref,
  unavailable,
  children,
}: {
  title: string;
  context: string;
  closeHref?: string | undefined;
  unavailable: string;
  children: ReactNode;
}) {
  return (
    <Panel label={title} raised>
      <div className={styles.dialogHeading}>
        <h2 className={styles.title}>{title}</h2>
        <LinkAction variant="ghost" href={closeHref} unavailable={unavailable}>
          <X aria-hidden />
          <span className="sr-only">Close {title}</span>
        </LinkAction>
      </div>
      <p className={styles.context}>{context}</p>
      {children}
    </Panel>
  );
}
