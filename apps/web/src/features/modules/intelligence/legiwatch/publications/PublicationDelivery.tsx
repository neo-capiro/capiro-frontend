"use client";
import { useState } from "react";
import type { z } from "zod";
import type {
  PublicationAudience,
  PublicationVersion,
} from "../../../../../shared/capiro/operations/legiwatch-publication-schemas";
import { recipientSelectionSchema } from "../../../../../shared/capiro/operations/legiwatch-delivery-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import { SmsConsentPanel } from "./SmsConsentPanel";

export function PublicationDelivery({
  sessionId,
  version,
  onQueued,
}: {
  sessionId: string;
  version: PublicationVersion;
  onQueued: () => void;
}) {
  const [channel, setChannel] = useState<"email" | "sms" | "in_app">("email"),
    [selection, setSelection] = useState<
      z.infer<typeof recipientSelectionSchema>[]
    >([]),
    [consentIds, setConsentIds] = useState<string[]>([]),
    [reviewed, setReviewed] = useState(false),
    [previewInput, setPreviewInput] = useState<string>(),
    [consentOpen, setConsentOpen] = useState(false);
  const directory = useCapiroQuery(
      "legiwatch.delivery.recipients",
      {},
      { enabled: channel === "email" },
    ),
    sms = useCapiroQuery(
      "legiwatch.sms.settings",
      { params: { clientId: version.payload.clientId ?? "" } },
      { enabled: channel === "sms" && Boolean(version.payload.clientId) },
    );
  const preview = useCapiroMutation("legiwatch.publication.preview"),
    deliver = useCapiroMutation("legiwatch.publication.deliver");
  const body: PublicationAudience =
    channel === "in_app"
      ? { channel }
      : channel === "sms"
        ? { channel, consentIds }
        : { channel, selection };
  const unchanged = previewInput === JSON.stringify(body);
  function invalidate() {
    preview.reset();
    setReviewed(false);
    setPreviewInput(undefined);
  }
  async function refresh() {
    setReviewed(false);
    try {
      await preview.run({ params: { sessionId, id: version.id }, body });
      setPreviewInput(JSON.stringify(body));
    } catch {
      /* Exact backend reason displayed below. */
    }
  }
  async function queue() {
    if (!reviewed || !preview.data || !unchanged) return;
    try {
      await deliver.run({
        params: { sessionId, id: version.id },
        body: { ...body, approvalHash: preview.data.approvalHash },
      });
      onQueued();
    } catch {
      /* Exact backend recheck reason displayed below. */
    }
  }
  return (
    <>
      <div className={styles.room}>
        <section className={styles.card}>
          <h2>Audience and channel</h2>
          <SelectField
            id="publication-channel"
            label="Delivery channel"
            value={channel}
            onChange={(value) => {
              setChannel(value as typeof channel);
              invalidate();
            }}
          >
            <option value="email">Email</option>
            <option value="in_app">My LegiWatch inbox</option>
            <option value="sms">SMS · Verified consents only</option>
          </SelectField>
          {channel === "email" && (
            <StatusPanel
              loading={directory.loading}
              error={directory.error}
              onRetry={directory.reload}
            >
              <strong>Verified active contacts</strong>
              {directory.data?.contacts
                .filter(
                  (contact) =>
                    contact.active &&
                    contact.verified &&
                    !contact.optedOut &&
                    contact.email,
                )
                .map((contact) => (
                  <label key={contact.id} className={styles.check}>
                    <input
                      type="checkbox"
                      checked={selection.some(
                        (item) =>
                          item.kind === "contact" && item.id === contact.id,
                      )}
                      onChange={(event) => {
                        setSelection((previous) =>
                          event.target.checked
                            ? [
                                ...previous,
                                { kind: "contact", id: contact.id, role: "to" },
                              ]
                            : previous.filter(
                                (item) =>
                                  item.kind !== "contact" ||
                                  item.id !== contact.id,
                              ),
                        );
                        invalidate();
                      }}
                    />
                    {contact.name} · {contact.email}
                  </label>
                ))}
              <strong>Recipient lists</strong>
              {directory.data?.lists
                .filter((list) => list.active)
                .map((list) => (
                  <label key={list.id} className={styles.check}>
                    <input
                      type="checkbox"
                      checked={selection.some(
                        (item) => item.kind === "list" && item.id === list.id,
                      )}
                      onChange={(event) => {
                        setSelection((previous) =>
                          event.target.checked
                            ? [
                                ...previous,
                                { kind: "list", id: list.id, role: "to" },
                              ]
                            : previous.filter(
                                (item) =>
                                  item.kind !== "list" || item.id !== list.id,
                              ),
                        );
                        invalidate();
                      }}
                    />
                    {list.name}
                    {list.private ? " · Private list" : ""}
                  </label>
                ))}
            </StatusPanel>
          )}
          {channel === "in_app" && (
            <p>
              This channel resolves to your active LegiWatch inbox. The exact
              destination appears in the preview.
            </p>
          )}
          {channel === "sms" &&
            (version.payload.clientId ? (
              <StatusPanel
                loading={sms.loading}
                error={sms.error}
                onRetry={sms.reload}
              >
                {sms.data && (
                  <>
                    <Badge>
                      {sms.data.dispatchEnabled && sms.data.providerConfigured
                        ? "SMS dispatch configured"
                        : "SMS dispatch unavailable"}
                    </Badge>
                    {sms.data.consents
                      .filter((consent) => !consent.revokedAt)
                      .map((consent) => (
                        <label key={consent.id} className={styles.check}>
                          <input
                            type="checkbox"
                            checked={consentIds.includes(consent.id)}
                            onChange={(event) => {
                              setConsentIds((previous) =>
                                event.target.checked
                                  ? [...previous, consent.id]
                                  : previous.filter((id) => id !== consent.id),
                              );
                              invalidate();
                            }}
                          />
                          Verified destination · ••• •••{" "}
                          {consent.phone.slice(-4)} ·{" "}
                          {new Date(consent.consentedAt).toLocaleDateString()}
                        </label>
                      ))}
                    <ActionButton onClick={() => setConsentOpen(true)}>
                      SMS consent and verification
                    </ActionButton>
                  </>
                )}
              </StatusPanel>
            ) : (
              <p className={styles.banner}>
                SMS requires a client-specific publication and client consent
                records.
              </p>
            ))}
          <ActionButton
            disabled={
              preview.pending ||
              deliver.pending ||
              (channel === "email" && !selection.length) ||
              (channel === "sms" && !consentIds.length)
            }
            onClick={() => void refresh()}
          >
            {preview.pending
              ? "Resolving eligible recipients…"
              : "Refresh delivery preview"}
          </ActionButton>
        </section>
        <section className={styles.card}>
          <h2>Exact delivery preview</h2>
          {preview.data && unchanged ? (
            <>
              <Badge>Version {version.version} · Approved</Badge>
              <p>{preview.data.composition.subject}</p>
              {preview.data.composition.recipients.map((recipient) => (
                <p key={recipient.phone ?? recipient.email}>
                  {recipient.role.toUpperCase()} ·{" "}
                  {recipient.phone
                    ? `••• ••• ${recipient.phone.slice(-4)}`
                    : recipient.email}{" "}
                  · {recipient.name}
                </p>
              ))}
              <pre className={styles.briefText}>
                {preview.data.composition.smsText ??
                  preview.data.composition.plainText}
              </pre>
              {preview.data.composition.smsSize && (
                <p className={styles.description}>
                  {preview.data.composition.smsSize.encoding} ·{" "}
                  {preview.data.composition.smsSize.segments} message segments
                </p>
              )}
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(event) => setReviewed(event.target.checked)}
                />
                I reviewed this exact version, channel and every resolved
                destination.
              </label>
              <ActionButton
                primary
                disabled={!reviewed || deliver.pending}
                onClick={() => void queue()}
              >
                {deliver.pending
                  ? "Queuing reviewed delivery…"
                  : "Confirm reviewed delivery"}
              </ActionButton>
            </>
          ) : (
            <p className={styles.description}>
              Refresh the preview after changing the audience or channel.
            </p>
          )}
        </section>
      </div>
      {(preview.error || deliver.error) && (
        <p role="alert" className={styles.error}>
          {preview.error?.message ?? deliver.error?.message}
        </p>
      )}
      <div className={styles.banner}>
        <strong>Delivery eligibility</strong>An unapproved version, stale
        preview, revoked source permission or ineligible audience blocks
        delivery. SMS has separate consent and runtime gates.
      </div>
      {version.payload.clientId && consentOpen && (
        <SmsConsentPanel
          clientId={version.payload.clientId}
          onClose={() => setConsentOpen(false)}
          onSaved={() => {
            sms.reload();
            invalidate();
          }}
        />
      )}
    </>
  );
}
