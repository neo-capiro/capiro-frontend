"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  PageHeader,
  Panel,
  UnavailableAction,
  ActionButton,
} from "../../../shared/module-ui";
import { newsletterBackHref } from "./newsletter-route";
import type { NewsletterDestination as Destination } from "./newsletter-route";
import styles from "./engagement.module.css";

/** No read/write is admitted before the dedicated rich receiving contract exists. */
export function NewsletterDestination({
  destination,
  onBack,
}: {
  destination: Exclude<Destination, { kind: "none" }>;
  onBack?: () => void;
}) {
  const params = useSearchParams();
  const back = onBack ? (
    <ActionButton onClick={onBack}>Back to Outreach</ActionButton>
  ) : (
    <Link href={newsletterBackHref(params.get("clientId"))}>
      Back to Outreach
    </Link>
  );
  if (destination.kind === "invalid")
    return (
      <section role="alert" className={styles.screen}>
        <h1>Newsletter unavailable</h1>
        <p>This link contains invalid or conflicting newsletter references.</p>
        {back}
      </section>
    );
  return (
    <section className={styles.screen}>
      <PageHeader
        title="Rich newsletter"
        description="This link targets the rich newsletter workflow."
      />
      <Panel title="Rich newsletter unavailable">
        <p>
          The rich newsletter editor is not available here yet. Your saved
          content has not been changed.
        </p>
        <UnavailableAction reason="Open and review the rich newsletter before preparing delivery.">
          Prepare delivery
        </UnavailableAction>
        {back}
      </Panel>
    </section>
  );
}
