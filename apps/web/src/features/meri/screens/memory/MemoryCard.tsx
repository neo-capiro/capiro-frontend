import { Sparkle } from "lucide-react";
import { StatusPill, type StatusTone } from "../../ui/StatusPill";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import panel from "../../ui/panel.module.css";
import surfaces from "../../ui/surfaces.module.css";
import styles from "./memory.module.css";

export type MemoryItem = {
  id: string;
  title: string;
  meta: string;
  fact: string;
  status: { label: string; tone: StatusTone };
  /** Superseded memory kept as labeled history. */
  historical: boolean;
  /** Synthetic index terms standing in for server-side recall. */
  terms: readonly string[];
  evidenceHref?: string;
  correctionHref?: string;
};

/** One recalled memory: approval, ownership, the fact itself and its review actions. */
export function MemoryCard({
  item,
  unavailable,
}: {
  item: MemoryItem;
  unavailable: string;
}) {
  return (
    <article
      className={`${surfaces.card} ${styles.memoryCard}`}
      aria-labelledby={`memory-${item.id}`}
    >
      <h2 id={`memory-${item.id}`} className={surfaces.sectionTitle}>
        {item.title}
      </h2>
      <p className={surfaces.caption}>{item.meta}</p>
      <p className={panel.body}>{item.fact}</p>
      <div className={`${ui.row} ${surfaces.pillSlot}`}>
        <StatusPill tone={item.status.tone}>{item.status.label}</StatusPill>
        <LinkAction
          variant="outline"
          href={item.evidenceHref}
          unavailable={unavailable}
        >
          View evidence
        </LinkAction>
        <LinkAction
          variant="ghost"
          href={item.correctionHref}
          unavailable={unavailable}
        >
          <Sparkle aria-hidden fill="currentColor" /> Propose a correction
        </LinkAction>
      </div>
    </article>
  );
}
