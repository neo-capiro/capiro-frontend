import { useId } from "react";
import Link from "next/link";
import { Sparkle } from "lucide-react";
import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import surfaces from "../../ui/surfaces.module.css";
import styles from "./memory-search-empty.module.css";

/**
 * 05.04C "State · No matching history": a zero-result search of one memory
 * view. It never proves absence; Clear search restores the view's records and
 * the current view stays one link away.
 */
export function MemorySearchEmpty({
  title,
  scope,
  records,
  query,
  currentHref,
  onClear,
}: {
  title: string;
  /** Searched view and client, e.g. "History · Anduril". */
  scope: string;
  /** What returned nothing, e.g. "No superseded records … match this search." */
  records: string;
  query: string;
  /** Link back to current memory; omitted when current memory was searched. */
  currentHref?: string | undefined;
  onClear: () => void;
}) {
  const titleId = useId();
  return (
    <section className={styles.state} aria-labelledby={titleId}>
      <h2 id={titleId} className={surfaces.sectionTitle}>
        {title}
      </h2>
      <p className={surfaces.caption}>
        {scope} · Search “{query.trim()}”
      </p>
      <p className={styles.body}>
        {records} This does not prove that no such record exists; access, scope
        and retention rules still apply.
      </p>
      <div className={ui.row}>
        <span className={styles.status}>
          <StatusPill>No matches</StatusPill>
        </span>
        <button type="button" className={ui.outline} onClick={onClear}>
          Clear search
        </button>
        {currentHref ? (
          <Link className={ui.ghost} href={currentHref}>
            <Sparkle aria-hidden /> Open current memory
          </Link>
        ) : null}
      </div>
    </section>
  );
}
