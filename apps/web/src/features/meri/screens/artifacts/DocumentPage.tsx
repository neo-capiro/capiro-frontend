import { Fragment, type ReactNode } from "react";
import { Check } from "lucide-react";
import type { DocumentBlock } from "./types";
import styles from "./document.module.css";

const textClass = {
  eyebrow: styles.blockEyebrow,
  title: styles.blockTitle,
  byline: styles.blockByline,
  heading: styles.blockHeading,
  paragraph: styles.blockParagraph,
  subheading: styles.blockSubheading,
  note: styles.blockNote,
  sources: styles.blockSources,
  footer: styles.blockFooter,
} as const;

function Block({ block }: { block: DocumentBlock }) {
  switch (block.kind) {
    case "divider":
      return <hr className={styles.blockDivider} />;
    case "check":
      return (
        <div className={styles.blockCheck}>
          <Check aria-hidden />
          <div>
            <strong>{block.title}</strong>
            <span>{block.detail}</span>
          </div>
        </div>
      );
    case "title":
      return <h2 className={textClass.title}>{block.text}</h2>;
    case "heading":
      return <h3 className={textClass.heading}>{block.text}</h3>;
    case "subheading":
      return <h4 className={textClass.subheading}>{block.text}</h4>;
    default:
      return <p className={textClass[block.kind]}>{block.text}</p>;
  }
}

/** Read-only rendering of one synthetic document page (Word editorial or PDF sans). */
export function DocumentPage({
  label,
  blocks,
  variant,
  className = "",
  zoom = 100,
  insertAfter,
}: {
  label: string;
  blocks: readonly DocumentBlock[];
  variant: "editorial" | "sans";
  className?: string;
  zoom?: number;
  /** In-flow content (such as Meri's suggested revision) shown after one block. */
  insertAfter?: { index: number; node: ReactNode } | undefined;
}) {
  return (
    <article
      className={`${styles.page} ${styles[variant]} ${className}`}
      aria-label={label}
      tabIndex={0}
      style={zoom === 100 ? undefined : { zoom: zoom / 100 }}
    >
      {blocks.map((block, index) => (
        <Fragment key={index}>
          <Block block={block} />
          {insertAfter?.index === index ? insertAfter.node : null}
        </Fragment>
      ))}
    </article>
  );
}
