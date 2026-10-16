import { LinkAction } from "../../ui/LinkAction";
import styles from "./tooling.module.css";

export type ArtifactFormatView = {
  format: string;
  title: string;
  description: string;
  exampleHref?: string | undefined;
};

/** Meri/Artifact format card: a native artifact type and its read-only example. */
export function ArtifactFormatCard({
  card,
  unavailable,
}: {
  card: ArtifactFormatView;
  unavailable: string;
}) {
  return (
    <article
      className={styles.formatCard}
      aria-label={`${card.format} ${card.title}`}
    >
      <p className={styles.mono}>{card.format}</p>
      <h2 className={styles.boxTitle}>{card.title}</h2>
      <p className={styles.small}>{card.description}</p>
      <LinkAction
        variant="outline"
        href={card.exampleHref}
        unavailable={unavailable}
      >
        Open example<span className="sr-only">: {card.title}</span>
      </LinkAction>
    </article>
  );
}
