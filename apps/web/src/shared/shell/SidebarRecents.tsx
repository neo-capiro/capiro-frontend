import { Button } from "@capiro/ui/button";
import styles from "./shell.module.css";

const recents = [
  "Anduril meeting brief",
  "FY27 funding landscape",
  "Weekly client updates",
];

/** Recent conversations: synthetic titles in fixtures, an honest gap otherwise. */
export function SidebarRecents({ fixture }: { fixture: boolean }) {
  return (
    <section className={styles.recents} aria-labelledby="recent-label">
      <h2 id="recent-label">Recent</h2>
      {fixture ? (
        recents.map((title) => (
          <Button
            key={title}
            type="button"
            variant="ghost"
            className={styles.navButton}
            disabled
            title="Synthetic title; no conversation exists"
          >
            {title}
          </Button>
        ))
      ) : (
        <p>Recent conversations unavailable</p>
      )}
    </section>
  );
}
