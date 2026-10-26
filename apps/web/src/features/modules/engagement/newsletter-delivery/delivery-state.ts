import type {
  NewsletterOutreachRecord,
  NewsletterSendReadback,
} from "@capiro/shared/newsletter";

export function sendRequestSettled(send?: NewsletterSendReadback) {
  return (
    !send ||
    Boolean(
      send.intent &&
      ["complete", "partial", "failed", "canceled"].includes(
        send.intent.status,
      ) &&
      send.intent.deliveries.every((delivery) =>
        ["sent", "failed", "skipped"].includes(delivery.status),
      ),
    )
  );
}
export function deliveryLocked(
  record: NewsletterOutreachRecord,
  send?: NewsletterSendReadback,
) {
  return Boolean(
    record.status !== "draft" ||
    record.intentId ||
    (send?.intent && !send.intent.testMode) ||
    !sendRequestSettled(send),
  );
}
