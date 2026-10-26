"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ActionButton,
  PageHeader,
  StatusPanel,
} from "../../../../shared/module-ui";
import { RichPreview } from "../../workspace/rich-newsletter/RichPreview";
import { useNewsletterReceiver } from "./useNewsletterReceiver";
import styles from "./newsletter-receiving.module.css";

type Receiver = ReturnType<typeof useNewsletterReceiver>;

function ReceivingInspector({
  receiver,
  onOpen,
  back,
}: {
  receiver: Receiver;
  onOpen: () => void;
  back: ReactNode;
}) {
  const { stage, pending, unknown, requestedRevision } = receiver;
  if (unknown)
    return (
      <aside
        className={styles.inspector}
        role="alert"
        data-design-node="3156:116238"
      >
        <h2>Open not confirmed</h2>
        <p className={styles.metadata}>Saved revision {requestedRevision}</p>
        <p>
          A draft may have been created or reused, but its result was not
          received.
        </p>
        <p className={styles.caption}>
          Do not open again to check. Review Outreach for an existing record; a
          missing entry is not proof that no draft exists.
        </p>
        {back}
      </aside>
    );
  if (!stage) return null;
  return (
    <aside className={styles.inspector} data-design-node="3156:116216">
      <h2>Staged newsletter</h2>
      <p className={styles.metadata}>Saved revision {stage.revision}</p>
      <p>Review this saved snapshot before opening it in Engagement.</p>
      <p className={styles.caption}>
        Opening may reuse an existing draft or create one. It does not prepare
        recipients or send email.
      </p>
      <ActionButton primary disabled={pending} onClick={onOpen}>
        Open in Engagement
      </ActionButton>
      {pending && <p role="status">Opening this saved snapshot…</p>}
    </aside>
  );
}

export function NewsletterReceivingView({
  destination,
  clientId,
  back,
}: {
  destination: { kind: "stage"; id: string };
  clientId?: string;
  back: ReactNode;
}) {
  const receiver = useNewsletterReceiver(destination, clientId);
  const router = useRouter();
  const [plainText, setPlainText] = useState(false);
  async function open() {
    const record = await receiver.open();
    if (!record) return;
    const params = new URLSearchParams({
      view: "outreach",
      newsletter: record.id,
    });
    if (clientId) params.set("clientId", clientId);
    router.replace(`/modules/engagement?${params}`);
  }
  return (
    <section className={styles.screen} aria-label="Rich newsletter receiving">
      <PageHeader title={receiver.stage?.name || "Rich newsletter"} />
      {!receiver.unknown && <div className={styles.back}>{back}</div>}
      <StatusPanel
        loading={receiver.loading}
        error={receiver.error}
        onRetry={receiver.refresh}
      />
      <div className={styles.layout}>
        {receiver.stage && (
          <section className={styles.canvas} aria-label="Saved stage rendering">
            <div className={styles.previewHeading}>
              <div>
                <h2>Saved snapshot</h2>
                <p>
                  Locally rendered from this stage’s saved design and
                  configuration.
                </p>
              </div>
              <ActionButton
                aria-pressed={plainText}
                onClick={() => setPlainText((value) => !value)}
              >
                {plainText ? "Show preview" : "Show plain text"}
              </ActionButton>
            </div>
            <RichPreview
              draft={receiver.stage}
              mobile={false}
              plainText={plainText}
            />
          </section>
        )}
        <ReceivingInspector
          receiver={receiver}
          onOpen={() => void open()}
          back={back}
        />
      </div>
    </section>
  );
}
