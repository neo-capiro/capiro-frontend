import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import styles from "./tooling.module.css";

export type ArtifactVerificationView = {
  format: string;
  title: string;
  version: string;
  problem: string;
  preserved: string;
  checksHref?: string | undefined;
  reviseHref?: string | undefined;
};

/** Meri/Artifact verification card: a failed gate keeps the last verified version; download stays blocked. */
export function ArtifactVerificationCard({
  card,
  unavailable,
}: {
  card: ArtifactVerificationView;
  unavailable: string;
}) {
  return (
    <section
      className={styles.verification}
      aria-label={`${card.format}: ${card.title}`}
    >
      <p className={styles.mono}>{card.format}</p>
      <h2 className={styles.boxTitle}>{card.title}</h2>
      <p className={styles.small}>{card.version}</p>
      <p className={`${styles.small} ${styles.muted}`}>{card.problem}</p>
      <p className={styles.caption}>{card.preserved}</p>
      <div
        className={ui.row}
        role="group"
        aria-label={`${card.format} recovery`}
      >
        <LinkAction
          variant="outline"
          href={card.checksHref}
          unavailable={unavailable}
        >
          View checks
        </LinkAction>
        <LinkAction
          variant="outline"
          href={card.reviseHref}
          unavailable={unavailable}
        >
          Revise with Meri
        </LinkAction>
        <button
          type="button"
          className={`${ui.ghost} ${styles.blocked}`}
          disabled
          title="Download stays blocked until this version passes verification."
        >
          Download blocked
        </button>
      </div>
    </section>
  );
}
