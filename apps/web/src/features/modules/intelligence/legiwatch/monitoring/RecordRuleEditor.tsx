"use client";
import { useState } from "react";
import type { z } from "zod";
import type {
  recordRule,
  recordRuleBody,
} from "../../../../../shared/capiro/operations/legiwatch-monitor-schemas";
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
import { FolderTargets, LocalSchedule, StaffRecipients } from "./ScopeControls";
type RecordFamily = "record" | "agenda";
type Rule = z.infer<typeof recordRule>;
type Body = z.infer<typeof recordRuleBody>;
export function RecordRuleEditor({
  rule,
  family,
  canEdit,
  onClose,
  onSaved,
}: {
  rule: Rule;
  family: RecordFamily;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [body, setBody] = useState<Body>({
    name: rule.name,
    folderIds: rule.folderIds,
    recipients: rule.recipients,
    cadence: rule.cadence,
    timezone: rule.timezone ?? "America/New_York",
    localMinutes: rule.localMinutes ?? 1020,
    expectedVersion: rule.version,
  });
  const mutation = useCapiroMutation(
    family === "agenda"
      ? "legiwatch.rules.agenda.save"
      : "legiwatch.rules.record.save",
  );
  const [changed, setChanged] = useState(false);
  const patch = (value: Partial<Body>) => {
    setChanged(true);
    setBody((current) => ({ ...current, ...value }));
  };
  const save = async () => {
    try {
      await mutation.run({ params: { id: rule.id }, body });
      onSaved();
    } catch {
      /* Keep reviewed values on conflict. */
    }
  };
  return (
    <Modal
      open
      title="Review monitoring rule"
      onOpenChange={(open) => {
        if (!open && !mutation.pending) onClose();
      }}
    >
      <div className={styles.form}>
        <fieldset
          disabled={!canEdit || mutation.pending}
          className={styles.form}
        >
          <Field label="Rule name" htmlFor="record-rule-name">
            <TextInput
              id="record-rule-name"
              value={body.name}
              maxLength={200}
              onChange={(event) => patch({ name: event.target.value })}
            />
          </Field>
          <FolderTargets
            values={body.folderIds}
            onChange={(folderIds) => patch({ folderIds })}
          />
          <SelectField
            id="record-rule-cadence"
            label="Cadence"
            value={body.cadence}
            onChange={(value) =>
              patch({ cadence: value === "realtime" ? value : "end_of_day" })
            }
          >
            <option value="realtime">Real time</option>
            <option value="end_of_day">End of day</option>
          </SelectField>
          {body.cadence === "end_of_day" && (
            <LocalSchedule
              timezone={body.timezone}
              localMinutes={body.localMinutes}
              onChange={patch}
            />
          )}
          <StaffRecipients
            values={body.recipients}
            onChange={(recipients) => patch({ recipients })}
          />
          <ActionButton
            primary
            disabled={!changed || !body.name.trim() || !body.folderIds.length}
            onClick={() => void save()}
          >
            Save for review
          </ActionButton>
        </fieldset>
        {mutation.error && <p role="alert">{mutation.error.message}</p>}
        {!changed && (
          <RecordReadiness
            rule={rule}
            family={family}
            canEdit={canEdit}
            onSaved={onSaved}
          />
        )}
      </div>
    </Modal>
  );
}
function RecordReadiness({
  rule,
  family,
  canEdit,
  onSaved,
}: {
  rule: Rule;
  family: RecordFamily;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [inspected, setInspected] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  const query = useCapiroQuery(
    family === "agenda"
      ? "legiwatch.rules.agenda.readiness"
      : "legiwatch.rules.record.readiness",
    { params: { id: rule.id } },
    { enabled: inspected },
  );
  const activation = useCapiroMutation(
    family === "agenda"
      ? "legiwatch.rules.agenda.activation"
      : "legiwatch.rules.record.activation",
  );
  const update = async (enabled: boolean) => {
    try {
      await activation.run({
        params: { id: rule.id },
        body: { enabled, expectedVersion: rule.version },
      });
      onSaved();
    } catch {
      /* Backend repeats current access and coverage checks. */
    }
  };
  return (
    <section className={styles.form}>
      <ActionButton
        onClick={() => {
          setInspected(true);
          setConfirmed(false);
          query.reload();
        }}
      >
        Check current readiness
      </ActionButton>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <>
            <p>
              {query.data.ready
                ? "Current source and recipient checks passed."
                : "Activation is held for review."}
            </p>
            {query.data.issues.map((issue) => (
              <p key={issue} className={styles.gap}>
                {issue}
              </p>
            ))}
            <label className={styles.check}>
              <input
                type="checkbox"
                disabled={!canEdit || !query.data.ready || activation.pending}
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              Activate the saved scope and selected staff channels from now.
            </label>
          </>
        )}
      </StatusPanel>
      <div className={styles.actions}>
        <ActionButton
          primary
          disabled={
            !canEdit || !confirmed || !query.data?.ready || activation.pending
          }
          onClick={() => void update(true)}
        >
          Activate reviewed rule
        </ActionButton>
        <ActionButton
          disabled={!canEdit || rule.state !== "active" || activation.pending}
          onClick={() => void update(false)}
        >
          Pause rule
        </ActionButton>
      </div>
      {activation.error && <p role="alert">{activation.error.message}</p>}
    </section>
  );
}
