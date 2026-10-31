"use client";
import { useState } from "react";
import type { z } from "zod";
import {
  compositionBodySchema,
  type FrozenDeliveryRun,
} from "../../../../../shared/capiro/operations/legiwatch-delivery-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  StatusPanel,
  TextArea,
  TextInput,
} from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
import { RecipientPicker } from "./RecipientPicker";

type Body = z.infer<typeof compositionBodySchema>;
export function DeliveryCompose({
  run,
  onQueued,
}: {
  run: FrozenDeliveryRun;
  onQueued: () => void;
}) {
  const directory = useCapiroQuery("legiwatch.delivery.recipients", {}),
    preview = useCapiroMutation("legiwatch.delivery.compose"),
    send = useCapiroMutation("legiwatch.delivery.send");
  const [body, setBody] = useState<Body>({
      subject: `Legislative update · ${run.cutoff}`,
      introduction: "",
      selection: [],
    }),
    [reviewedBody, setReviewedBody] = useState<string>(),
    [approved, setApproved] = useState(false);
  const unchanged = reviewedBody === JSON.stringify(body);
  function change(patch: Partial<Body>) {
    setBody((previous) => ({ ...previous, ...patch }));
    setApproved(false);
    setReviewedBody(undefined);
    preview.reset();
  }
  async function compose() {
    setApproved(false);
    try {
      await preview.run({ params: { id: run.id }, body });
      setReviewedBody(JSON.stringify(body));
    } catch {
      /* Shown below. */
    }
  }
  async function approve() {
    if (!preview.data || !unchanged || !approved) return;
    try {
      await send.run({
        params: { id: run.id },
        body: { ...body, approvalHash: preview.data.approvalHash },
      });
      onQueued();
    } catch {
      /* Shown below. */
    }
  }
  return (
    <section className={styles.card}>
      <h2>Review external delivery</h2>
      {run.audience !== "external" ? (
        <p className={styles.banner}>
          Internal runs cannot be delivered externally. Generate a separate
          external audience run.
        </p>
      ) : (
        <StatusPanel
          loading={directory.loading}
          error={directory.error}
          onRetry={directory.reload}
        >
          <div className={styles.form}>
            <p className={styles.description}>
              Sender ·{" "}
              {directory.data?.senderEmail ?? "No usable sender email supplied"}
            </p>
            <Field label="Subject" htmlFor="report-send-subject">
              <TextInput
                id="report-send-subject"
                value={body.subject}
                maxLength={200}
                onChange={(event) => change({ subject: event.target.value })}
              />
            </Field>
            <Field label="Introduction" htmlFor="report-send-intro">
              <TextArea
                id="report-send-intro"
                value={body.introduction}
                maxLength={20000}
                onChange={(event) =>
                  change({ introduction: event.target.value })
                }
              />
            </Field>
            <fieldset disabled={preview.pending || send.pending}>
              <RecipientPicker
                value={body.selection}
                onChange={(selection) => change({ selection })}
              />
            </fieldset>
            <div className={styles.actions}>
              <ActionButton
                disabled={
                  preview.pending ||
                  send.pending ||
                  !body.selection.length ||
                  !body.subject.trim()
                }
                onClick={() => void compose()}
              >
                {preview.pending
                  ? "Resolving exact recipients…"
                  : "Review composition"}
              </ActionButton>
            </div>
            {preview.data && unchanged && (
              <section className={styles.card}>
                <h2>Exact composition</h2>
                <p>Subject · {preview.data.composition.subject}</p>
                <div className={styles.list}>
                  {preview.data.composition.recipients.map((recipient) => (
                    <p key={recipient.email}>
                      {recipient.role.toUpperCase()} · {recipient.email} ·{" "}
                      {recipient.name}
                    </p>
                  ))}
                </div>
                <pre className={styles.briefText}>
                  {preview.data.composition.plainText}
                </pre>
                {!preview.data.complete && (
                  <p className={styles.gap}>
                    Source checks are incomplete. Sending is blocked.
                  </p>
                )}
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={approved}
                    onChange={(event) => setApproved(event.target.checked)}
                    disabled={!preview.data.complete}
                  />
                  I reviewed this exact content and every resolved recipient.
                </label>
                <ActionButton
                  primary
                  disabled={!approved || !preview.data.complete || send.pending}
                  onClick={() => void approve()}
                >
                  {send.pending
                    ? "Queuing approved delivery…"
                    : "Approve and queue delivery"}
                </ActionButton>
                <p className={styles.description}>
                  Delivery is queued only after this explicit approval. The
                  backend rechecks composition, source completeness, permissions
                  and recipient versions.
                </p>
              </section>
            )}
            {(preview.error || send.error) && (
              <p role="alert" className={styles.error}>
                {preview.error?.message ?? send.error?.message}
              </p>
            )}
          </div>
        </StatusPanel>
      )}
    </section>
  );
}
