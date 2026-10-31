"use client";
import { useState } from "react";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import { ActionButton, Panel } from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import { DeliveryRunView } from "../delivery/DeliveryRunView";

export function BriefingReview({
  selectionId,
  folderId,
}: {
  selectionId: string;
  folderId?: string;
}) {
  const [audience, setAudience] = useState<"internal" | "external">("internal"),
    [acceptSourceGaps, setAcceptGaps] = useState(false);
  const preview = useCapiroMutation("legiwatch.briefing.preview"),
    approve = useCapiroMutation("legiwatch.briefing.approve");
  const body = { selectionId, audience, acceptSourceGaps },
    pending = preview.pending || approve.pending;
  const reset = () => {
    preview.reset();
    approve.reset();
  };
  const review = async () => {
    try {
      await preview.run({ body });
    } catch {
      /* Retain the review fields. */
    }
  };
  const freeze = async () => {
    if (!preview.data) return;
    try {
      await approve.run({
        body: { ...body, approvalHash: preview.data.approvalHash },
      });
    } catch {
      /* The service rejects changed output or scope. */
    }
  };
  if (approve.data)
    return <DeliveryRunView runId={approve.data.runId} onBack={reset} />;
  return (
    <Panel
      title="Review edited Workspace output"
      description="Saving a draft does not authorize delivery. Review the current edited output before creating a frozen edition."
    >
      <div className={styles.form}>
        {!folderId && (
          <p className={styles.banner}>
            Choose a permitted folder before preparing an edition for
            distribution.
          </p>
        )}
        <fieldset disabled={pending} className={styles.form}>
          <SelectField
            id="briefing-audience"
            label="Audience"
            value={audience}
            onChange={(value) => {
              if (value === "internal" || value === "external") {
                reset();
                setAudience(value);
              }
            }}
          >
            <option value="internal">Internal review only</option>
            <option value="external">External distribution review</option>
          </SelectField>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={acceptSourceGaps}
              onChange={(event) => {
                reset();
                setAcceptGaps(event.target.checked);
              }}
            />
            I reviewed the retained-source gaps for this audience.
          </label>
        </fieldset>
        <div className={styles.actions}>
          <ActionButton
            disabled={pending || !folderId}
            onClick={() => void review()}
          >
            Preview current edition
          </ActionButton>
          <ActionButton
            primary
            disabled={pending || !preview.data}
            onClick={() => void freeze()}
          >
            Approve this exact edition
          </ActionButton>
        </div>
        {preview.data && (
          <>
            <p className={styles.description}>
              {preview.data.deliveryState.replaceAll("_", " ")}
            </p>
            <pre className={styles.briefText}>{preview.data.rendered.text}</pre>
          </>
        )}
        {(preview.error || approve.error) && (
          <p className={styles.error} role="alert">
            {preview.error?.message || approve.error?.message}
          </p>
        )}
      </div>
    </Panel>
  );
}
