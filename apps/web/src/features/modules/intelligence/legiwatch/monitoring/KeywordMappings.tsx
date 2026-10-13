"use client";
import { useState } from "react";
import type { z } from "zod";
import type { keywordRule } from "../../../../../shared/capiro/operations/legiwatch-keyword-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import { ActionButton, StatusPanel } from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import { StaffRecipients } from "./ScopeControls";
export function KeywordMappings({
  rule,
  onSaved,
}: {
  rule: z.infer<typeof keywordRule>;
  onSaved: () => void;
}) {
  const members = useCapiroQuery("legiwatch.folder.members", {}),
    source = rule.config.source;
  const staged = useCapiroQuery(
    "legiwatch.keyword.staged",
    { query: { sourceAccount: source?.sourceAccount ?? "unselected" } },
    { enabled: Boolean(source?.sourceAccount && members.data?.canAssignOwner) },
  );
  const [recipients, setRecipients] = useState(rule.config.recipients ?? []),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [confirmed, setConfirmed] = useState(false);
  const mutation = useCapiroMutation("legiwatch.keyword.mappings");
  const capture = source?.sourceId?.slice(0, source.sourceId.lastIndexOf(":")),
    auditKey = source?.sourceId?.slice(
      (source.sourceId.lastIndexOf(":") ?? -1) + 1,
    );
  const channels =
    staged.data?.channels.filter(
      (channel) =>
        channel.sourceId.startsWith(`${capture}:`) &&
        channel.payload.alert_key === auditKey &&
        (channel.payload.email_selected ||
          channel.payload.notification_selected),
    ) ?? [];
  const users = [
    ...new Set(channels.map((channel) => String(channel.payload.user_id))),
  ];
  const save = async () => {
    if (!members.data) return;
    try {
      await mutation.run({
        params: { id: rule.id },
        body: {
          expectedVersion: rule.version,
          ownerReviewed: true,
          reviewedOwnerId: members.data.currentActor,
          userMappings: mapping,
          recipients,
        },
      });
      onSaved();
    } catch {
      /* Source mappings remain unresolved on failure. */
    }
  };
  return (
    <StatusPanel
      loading={members.loading}
      error={members.error}
      onRetry={members.reload}
    >
      {members.data?.canAssignOwner ? (
        <div className={styles.form}>
          <fieldset disabled={mutation.pending} className={styles.form}>
            <legend>Owner and staff mapping review</legend>
            {source ? (
              <StatusPanel
                loading={staged.loading}
                error={staged.error}
                onRetry={staged.reload}
              >
                {users.map((user) => (
                  <SelectField
                    key={user}
                    id={`mapped-staff-${user}`}
                    label={`Captured staff member ${user}`}
                    value={mapping[user] ?? ""}
                    onChange={(value) => {
                      setMapping((current) => ({ ...current, [user]: value }));
                      setConfirmed(false);
                    }}
                  >
                    <option value="">Map to an active member</option>
                    {members.data?.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </SelectField>
                ))}
              </StatusPanel>
            ) : (
              <StaffRecipients
                values={recipients}
                onChange={(values) => {
                  setRecipients(values);
                  setConfirmed(false);
                }}
              />
            )}
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              I reviewed current ownership and every selected staff mapping.
            </label>
            <ActionButton
              disabled={
                !confirmed ||
                (Boolean(source) &&
                  (!staged.data || users.some((id) => !mapping[id])))
              }
              onClick={() => void save()}
            >
              Save reviewed mappings
            </ActionButton>
          </fieldset>
          {mutation.error && <p role="alert">{mutation.error.message}</p>}
        </div>
      ) : (
        <p className={styles.banner}>
          A workspace administrator must review owner and staff mappings before
          channel activation.
        </p>
      )}
    </StatusPanel>
  );
}
