"use client";
import { useRef, useState } from "react";
import type { z } from "zod";
import type { subscription } from "../../../../../shared/capiro/operations/legiwatch-subscriptions";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import { ActionButton } from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
export function SubscriptionActivation({
  row,
  onSaved,
}: {
  row: z.infer<typeof subscription>;
  onSaved: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false),
    [resumePolicy, setResumePolicy] = useState<"from_now" | "catch_up_draft">(
      "from_now",
    );
  const activation = useCapiroMutation("legiwatch.subscription.activation"),
    run = useCapiroMutation("legiwatch.subscription.run"),
    requestKey = useRef(crypto.randomUUID());
  const update = async (enabled: boolean) => {
    try {
      await activation.run({
        params: { id: row.id },
        body: {
          enabled,
          expectedVersion: row.version,
          confirmSend: confirmed && row.mode === "send",
          resumePolicy,
        },
      });
      onSaved();
    } catch {
      /* Preserve the exact reviewed version. */
    }
  };
  const prepare = async () => {
    try {
      await run.run({
        params: { id: row.id },
        body: { requestKey: requestKey.current },
      });
      requestKey.current = crypto.randomUUID();
    } catch {
      /* Retain idempotency key when the outcome is unknown. */
    }
  };
  const pending = activation.pending || run.pending;
  return (
    <section className={styles.form}>
      <h3>Activation review</h3>
      <p>
        Saved report version {row.reportVersion} ·{" "}
        {row.mode === "send"
          ? "Automatic external delivery"
          : "Draft preparation only"}
      </p>
      {row.recipients.map((recipient) => (
        <p key={recipient.email}>
          {recipient.role.toUpperCase()} · {recipient.name} · {recipient.email}
        </p>
      ))}
      <fieldset disabled={pending} className={styles.form}>
        <SelectField
          id="subscription-resume"
          label="Resume policy"
          value={resumePolicy}
          onChange={(value) => {
            setConfirmed(false);
            setResumePolicy(value === "catch_up_draft" ? value : "from_now");
          }}
        >
          <option value="from_now">Begin from now</option>
          <option value="catch_up_draft">
            Prepare missed occurrences as drafts
          </option>
        </SelectField>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          {row.mode === "send"
            ? "I reviewed this schedule, content policy and every recipient; authorize automatic delivery."
            : "I reviewed this schedule; activate draft preparation."}
        </label>
        <div className={styles.actions}>
          <ActionButton
            primary
            disabled={!confirmed}
            onClick={() => void update(true)}
          >
            Activate reviewed subscription
          </ActionButton>
          <ActionButton
            disabled={!row.enabled}
            onClick={() => void update(false)}
          >
            Pause subscription
          </ActionButton>
          <ActionButton onClick={() => void prepare()}>
            Prepare one draft now
          </ActionButton>
        </div>
      </fieldset>
      {run.data && (
        <p role="status">
          Draft occurrence {run.data.id} prepared. Open occurrence history to
          inspect its outcome.
        </p>
      )}
      {(activation.error || run.error) && (
        <p role="alert">{(activation.error ?? run.error)?.message}</p>
      )}
    </section>
  );
}
