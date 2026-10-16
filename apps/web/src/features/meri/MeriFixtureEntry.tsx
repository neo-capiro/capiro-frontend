import { Button } from "@capiro/ui/button";
import styles from "./fixture.module.css";
import Link from "next/link";

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
          <Link href="/meri/fixture/home">Open Meri Home fixture</Link>
        </Button>
        <Button asChild variant="outline" className={styles.openSecondary}>
          <Link href="/meri/fixture/cited-answer">Open cited answer</Link>
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
