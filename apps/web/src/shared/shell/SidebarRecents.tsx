import { Button } from "@capiro/ui/button";
import { unavailableResources } from "../meri-resources/unavailable";
import styles from "./shell.module.css";
import { ConversationRecents } from "./ConversationRecents";

/** Synthetic recent conversation titles, shared by the sidebar and the phone menu. */
export const recents = [
  "Anduril meeting brief",
  "FY27 funding landscape",
  "Weekly client updates",
];

/** Fixture sample titles remain separate from explicitly enabled, admitted real recents. */
export function SidebarRecents({
  fixture,
  enabled = false,
}: {
  fixture: boolean;
  enabled?: boolean;
}) {
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
      ) : enabled ? (
        <ConversationRecents enabled={enabled} className={styles.navButton} />
      ) : (
        <p title={unavailableResources.conversationList.missing}>
          Recent conversations unavailable
        </p>
      )}
    </section>
  );
}
