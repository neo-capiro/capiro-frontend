"use client";
import { useState } from "react";
import type { GovernanceItem } from "../../../shared/capiro/operations/memory-governance";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { StatusPanel } from "../../../shared/module-ui";
import { SettingField, SettingsButton, SettingsNotice } from "../components";
import { SettingsMutationNotice } from "../SettingsMutationNotice";
import { useSettingsMutation } from "../useSettingsMutation";
import styles from "../styles";

export function GovernanceDetail({
  itemId,
  readOnly,
  onChange,
  onClose,
}: {
  itemId: string;
  readOnly: boolean;
  onChange: () => void;
  onClose: () => void;
}) {
  const query = useCapiroQuery("settings.memory.governance.item", {
    params: { id: itemId },
  });
  const item = query.data?.item;
  return (
    <section aria-label="Selected memory">
      <SettingsButton onClick={onClose}>Close detail</SettingsButton>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (!query.data.enabled || !item) && (
          <SettingsNotice title="Memory detail unavailable" />
        )}
        {item && item.id === itemId && (
          <>
            <h3>{item.title}</h3>
            <p>
              {item.governedStatus} · Last updated {item.updatedAt}
            </p>
            {item.sections.map((section) => (
              <section key={section.key}>
                <h4>{section.heading}</h4>
                <p style={{ whiteSpace: "pre-wrap" }}>{section.body}</p>
              </section>
            ))}
            <p>
              First approval:{" "}
              {item.approvedByUserId ? "Recorded" : "Not recorded"}. Second
              approval:{" "}
              {item.secondApprovedByUserId ? "Recorded" : "Not recorded"}.
            </p>
            <ItemActions
              key={item.version}
              item={item}
              readOnly={readOnly}
              onChange={() => {
                query.reload();
                onChange();
              }}
            />
            <h4>Version history</h4>
            <ol>
              {item.versions.map((version) => (
                <li key={version.id}>
                  {version.title} · {version.governedStatus} ·{" "}
                  {version.createdAt}
                </li>
              ))}
            </ol>
            <h4>Recent transitions</h4>
            <ol>
              {item.transitions.map((transition) => (
                <li key={transition.id}>
                  {transition.toStatus} · {transition.reason} ·{" "}
                  {transition.occurredAt}
                </li>
              ))}
            </ol>
            <h4>Projection processing</h4>
            <ul>
              {item.projection.map((job) => (
                <li key={job.id}>
                  {job.operation}: {job.status} ({job.attempts} attempts)
                </li>
              ))}
            </ul>
          </>
        )}
      </StatusPanel>
    </section>
  );
}
const actions = [
  "approve",
  "confirm",
  "markStale",
  "revoke",
  "secondApprove",
] as const;
const labels = {
  approve: "Approve",
  confirm: "Confirm current memory",
  markStale: "Mark stale",
  revoke: "Revoke",
  secondApprove: "Record second approval",
};
function ItemActions({
  item,
  readOnly,
  onChange,
}: {
  item: GovernanceItem;
  readOnly: boolean;
  onChange: () => void;
}) {
  const writer = useSettingsMutation("memory-governance");
  const [selected, select] = useState<(typeof actions)[number]>(
    () =>
      actions.find((action) => item.capabilities[action] === true) ?? "confirm",
  );
  const [reason, setReason] = useState("");
  const [confirmed, confirm] = useState(false);
  const available = actions.filter(
    (action) => item.capabilities[action] === true,
  );
  const needsReason = ["approve", "markStale", "revoke"].includes(selected);
  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (
            readOnly ||
            writer.locked ||
            !confirmed ||
            !available.includes(selected) ||
            (needsReason && !reason.trim())
          )
            return;
          void writer.action.run(
            (signal) =>
              writer.api.request(
                `settings.memory.governance.${selected}`,
                {
                  params: { id: item.id },
                  body: {
                    expectedVersion: item.version,
                    ...(needsReason ? { reason: reason.trim() } : {}),
                  },
                },
                { signal },
              ),
            (result) =>
              `Server outcome: ${result.outcome.replaceAll("_", " ")}.`,
            onChange,
          );
        }}
      >
        <fieldset disabled={readOnly || writer.locked} className={styles.stack}>
          <legend>Review the displayed memory version</legend>
          <SettingField label="Action">
            <select
              value={selected}
              onChange={(event) => {
                select(event.target.value as typeof selected);
                confirm(false);
              }}
              className={styles.input}
            >
              <option value="" disabled>
                Choose an allowed action
              </option>
              {available.map((action) => (
                <option key={action} value={action}>
                  {labels[action]}
                </option>
              ))}
            </select>
          </SettingField>
          {needsReason && (
            <SettingField label="Reason">
              <textarea
                className={styles.input}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
                maxLength={2000}
              />
            </SettingField>
          )}
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => confirm(event.target.checked)}
            />{" "}
            I confirm this action on the displayed version.
          </label>
          <SettingsButton
            type="submit"
            disabled={
              !available.includes(selected) ||
              !confirmed ||
              (needsReason && !reason.trim())
            }
          >
            Apply reviewed action
          </SettingsButton>
        </fieldset>
      </form>
      <SettingsMutationNotice
        pending={writer.pending}
        busy={writer.action.busy}
        reconcile={() => void writer.reconcile().then(onChange)}
      />
      {writer.action.error && (
        <SettingsNotice error title="Action not confirmed">
          {writer.action.error} Refresh the current version before a new
          decision.
        </SettingsNotice>
      )}
      {writer.action.message && (
        <SettingsNotice title={writer.action.message} />
      )}
    </>
  );
}
export function ProjectionRetry({
  job,
  readOnly,
  onChange,
}: {
  job: { id: string; version: string };
  readOnly: boolean;
  onChange: () => void;
}) {
  const writer = useSettingsMutation("memory-governance");
  const progress = useCapiroQuery("settings.memory.governance.job", {
    params: { id: job.id },
  });
  return (
    <>
      <p role="status">
        {progress.loading
          ? "Checking current projection progress."
          : progress.error
            ? "Projection progress unavailable."
            : progress.data?.job
              ? `Current progress: ${progress.data.job.status} · ${progress.data.job.attempts} attempts.`
              : "Projection progress unavailable."}
      </p>
      <SettingsButton
        disabled={
          readOnly ||
          writer.locked ||
          !progress.data?.job ||
          !["failed", "dead_letter"].includes(progress.data.job.status)
        }
        onClick={() =>
          void writer.action.run(
            (signal) =>
              writer.api.request(
                "settings.memory.governance.retry",
                {
                  params: { id: job.id },
                  body: { expectedVersion: progress.data!.job!.version },
                },
                { signal },
              ),
            (result) =>
              `Projection result: ${result.outcome.replaceAll("_", " ")}.`,
            () => {
              progress.reload();
              onChange();
            },
          )
        }
      >
        Retry projection
      </SettingsButton>
      <SettingsButton onClick={progress.reload}>Check progress</SettingsButton>
      <SettingsMutationNotice
        pending={writer.pending}
        busy={writer.action.busy}
        reconcile={() =>
          void writer.reconcile().then(() => {
            progress.reload();
            onChange();
          })
        }
      />
      {writer.action.error && (
        <SettingsNotice error title="Retry not confirmed">
          {writer.action.error}
        </SettingsNotice>
      )}
      {writer.action.message && (
        <SettingsNotice title={writer.action.message} />
      )}
    </>
  );
}
