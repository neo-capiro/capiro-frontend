"use client";
import { useState } from "react";
import type { NewsletterOutreachRecord } from "@capiro/shared/newsletter";
import type { SendingMailbox } from "../../../portfolio/relationships/public";
import { ActionButton, Field, SelectInput } from "../../../../shared/module-ui";
import { SavedNewsletterHtml } from "../../workspace/rich-newsletter/RichPreview";
import styles from "./newsletter-delivery.module.css";

export function NewsletterPrepared({
  record,
  mailbox,
  disabled,
  onTest,
}: {
  record: NewsletterOutreachRecord;
  mailbox?: SendingMailbox;
  disabled: boolean;
  onTest: (versionId: string) => void;
}) {
  const [selected, setSelected] = useState(record.versions[0]?.id ?? "");
  const [mobile, setMobile] = useState(false);
  const version =
    record.versions.find((row) => row.id === selected) ?? record.versions[0];
  const tested = record.tests.some((test) => test.versionId === version?.id);
  return (
    <div className={styles.layout}>
      <div className={styles.stack}>
        <div className={styles.previewWidths} aria-label="Preview width">
          <ActionButton aria-pressed={!mobile} onClick={() => setMobile(false)}>
            Desktop
          </ActionButton>
          <ActionButton aria-pressed={mobile} onClick={() => setMobile(true)}>
            Mobile
          </ActionButton>
        </div>
        <p className={styles.caption}>
          Saved prepared HTML · external images and links are disabled. Email
          clients may render differently.
        </p>
        {version && (
          <div className={`${styles.canvas} ${mobile ? styles.mobile : ""}`}>
            <SavedNewsletterHtml
              html={version.body}
              title={`Prepared newsletter for ${version.recipientEmail}`}
            />
          </div>
        )}
      </div>
      <aside className={styles.stack}>
        <section className={styles.card}>
          <h2>Preview for</h2>
          <Field label="Destination" htmlFor="newsletter-preview-for">
            <SelectInput
              id="newsletter-preview-for"
              value={version?.id ?? ""}
              onValueChange={setSelected}
              options={record.versions.map((row) => ({
                value: row.id,
                label: row.recipientEmail,
              }))}
            />
          </Field>
          <div className={styles.stack}>
            <span className={styles.label}>From</span>
            <p className={styles.readonly}>
              {mailbox
                ? `${mailbox.displayName ? `${mailbox.displayName} · ` : ""}${mailbox.accountEmail}`
                : "Prepared mailbox is unavailable"}
            </p>
          </div>
          <div className={styles.stack}>
            <span className={styles.label}>Subject</span>
            <p className={styles.readonly}>
              {version?.subject ?? record.subject}
            </p>
          </div>
          <ActionButton
            primary
            disabled={disabled || !mailbox || !version?.sendable || tested}
            onClick={() => version && onTest(version.id)}
          >
            Send test to my inbox
          </ActionButton>
          <p className={styles.caption}>
            {tested
              ? "A test request already exists for this copy. Check its status below."
              : "This sends one real test email to your account email address."}
          </p>
          {version && !version.sendable && (
            <p role="status">
              This prepared copy is not currently eligible to send.
            </p>
          )}
        </section>
        <section className={styles.card}>
          <h2>Prepared destinations</h2>
          <p>{record.versions.length} individual copies.</p>
          <p className={styles.caption}>
            Sending uses these saved copies. Changing the selections requires
            preparation again.
          </p>
          {record.excluded.length > 0 && (
            <p>
              {record.excluded.length} unsubscribed addresses excluded:{" "}
              {record.excluded.join(", ")}
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
