"use client";
import Link from "next/link";
import {
  PageHeader,
  Panel,
  UnavailableAction,
} from "../../../shared/module-ui";
import type { NewsletterDestination as Destination } from "./newsletter-route";
import styles from "./engagement.module.css";

/** No read/write is admitted before the dedicated rich receiving contract exists. */
export function NewsletterDestination({
  destination,
}: {
  destination: Exclude<Destination, { kind: "none" }>;
}) {
  if (destination.kind === "invalid")
    return (
      <section role="alert" className={styles.screen}>
        <h1>Newsletter unavailable</h1>
        <p>This link contains invalid or conflicting newsletter references.</p>
        <Link href="/modules/engagement?view=outreach">Back to Outreach</Link>
      </section>
    );
  return (
    <section className={styles.screen}>
      <PageHeader
        title="Rich newsletter"
        description="Your saved newsletter uses the rich newsletter workflow."
      />
      <Panel title="Rich newsletter unavailable">
        <p>
          The rich newsletter editor is not available here yet. Your saved
          content has not been changed.
        </p>
        <UnavailableAction reason="Open and review the rich newsletter before preparing delivery.">
          Prepare delivery
        </UnavailableAction>
        <Link href="/modules/engagement?view=outreach">Back to Outreach</Link>
      </Panel>
    </section>
  );
}
