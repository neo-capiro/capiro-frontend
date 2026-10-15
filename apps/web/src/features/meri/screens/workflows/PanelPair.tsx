import { ToolingPanel, type ToolingPanelView } from "./ToolingPanel";
import styles from "./tooling.module.css";

/** Two (or more) tooling boxes side by side, stacking on narrow screens. */
export function PanelPair({
  label,
  panels,
  tone = "card",
  body = "small",
  unavailable,
}: {
  label: string;
  panels: readonly ToolingPanelView[];
  tone?: "card" | "muted";
  body?: "large" | "small";
  unavailable: string;
}) {
  return (
    <div className={styles.pair} role="group" aria-label={label}>
      {panels.map((panel) => (
        <ToolingPanel
          key={panel.title}
          panel={panel}
          tone={tone}
          body={body}
          unavailable={unavailable}
        />
      ))}
    </div>
  );
}
