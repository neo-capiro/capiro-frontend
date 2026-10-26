"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ActionButton } from "../../../shared/module-ui";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import { newsletterBackHref } from "./newsletter-route";
import type { NewsletterDestination as Destination } from "./newsletter-route";
import { NewsletterReceivingView } from "./newsletter-receiving/NewsletterReceivingView";
import { NewsletterDelivery } from "./newsletter-delivery/NewsletterDelivery";
import styles from "./engagement.module.css";

/** Route hints select a canonical read; opening a record requires a separate click. */
export function NewsletterDestination({
  destination,
  onBack,
}: {
  destination: Exclude<Destination, { kind: "none" }>;
  onBack?: () => void;
}) {
  const params = useSearchParams();
  const selected = useSelectedClient();
  const clientId =
    selected.state === "authorized-client" ? selected.client.id : undefined;
  const back = onBack ? (
    <ActionButton onClick={onBack}>Back to Outreach</ActionButton>
  ) : (
    <Link href={newsletterBackHref(params.get("clientId"))}>
      Back to Outreach
    </Link>
  );
  if (destination.kind === "invalid" || selected.state === "unavailable")
    return (
      <section role="alert" className={styles.screen}>
        <h1>Newsletter unavailable</h1>
        <p>This link or its current client scope could not be verified.</p>
        {back}
      </section>
    );
  if (selected.state === "loading")
    return <p role="status">Checking current client access…</p>;
  if (destination.kind === "record")
    return (
      <NewsletterDelivery
        key={JSON.stringify([destination, clientId])}
        recordId={destination.id}
        clientId={clientId}
        back={back}
      />
    );
  return (
    <NewsletterReceivingView
      key={JSON.stringify([destination, clientId])}
      destination={{ kind: "stage", id: destination.id }}
      clientId={clientId}
      back={back}
    />
  );
}
