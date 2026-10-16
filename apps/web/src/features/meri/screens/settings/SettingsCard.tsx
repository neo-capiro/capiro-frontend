import type { ReactNode } from "react";
import { Panel } from "../../ui/Panel";
import panel from "../../ui/panel.module.css";
import surfaces from "../../ui/surfaces.module.css";
import ui from "../../ui/meri-ui.module.css";
import styles from "./settings.module.css";

/** Figma "Preferences card": titled Panel with an optional muted description. */
export function SettingsCard({
  title,
  description,
  emphasis = false,
  children,
}: {
  title: string;
  description?: string | undefined;
  /** Body-size (14px) description instead of the small caption. */
  emphasis?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={styles.card}>
      <Panel label={title}>
        <h2 className={surfaces.largeTitle}>{title}</h2>
        {description ? (
          <p className={emphasis ? panel.context : ui.muted}>{description}</p>
        ) : null}
        {children}
      </Panel>
    </div>
  );
}
