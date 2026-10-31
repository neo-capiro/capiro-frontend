"use client";
import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  StatusPanel,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";

export function SmsConsentPanel({
  clientId,
  onClose,
  onSaved,
}: {
  clientId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const query = useCapiroQuery("legiwatch.sms.settings", {
      params: { clientId },
    }),
    directory = useCapiroQuery("legiwatch.delivery.recipients", {});
  const start = useCapiroMutation("legiwatch.sms.start"),
    confirm = useCapiroMutation("legiwatch.sms.confirm"),
    revoke = useCapiroMutation("legiwatch.sms.revoke");
  const [phone, setPhone] = useState(""),
    [code, setCode] = useState(""),
    [contactId, setContactId] = useState(""),
    [accepted, setAccepted] = useState(false),
    [success, setSuccess] = useState<string>();
  const pending = start.pending || confirm.pending || revoke.pending;
  async function requestCode() {
    if (!query.data) return;
    try {
      const result = await start.run({
        params: { clientId },
        body: { phone, contactId, consentVersion: query.data.consentVersion },
      });
      setSuccess(
        result.dormant
          ? "SMS provider is dormant. A code was not delivered; verification has not been established."
          : `Verification requested for ${result.masked}. Enter the code received at that destination.`,
      );
    } catch {
      /* Exact backend error below. */
    }
  }
  async function verify() {
    try {
      await confirm.run({ params: { clientId }, body: { phone, code } });
      setSuccess(
        "Phone receipt verified and purpose-specific consent recorded.",
      );
      query.reload();
      onSaved();
    } catch {
      /* Exact backend error below. */
    }
  }
  async function withdraw(id: string) {
    try {
      await revoke.run({ params: { clientId, id } });
      query.reload();
      onSaved();
    } catch {
      /* Exact backend error below. */
    }
  }
  return (
    <Modal
      open
      onOpenChange={(value) => {
        if (!value && !pending) onClose();
      }}
      title="SMS consent and verification"
      description="Verification establishes receipt at this exact phone number for hearing updates. It does not enable dispatch when the runtime is unavailable."
      footer={
        <ActionButton disabled={pending} onClick={onClose}>
          Close
        </ActionButton>
      }
    >
      <StatusPanel
        loading={query.loading || directory.loading}
        error={query.error || directory.error}
        onRetry={() => {
          query.reload();
          directory.reload();
        }}
      >
        <div className={styles.form}>
          <SelectField
            id="sms-contact"
            label="Owned active directory contact"
            value={contactId}
            onChange={(value) => {
              setContactId(value);
              setAccepted(false);
              start.reset();
            }}
          >
            <option value="">Select contact</option>
            {directory.data?.contacts
              .filter((contact) => contact.active && !contact.optedOut)
              .map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
          </SelectField>
          <Field label="Phone · E.164" htmlFor="sms-phone">
            <TextInput
              id="sms-phone"
              type="tel"
              value={phone}
              maxLength={30}
              placeholder="+1…"
              onChange={(event) => {
                setPhone(event.target.value);
                setAccepted(false);
                start.reset();
                setCode("");
              }}
            />
          </Field>
          <p className={styles.briefText}>{query.data?.consentText}</p>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            The recipient accepted this exact consent statement.
          </label>
          <ActionButton
            disabled={
              !accepted ||
              !phone.trim() ||
              !contactId ||
              pending ||
              !query.data?.providerConfigured
            }
            onClick={() => void requestCode()}
          >
            Send verification code
          </ActionButton>
          <Field label="Six-digit code" htmlFor="sms-code">
            <TextInput
              id="sms-code"
              inputMode="numeric"
              value={code}
              maxLength={6}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ""))
              }
            />
          </Field>
          <ActionButton
            disabled={
              pending || code.length !== 6 || !start.data || start.data.dormant
            }
            onClick={() => void verify()}
          >
            Confirm received code
          </ActionButton>
          {success && (
            <p role="status" className={styles.success}>
              {success}
            </p>
          )}
          {query.data?.consents.map((consent) => (
            <article key={consent.id} className={styles.listItem}>
              <p>
                ••• ••• {consent.phone.slice(-4)} ·{" "}
                {consent.revokedAt ? "Revoked" : "Verified consent"} ·{" "}
                {consent.consentVersion}
              </p>
              {!consent.revokedAt && (
                <ActionButton
                  disabled={pending}
                  onClick={() => void withdraw(consent.id)}
                >
                  Revoke consent
                </ActionButton>
              )}
            </article>
          ))}
          {(start.error || confirm.error || revoke.error) && (
            <p role="alert" className={styles.error}>
              {start.error?.message ??
                confirm.error?.message ??
                revoke.error?.message}
            </p>
          )}
        </div>
      </StatusPanel>
    </Modal>
  );
}
