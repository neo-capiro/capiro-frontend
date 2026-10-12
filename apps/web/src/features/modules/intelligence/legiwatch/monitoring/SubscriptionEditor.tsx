"use client";
import { useState } from "react";
import type { z } from "zod";
import type {
  subscription,
  subscriptionBody,
} from "../../../../../shared/capiro/operations/legiwatch-subscriptions";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  StatusPanel,
  TextArea,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import { RecipientPicker } from "../reports/RecipientPicker";
import { LocalSchedule } from "./ScopeControls";
import { SubscriptionActivation } from "./SubscriptionActivation";
type Subscription = z.infer<typeof subscription>;
type Body = z.infer<typeof subscriptionBody>;
export function SubscriptionEditor({
  row,
  onClose,
  onSaved,
}: {
  row?: Subscription;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [body, setBody] = useState<Body>({
    reportId: row?.reportId ?? "",
    subject: row?.subject ?? "Daily legislative update",
    introduction: row?.introduction ?? "",
    mode: row?.mode ?? "draft",
    timezone: row?.timezone ?? "America/New_York",
    localMinutes: row?.localMinutes ?? 480,
    sendNoChange: row?.sendNoChange ?? false,
    catchUp: row?.catchUp ?? "draft",
    selection: [],
  });
  const [changed, setChanged] = useState(false);
  const reports = useCapiroQuery("legiwatch.reports", {}),
    create = useCapiroMutation("legiwatch.subscription.create"),
    update = useCapiroMutation("legiwatch.subscription.save");
  const pending = create.pending || update.pending;
  const patch = (value: Partial<Body>) => {
    setChanged(true);
    setBody((current) => ({ ...current, ...value }));
  };
  const save = async () => {
    try {
      if (row)
        await update.run({
          params: { id: row.id },
          body: { ...body, expectedVersion: row.version },
        });
      else await create.run({ body });
      onSaved();
    } catch {
      /* Keep draft configuration on conflict. */
    }
  };
  return (
    <Modal
      open
      title={row ? "Daily subscription" : "New daily subscription"}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <div className={styles.form}>
        <fieldset disabled={pending} className={styles.form}>
          <StatusPanel
            loading={reports.loading}
            error={reports.error}
            onRetry={reports.reload}
          >
            <SelectField
              id="subscription-report"
              label="Report definition"
              value={body.reportId}
              onChange={(reportId) => patch({ reportId })}
            >
              <option value="">Choose a report</option>
              {reports.data
                ?.filter((report) => !report.archived)
                .map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.name} · Version {report.version}
                  </option>
                ))}
            </SelectField>
          </StatusPanel>
          <Field label="Subject" htmlFor="subscription-subject">
            <TextInput
              id="subscription-subject"
              value={body.subject}
              maxLength={200}
              onChange={(event) => patch({ subject: event.target.value })}
            />
          </Field>
          <Field label="Introduction" htmlFor="subscription-intro">
            <TextArea
              id="subscription-intro"
              value={body.introduction}
              maxLength={20000}
              onChange={(event) => patch({ introduction: event.target.value })}
            />
          </Field>
          <LocalSchedule
            timezone={body.timezone}
            localMinutes={body.localMinutes}
            onChange={patch}
          />
          <SelectField
            id="subscription-mode"
            label="Scheduled action"
            value={body.mode}
            onChange={(value) =>
              patch({ mode: value === "send" ? value : "draft" })
            }
          >
            <option value="draft">Prepare a draft</option>
            <option value="send">Deliver automatically after activation</option>
          </SelectField>
          <SelectField
            id="subscription-catchup"
            label="Late occurrence policy"
            value={body.catchUp}
            onChange={(value) =>
              patch({ catchUp: value === "send" ? value : "draft" })
            }
          >
            <option value="draft">Hold late occurrences as drafts</option>
            <option value="send">Allow reviewed late delivery</option>
          </SelectField>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={body.sendNoChange}
              onChange={(event) =>
                patch({ sendNoChange: event.target.checked })
              }
            />
            Prepare or deliver when there are no changes
          </label>
          {body.mode === "send" && (
            <>
              <p className={styles.banner}>
                Select recipients for this saved version. Existing resolved
                recipients are shown in the activation review; saving requires a
                fresh selection.
              </p>
              <RecipientPicker
                value={body.selection}
                onChange={(selection) => patch({ selection })}
              />
            </>
          )}
          <ActionButton
            primary
            disabled={
              !body.reportId ||
              !body.subject.trim() ||
              (body.mode === "send" && !body.selection.length)
            }
            onClick={() => void save()}
          >
            Save paused subscription
          </ActionButton>
        </fieldset>
        {(create.error || update.error) && (
          <p role="alert">{(update.error ?? create.error)?.message}</p>
        )}
        {row && !changed && (
          <SubscriptionActivation row={row} onSaved={onSaved} />
        )}
      </div>
    </Modal>
  );
}
