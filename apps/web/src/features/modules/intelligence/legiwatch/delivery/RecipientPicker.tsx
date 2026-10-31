"use client";
import { useId, useState } from "react";
import type { z } from "zod";
import { recipientSelectionSchema } from "../../../../../shared/capiro/operations/legiwatch-delivery-schemas";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  StatusPanel,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
export type RecipientSelection = z.infer<typeof recipientSelectionSchema>[];
export function RecipientPicker({
  value,
  onChange,
}: {
  value: RecipientSelection;
  onChange: (value: RecipientSelection) => void;
}) {
  const directory = useCapiroQuery("legiwatch.delivery.recipients", {});
  const [manual, setManual] = useState(""),
    [role, setRole] = useState<"to" | "bcc">("to");
  const id = useId();
  const toggle = (
    kind: "contact" | "list",
    selectedId: string,
    checked: boolean,
  ) =>
    onChange(
      checked
        ? [...value, { kind, id: selectedId, role }]
        : value.filter(
            (item) =>
              item.kind === "manual" ||
              item.kind !== kind ||
              item.id !== selectedId,
          ),
    );
  const manualSelection = recipientSelectionSchema.safeParse({
    kind: "manual",
    email: manual.trim(),
    role,
  });
  return (
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
        <SelectField
          id={`${id}-role`}
          label="Role for new selections"
          value={role}
          onChange={(value) => setRole(value === "bcc" ? value : "to")}
        >
          <option value="to">To</option>
          <option value="bcc">BCC</option>
        </SelectField>
        <fieldset className={styles.form}>
          <legend>Contacts</legend>
          {directory.data?.contacts.map((contact) => (
            <label className={styles.check} key={contact.id}>
              <input
                type="checkbox"
                disabled={
                  !contact.active ||
                  !contact.verified ||
                  contact.optedOut ||
                  !contact.email
                }
                checked={value.some(
                  (item) => item.kind === "contact" && item.id === contact.id,
                )}
                onChange={(event) =>
                  toggle("contact", contact.id, event.target.checked)
                }
              />
              {contact.name} · {contact.email ?? "No email"}
              {!contact.verified ? " · Unverified" : ""}
              {contact.optedOut ? " · Opted out" : ""}
            </label>
          ))}
        </fieldset>
        <fieldset className={styles.form}>
          <legend>Lists</legend>
          {directory.data?.lists.map((list) => (
            <label className={styles.check} key={list.id}>
              <input
                type="checkbox"
                disabled={!list.active}
                checked={value.some(
                  (item) => item.kind === "list" && item.id === list.id,
                )}
                onChange={(event) =>
                  toggle("list", list.id, event.target.checked)
                }
              />
              {list.name}
              {list.private ? " · Private" : ""}
            </label>
          ))}
        </fieldset>
        <div className={styles.actions}>
          <TextInput
            type="email"
            value={manual}
            aria-label="Manual recipient email"
            placeholder="Additional recipient email"
            onChange={(event) => setManual(event.target.value)}
          />
          <ActionButton
            disabled={!manualSelection.success}
            onClick={() => {
              if (manualSelection.success) {
                onChange([...value, manualSelection.data]);
                setManual("");
              }
            }}
          >
            Add recipient
          </ActionButton>
        </div>
        {value.map((item, index) => (
          <div className={styles.row} key={`${item.kind}:${index}`}>
            <span>
              {item.role.toUpperCase()} ·{" "}
              {item.kind === "manual"
                ? item.email
                : item.kind === "contact"
                  ? (directory.data?.contacts.find(
                      (contact) => contact.id === item.id,
                    )?.name ?? item.id)
                  : (directory.data?.lists.find((list) => list.id === item.id)
                      ?.name ?? item.id)}
            </span>
            <ActionButton
              onClick={() =>
                onChange(value.filter((_, offset) => offset !== index))
              }
            >
              Remove
            </ActionButton>
          </div>
        ))}
      </div>
    </StatusPanel>
  );
}
