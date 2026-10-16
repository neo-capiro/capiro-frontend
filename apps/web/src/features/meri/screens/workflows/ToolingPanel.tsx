import { ActionRow } from "./ActionRow";
import type { ActionSpec } from "./types";
import styles from "./tooling.module.css";

/**
 * Meri/Evidence comparison and the other bordered tooling boxes: title, dated
 * statements, provenance captions and an optional action.
 */
export type ToolingPanelView = {
  title: string;
  eyebrow?: string;
  lines?: readonly string[];
  /** Muted explanatory paragraph. */
  summary?: string;
  /** Exact record locator shown in Geist Mono. */
  locator?: string;
  captions?: readonly string[];
  actions?: readonly ActionSpec[];
};

export function ToolingPanel({
  panel,
  tone = "card",
  body = "small",
  unavailable,
}: {
  panel: ToolingPanelView;
  tone?: "card" | "muted";
  /** Evidence statements use body text; summaries use small text. */
  body?: "large" | "small";
  unavailable: string;
}) {
  return (
    <section
      className={styles.box}
      data-tone={tone}
      data-body={body}
      aria-label={panel.title}
    >
      {panel.eyebrow ? <p className={styles.caption}>{panel.eyebrow}</p> : null}
      <h2 className={styles.boxTitle}>{panel.title}</h2>
      {panel.lines?.length ? (
        <div className={styles.lines}>
          {panel.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}
      {panel.summary ? (
        <p className={`${styles.small} ${styles.muted}`}>{panel.summary}</p>
      ) : null}
      {panel.locator ? <p className={styles.mono}>{panel.locator}</p> : null}
      {panel.captions?.map((caption) => (
        <p key={caption} className={styles.caption}>
          {caption}
        </p>
      ))}
      {panel.actions?.length ? (
        <ActionRow
          label={`${panel.title} actions`}
          actions={panel.actions}
          unavailable={unavailable}
        />
      ) : null}
    </section>
  );
}
