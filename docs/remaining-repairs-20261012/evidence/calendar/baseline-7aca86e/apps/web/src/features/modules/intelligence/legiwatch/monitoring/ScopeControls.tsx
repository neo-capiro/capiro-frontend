"use client";
import { useId } from "react";
import type { z } from "zod";
import type { staffRecipient } from "../../../../../shared/capiro/operations/legiwatch-monitor-schemas";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import { Field, StatusPanel, TextInput } from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
export type StaffRecipient = z.infer<typeof staffRecipient>;
export function FolderTargets({
  values,
  onChange,
}: {
  values: readonly string[];
  onChange: (values: string[]) => void;
}) {
  const query = useCapiroQuery("legiwatch.folders", {});
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      <fieldset className={styles.form}>
        <legend>Folder targets</legend>
        {query.data
          ?.filter((folder) => !folder.archived && folder.canEdit)
          .map((folder) => (
            <label className={styles.check} key={folder.id}>
              <input
                type="checkbox"
                checked={values.includes(folder.id)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...values, folder.id]
                      : values.filter((id) => id !== folder.id),
                  )
                }
              />
              {folder.name} · {folder.jurisdiction} {folder.defaultSession}
            </label>
          ))}
        {query.data &&
          values.some(
            (id) =>
              !query.data?.some(
                (folder) =>
                  folder.id === id && folder.canEdit && !folder.archived,
              ),
          ) && (
            <p role="alert">
              A selected folder is no longer editable. Review the saved scope
              before saving.
            </p>
          )}
      </fieldset>
    </StatusPanel>
  );
}
export function StaffRecipients({
  values,
  onChange,
}: {
  values: readonly StaffRecipient[];
  onChange: (values: StaffRecipient[]) => void;
}) {
  const query = useCapiroQuery("legiwatch.folder.members", {});
  const update = (
    userId: string,
    channel: "email" | "inApp",
    enabled: boolean,
  ) => {
    const previous = values.find(
      (recipient) => recipient.userId === userId,
    ) ?? { userId, email: false, inApp: false };
    onChange(
      [
        ...values.filter((recipient) => recipient.userId !== userId),
        { ...previous, [channel]: enabled },
      ].filter((recipient) => recipient.email || recipient.inApp),
    );
  };
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      <fieldset className={styles.form}>
        <legend>Current staff recipients</legend>
        {query.data?.members.map((member) => (
          <div className={styles.row} key={member.id}>
            <strong>{member.name}</strong>
            <div className={styles.actions}>
              {(["inApp", "email"] as const).map((channel) => (
                <label className={styles.check} key={channel}>
                  <input
                    type="checkbox"
                    aria-label={`${member.name}: ${channel === "inApp" ? "in-app" : "email"}`}
                    checked={
                      values.find(
                        (recipient) => recipient.userId === member.id,
                      )?.[channel] ?? false
                    }
                    onChange={(event) =>
                      update(member.id, channel, event.target.checked)
                    }
                  />
                  {channel === "inApp" ? "In-app" : "Email"}
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>
    </StatusPanel>
  );
}
export function LocalSchedule({
  timezone,
  localMinutes,
  onChange,
}: {
  timezone: string;
  localMinutes: number;
  onChange: (patch: { timezone?: string; localMinutes?: number }) => void;
}) {
  const id = useId();
  const time = `${String(Math.floor(localMinutes / 60)).padStart(2, "0")}:${String(localMinutes % 60).padStart(2, "0")}`;
  return (
    <div className={styles.filters}>
      <Field label="Timezone" htmlFor={`${id}-zone`}>
        <TextInput
          id={`${id}-zone`}
          value={timezone}
          maxLength={100}
          onChange={(event) => onChange({ timezone: event.target.value })}
        />
      </Field>
      <Field label="Local time" htmlFor={`${id}-time`}>
        <TextInput
          id={`${id}-time`}
          type="time"
          required
          value={time}
          onChange={(event) => {
            const parts = event.target.value.split(":").map(Number);
            if (parts.length === 2 && parts.every(Number.isFinite))
              onChange({ localMinutes: parts[0]! * 60 + parts[1]! });
          }}
        />
      </Field>
    </div>
  );
}
