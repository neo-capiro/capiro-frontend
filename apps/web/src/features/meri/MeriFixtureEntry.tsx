import { Button } from "@capiro/ui/button";
import styles from "./fixture.module.css";

export function MeriFixtureEntry() {
  return (
    <main className={styles.entry}>
      <p className={styles.eyebrow}>Capiro frontend foundation</p>
      <h1>Explore synthetic Meri screens.</h1>
      <p>
        These disconnected design fixtures use sample Jordan, Anduril,
        conversation titles, answer text, citations and approval counts. There
        is no signed-in session, client authorization, source data or chat
        service.
      </p>
      <p>
        You can edit local drafts, select suggestions, inspect sample citations
        and copy the sample answer. Sending and attachments remain unavailable.
        Nothing is persisted or submitted.
      </p>
      <div className={styles.links}>
        <Button asChild className={styles.open}>
          <a href="/meri">Open Meri Home</a>
        </Button>
        <Button asChild variant="outline" className={styles.openSecondary}>
          <a href="/meri/fixture/cited-answer">Open cited answer</a>
        </Button>
      </div>
      <p className={styles.note}>
        Portfolio, Modules and Settings use their separately governed service
        access. The Meri backend and its trusted contracts remain independently
        owned and deployed.
      </p>
    </main>
  );
}
