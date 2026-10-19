import type { ReactNode } from "react";
import { Panel } from "../../ui/Panel";
import ui from "../../ui/meri-ui.module.css";
import { ScopeTags } from "./ScopeTags";
import styles from "./screens.module.css";
import tooling from "./tooling.module.css";

/** Figma 3.4 "Task · …" frame: one exact task step with its state tag. */
export function TaskFrame({
  title,
  description,
  status,
  children,
}: {
  title: string;
  description: string;
  status?: string;
  children: ReactNode;
}) {
  return (
    <div className={ui.page}>
      <Panel label={title} narrow>
        <header className={styles.section}>
          <h1 className={styles.titleL}>{title}</h1>
          <p className={`${tooling.small} ${tooling.muted}`}>{description}</p>
        </header>
        {status ? <ScopeTags label="Task state" tags={[status]} /> : null}
        {children}
      </Panel>
    </div>
  );
}
