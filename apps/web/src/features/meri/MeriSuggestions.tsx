import type { FocusEvent } from "react";
import { Button } from "@capiro/ui/button";
import { DesignIcon } from "../../shared/shell/DesignIcon";
import { suggestions } from "./suggestions.mjs";
import styles from "./home.module.css";

export function MeriSuggestions({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const reveal = (event: FocusEvent<HTMLButtonElement>) => {
    event.currentTarget.scrollIntoView({ block: "nearest", inline: "center" });
  };
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
                onFocus={reveal}
                onClick={() => onSelect(item.id)}
              >
                Start
              </Button>
            </div>
            <h2>{item.title}</h2>
            <p>
              <span className={styles.desktopOnly}>{item.description}</span>
              <span className={styles.phoneOnly}>
                {item.id === "research"
                  ? "Find sourced answers"
                  : item.id === "brief"
                    ? "Build a verified file"
                    : item.description}
              </span>
            </p>
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
            onFocus={reveal}
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
