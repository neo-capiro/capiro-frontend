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
  /** compact: the narrower Figma status slot used by superseded history. */
  status: { label: string; tone: StatusTone; compact?: boolean };
  /** Synthetic index terms standing in for server-side recall. */
  terms: readonly string[];
  /** Evidence or receipt for the record; disabled when it has no destination. */
  evidence: { label: string; href?: string | undefined };
  /** Present when the record can receive a correction proposal. */
  correction?: { href?: string | undefined };
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
      <div
        className={`${ui.row} ${surfaces.pillSlot} ${
          item.status.compact ? styles.compactSlot : ""
        }`}
      >
        <StatusPill tone={item.status.tone}>{item.status.label}</StatusPill>
        <LinkAction
          variant="outline"
          href={item.evidence.href}
          unavailable={unavailable}
        >
          {item.evidence.label}
        </LinkAction>
        {item.correction ? (
          <LinkAction
            variant="ghost"
            href={item.correction.href}
            unavailable={unavailable}
          >
            <Sparkle aria-hidden fill="currentColor" /> Propose a correction
          </LinkAction>
        ) : null}
      </div>
    </article>
  );
}
