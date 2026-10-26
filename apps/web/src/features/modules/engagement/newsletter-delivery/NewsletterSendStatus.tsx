import type { NewsletterSendReadback } from "@capiro/shared/newsletter";
import { ActionButton, Badge } from "../../../../shared/module-ui";
import styles from "./newsletter-delivery.module.css";

export function NewsletterSendStatus({
  result,
  onRefresh,
  disabled,
}: {
  result: NewsletterSendReadback;
  onRefresh: () => void;
  disabled: boolean;
}) {
  const intent = result.intent;
  if (!intent)
    return (
      <section className={styles.card} role="status">
        <h2>Send outcome not confirmed</h2>
        <p>
          No result is visible for the retained request yet. This does not prove
          that sending did not start.
        </p>
        <p>Check status again. Do not resend this request.</p>
        <div>
          <ActionButton disabled={disabled} onClick={onRefresh}>
            Check status
          </ActionButton>
        </div>
      </section>
    );
  return (
    <section
      className={styles.card}
      aria-label={
        intent.testMode ? "Test delivery status" : "Newsletter delivery status"
      }
    >
      <h2>{intent.testMode ? "Test delivery" : "Newsletter delivery"}</h2>
      {intent.testMode && (
        <p>Client addresses and Cc/Bcc are excluded from this test.</p>
      )}
      <p className={styles.readonly}>Status: {intent.status}</p>
      {intent.testMode && (
        <div className={styles.stack}>
          {[
            ["Sent", "sent"],
            ["Failed", "failed"],
            ["Awaiting confirmation", "unknown"],
          ].map(([label, status]) => (
            <div className={styles.stack} key={status}>
              <span className={styles.label}>{label}</span>
              <p className={styles.readonly}>
                {
                  intent.deliveries.filter(
                    (delivery) => delivery.status === status,
                  ).length
                }
              </p>
            </div>
          ))}
        </div>
      )}
      <p>
        Acceptance or a queued status does not confirm delivery. Sent means the
        provider accepted that email.
      </p>
      {intent.error && <p role="alert">{intent.error}</p>}
      <ul className={styles.deliveries}>
        {intent.deliveries.map((delivery) => (
          <li key={delivery.id}>
            <Badge>{delivery.status}</Badge>
            <strong>
              {delivery.to.map((recipient) => recipient.email).join(", ")}
            </strong>
            {delivery.cc.length > 0 && <p>Cc: {delivery.cc.join(", ")}</p>}
            {delivery.bcc.length > 0 && <p>Bcc: {delivery.bcc.join(", ")}</p>}
            <p>
              {delivery.status === "unknown"
                ? "Awaiting confirmation. Do not resend this email."
                : delivery.errorMessage || delivery.subject}
            </p>
          </li>
        ))}
      </ul>
      <p className={styles.caption}>
        Content and destinations are fixed for this request. Refresh reads the
        same delivery status.
      </p>
      <div>
        <ActionButton disabled={disabled} onClick={onRefresh}>
          Check status
        </ActionButton>
      </div>
    </section>
  );
}
