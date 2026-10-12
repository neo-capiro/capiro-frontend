import { Button } from "@capiro/ui/button";
import { DesignIcon } from "../../shared/shell/DesignIcon";
import { suggestions } from "./suggestions.mjs";
import styles from "./home.module.css";

export function MeriSuggestions({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <div className={styles.suggestions} aria-label="Draft suggestions">
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
      </div>
    </>
  );
}
