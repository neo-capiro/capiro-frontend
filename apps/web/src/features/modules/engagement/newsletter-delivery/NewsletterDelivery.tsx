"use client";
import { useState, type ReactNode } from "react";
import {
  ActionButton,
  PageHeader,
  StatusPanel,
} from "../../../../shared/module-ui";
import { useNewsletterDelivery } from "./useNewsletterDelivery";
import { NewsletterDestinations } from "./NewsletterDestinations";
import { NewsletterPrepared } from "./NewsletterPrepared";
import { NewsletterSendStatus } from "./NewsletterSendStatus";
import { deliveryLocked } from "./delivery-state";
import { sameUuid } from "./delivery-api";
import styles from "./newsletter-delivery.module.css";

export function NewsletterDelivery({
  recordId,
  clientId,
  back,
}: {
  recordId: string;
  clientId?: string;
  back: ReactNode;
}) {
  const receiver = useNewsletterDelivery(recordId, clientId);
  const [step, setStep] = useState<
    "destinations" | "preview" | "test" | "send"
  >();
  const loaded = receiver.loaded;
  const record = loaded?.record;
  const mailbox = loaded?.mailboxes.find(
    (row) =>
      record?.senderConnectionId && sameUuid(row.id, record.senderConnectionId),
  );
  const busy = Boolean(receiver.write?.pending);
  const locked = Boolean(record && deliveryLocked(record, loaded?.send));
  const display =
    step ??
    (loaded?.send?.intent?.testMode
      ? "test"
      : record?.versions.length
        ? "preview"
        : "destinations");
  const canSend = Boolean(
    record?.versions.length &&
    record.versions.every((version) => version.sendable) &&
    mailbox &&
    !busy &&
    !locked,
  );
  const statusOnly = Boolean(
    record?.intentId ||
    (loaded?.send?.intent && !loaded.send.intent.testMode) ||
    (loaded?.send && !loaded.send.intent),
  );
  return (
    <section className={styles.screen} aria-label="Newsletter delivery">
      <p className={styles.breadcrumb}>Engagement / Outreach / Newsletter</p>
      <PageHeader
        title={
          statusOnly
            ? "Newsletter delivery"
            : display === "destinations"
              ? "Select destinations"
              : display === "test"
                ? "Test email to your inbox"
                : display === "preview"
                  ? "Preview newsletter"
                  : "Send newsletter"
        }
        description={
          record
            ? `${record.name} · saved revision ${record.stage.revision}`
            : undefined
        }
        actions={
          <div className={styles.actions}>
            {back}
            {record && !statusOnly && display !== "destinations" && (
              <ActionButton
                disabled={busy || (locked && display !== "test")}
                onClick={() =>
                  setStep(
                    display === "send" || display === "test"
                      ? "preview"
                      : "destinations",
                  )
                }
              >
                {display === "send" || display === "test"
                  ? "Back to preview"
                  : "Back to destinations"}
              </ActionButton>
            )}
            {record &&
              !statusOnly &&
              (display === "preview" || display === "test") && (
                <ActionButton
                  primary
                  disabled={!canSend}
                  onClick={() => setStep("send")}
                >
                  Continue to send
                </ActionButton>
              )}
            {display === "preview" && loaded?.send?.intent?.testMode && (
              <ActionButton disabled={busy} onClick={() => setStep("test")}>
                View test status
              </ActionButton>
            )}
            {record && !statusOnly && display === "send" && (
              <ActionButton
                primary
                disabled={!canSend}
                onClick={() => mailbox && void receiver.send(mailbox)}
              >
                Send to {record.versions.length} destinations
              </ActionButton>
            )}
          </div>
        }
      />
      <StatusPanel
        loading={receiver.loading}
        error={receiver.error}
        onRetry={receiver.refresh}
      />
      {receiver.write?.pending && (
        <p className={styles.notice} role="status">
          {receiver.write.kind === "prepare"
            ? "Preparing saved copies…"
            : "Requesting delivery…"}
        </p>
      )}
      {receiver.write?.message && (
        <section className={styles.card} role="alert">
          <h2>
            {receiver.write.unknown
              ? "Outcome not confirmed"
              : "Review required"}
          </h2>
          <p>{receiver.write.message}</p>
          <div>
            <ActionButton onClick={receiver.refresh}>Check status</ActionButton>
          </div>
        </section>
      )}
      {loaded && record && (
        <>
          {record.status !== "draft" && !loaded.send && (
            <section className={styles.card}>
              <h2>Current newsletter status</h2>
              <p>Status: {record.status}</p>
              <p>
                No delivery receipt is available in this record. Refresh reads
                its current state.
              </p>
            </section>
          )}
          {!statusOnly && display !== "destinations" && (
            <ol className={styles.steps} aria-label="Newsletter steps">
              <li>1 · Destinations</li>
              <li
                aria-current={
                  display === "preview" || display === "test"
                    ? "step"
                    : undefined
                }
              >
                2 · Preview
              </li>
              <li aria-current={display === "send" ? "step" : undefined}>
                3 · Send
              </li>
            </ol>
          )}
          {!statusOnly && display === "destinations" && (
            <NewsletterDestinations
              key={JSON.stringify([
                record.versions.map((row) => row.id),
                record.senderConnectionId,
              ])}
              record={record}
              mailboxes={loaded.mailboxes}
              disabled={busy || locked}
              onPrepare={(input, sender) =>
                void receiver.prepare(input, sender).then((result) => {
                  if (result) setStep("preview");
                })
              }
            />
          )}
          {!statusOnly &&
            display === "preview" &&
            (record.versions.length ? (
              <NewsletterPrepared
                record={record}
                mailbox={mailbox}
                disabled={busy || locked}
                onTest={(id) =>
                  mailbox &&
                  void receiver.send(mailbox, id).then((result) => {
                    if (result) setStep("test");
                  })
                }
              />
            ) : (
              <section className={styles.card}>
                <h2>No eligible destinations</h2>
                <p>
                  No prepared copies are available. Review the saved selections
                  before preparing again.
                </p>
                {record.excluded.length > 0 && (
                  <p>
                    Excluded unsubscribed addresses:{" "}
                    {record.excluded.join(", ")}
                  </p>
                )}
              </section>
            ))}
          {!statusOnly && display === "send" && (
            <section className={styles.card}>
              <h2>Ready to send</h2>
              <p>
                {record.versions.length} separate emails from{" "}
                {mailbox?.accountEmail ?? "an unavailable mailbox"}.
              </p>
              <div className={styles.stack}>
                <span className={styles.label}>Subject</span>
                <p className={styles.readonly}>{record.subject}</p>
              </div>
              <div className={styles.stack}>
                <span className={styles.label}>Source</span>
                <p className={styles.readonly}>
                  Workspace · saved revision {record.stage.revision}
                </p>
              </div>
              <div className={styles.stack}>
                <span className={styles.label}>Destinations</span>
                <p className={styles.readonly}>
                  {record.versions.map((row) => row.recipientEmail).join(", ")}
                </p>
              </div>
              <p>
                Only the final Send button requests delivery. A test does not
                send to these destinations.
              </p>
            </section>
          )}
          {loaded.send && (statusOnly || display === "test") && (
            <NewsletterSendStatus
              result={loaded.send}
              onRefresh={receiver.refresh}
              disabled={busy}
            />
          )}
          {record.tests.length > 0 && !busy && (
            <section className={styles.card}>
              <h2>Prepared copy tests</h2>
              <p>Read an existing test request without sending again.</p>
              <div className={styles.actions}>
                {record.tests.map((test, index) => (
                  <ActionButton
                    key={`${test.id}:${test.versionId}`}
                    disabled={locked || Boolean(receiver.write?.unknown)}
                    onClick={() => {
                      receiver.inspectTest(test.id);
                      setStep("test");
                    }}
                  >
                    Check test {index + 1}
                  </ActionButton>
                ))}
              </div>
            </section>
          )}
          {!loaded.send && (
            <div>
              <ActionButton disabled={busy} onClick={receiver.refresh}>
                Refresh newsletter
              </ActionButton>
            </div>
          )}
        </>
      )}
    </section>
  );
}
