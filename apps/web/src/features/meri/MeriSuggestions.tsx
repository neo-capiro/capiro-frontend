import Link from "next/link";
import { Button } from "@capiro/ui/button";
import { DesignIcon } from "../../shared/shell/DesignIcon";
import { suggestions } from "./suggestions.mjs";
import styles from "./home.module.css";

/**
 * Local draft suggestions. "Browse workflows" opens the workflow library only
 * when a caller supplies its destination; otherwise it stays an explained
 * disabled control.
 */
export function MeriSuggestions({
  onSelect,
  browseHref,
}: {
  onSelect: (id: string) => void;
  browseHref?: string | undefined;
}) {
  return (
    <>
      <div
        className={styles.suggestions}
        role="group"
        aria-label="Draft suggestions"
      >
        {suggestions.slice(0, 3).map((item) => (
          <section key={item.id} className={styles.card}>
            <div className={styles.cardTopRow}>
              <span className={styles.sparkleSlot}>
                <DesignIcon name="sparkle" />
              </span>
              <Button
                type="button"
                variant="ghost"
                className={styles.start}
                aria-label={`Start ${item.title.toLowerCase()} draft`}
                onClick={() => onSelect(item.id)}
              >
                Start
              </Button>
            </div>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </section>
        ))}
      </div>
      <div className={styles.moreSuggestions}>
        {suggestions.slice(3).map((item) => (
          <Button
            key={item.id}
            type="button"
            variant="ghost"
            className={styles.start}
            onClick={() => onSelect(item.id)}
          >
            {item.title}
          </Button>
        ))}
        {browseHref ? (
          <Button asChild variant="ghost" className={styles.start}>
            <Link href={browseHref}>Browse workflows</Link>
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              className={styles.start}
              disabled
              aria-describedby="workflow-library-unavailable"
              title="Workflow library is not implemented in this disconnected fixture"
            >
              Browse workflows
            </Button>
            <span id="workflow-library-unavailable" className="sr-only">
              Workflow library is not implemented in this disconnected fixture.
            </span>
          </>
        )}
      </div>
    </>
  );
}
