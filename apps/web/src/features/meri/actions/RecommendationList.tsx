import { Button } from "@capiro/ui/button";
import type { RecommendationPage } from "./action-workflow-port";
import styles from "./workflow.module.css";

export function RecommendationList({
  page,
  selected,
  disabled,
  onSelect,
}: {
  page: RecommendationPage;
  selected: string | null;
  disabled: boolean;
  onSelect: (key: string) => void;
}) {
  return (
    <section className={styles.panel} aria-label="Returned recommendations">
      <h2>Recommendations</h2>
      {page.items.length === 0 && (
        <h3>No recommendations returned on this page</h3>
      )}
      <p className={styles.muted}>
        These recommendations are not accepted tasks.
      </p>
      {(page.coverageSummary ?? page.coverageNotes).length > 0 && (
        <div className={styles.notice} aria-label="Recommendation coverage">
          {(page.coverageSummary ?? page.coverageNotes).map((note, index) => (
            <p key={index}>{note}</p>
          ))}
        </div>
      )}
      {page.coverageSummary && page.coverageNotes.length > 0 && (
        <details className={styles.coverageDetails}>
          <summary>Coverage details</summary>
          {page.coverageNotes.map((note, index) => (
            <p key={index}>{note}</p>
          ))}
        </details>
      )}
      {page.items.length > 0 && (
        <ul className={styles.recommendations}>
          {page.items.map((item) => (
            <li key={item.key}>
              <article className={styles.recommendation}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <p className={styles.muted}>
                  Suggested due date: {item.dueDate ?? "Not supplied"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className={styles.button}
                  aria-pressed={selected === item.key}
                  disabled={disabled}
                  onClick={() => onSelect(item.key)}
                >
                  {selected === item.key ? "Selected" : "Select recommendation"}
                  <span className={styles.srOnly}>: {item.title}</span>
                </Button>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
