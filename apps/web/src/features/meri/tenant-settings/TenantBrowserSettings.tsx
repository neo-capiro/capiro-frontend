"use client";
import { useState } from "react";
import type { TenantDocument } from "./client";
import { browserChoices, type BrowserChoice } from "./browser-editor";
import ui from "../ui/meri-ui.module.css";
import styles from "../screens/settings/settings.module.css";
const roleName = (role: string | null) =>
  role === null
    ? "Workspace"
    : ({
        standard_user: "Members",
        user_admin: "Workspace administrators",
        capiro_admin: "Capiro administrators",
      }[role] ?? role);

export function TenantBrowserSettings({
  document,
  editable,
  save,
}: {
  document: TenantDocument;
  editable: boolean;
  save: (choices: BrowserChoice[]) => void;
}) {
  const [choices, setChoices] = useState(() => browserChoices(document));
  if (!choices) return null;
  const invalid = choices.some(
    (row) =>
      (row.enabled && !row.canEnable) ||
      row.selected.some((origin) => !row.approved.includes(origin)),
  );
  return (
    <form
      className={styles.stack}
      aria-label="Workspace browser access"
      onSubmit={(event) => {
        event.preventDefault();
        if (editable && !invalid) save(choices);
      }}
    >
      <h3>Browser access</h3>
      <p>
        Choose from websites approved by Capiro. Role settings apply within the
        workspace selection. Saved settings apply to subsequent access checks.
      </p>
      {choices.map((row, index) => (
        <BrowserAccessFields
          key={row.role ?? "workspace"}
          row={row}
          disabled={!editable}
          change={(next) =>
            setChoices(
              choices.map((value, position) =>
                position === index ? next : value,
              ),
            )
          }
        />
      ))}
      {invalid ? (
        <p role="alert">
          Some saved choices are no longer approved. Turn off unavailable access
          or remove those websites before saving.
        </p>
      ) : null}
      <button
        type="submit"
        className={ui.primary}
        disabled={!editable || invalid}
      >
        Save browser settings
      </button>
      <p className={ui.muted}>
        Saving this policy does not start a browser session.
      </p>
    </form>
  );
}
function BrowserAccessFields({
  row,
  disabled,
  change,
}: {
  row: BrowserChoice;
  disabled: boolean;
  change: (value: BrowserChoice) => void;
}) {
  const label = roleName(row.role),
    origins = [...new Set([...row.approved, ...row.selected])];
  return (
    <fieldset className={styles.stack} disabled={disabled}>
      <legend>{label}</legend>
      <label>
        <input
          type="checkbox"
          checked={row.enabled}
          disabled={!row.canEnable && !row.enabled}
          onChange={(event) =>
            change({ ...row, enabled: event.target.checked })
          }
        />{" "}
        Allow browser access for {label.toLowerCase()}
      </label>
      {!origins.length ? (
        <p>
          No websites are approved. A Capiro administrator must approve
          destinations before navigation is available.
        </p>
      ) : (
        origins.map((origin) => (
          <label key={origin}>
            <input
              type="checkbox"
              checked={row.selected.includes(origin)}
              disabled={
                !row.approved.includes(origin) && !row.selected.includes(origin)
              }
              onChange={(event) =>
                change({
                  ...row,
                  selected: event.target.checked
                    ? [...row.selected, origin]
                    : row.selected.filter((value) => value !== origin),
                })
              }
            />
            {origin}
            {row.approved.includes(origin) ? "" : " — no longer approved"}
          </label>
        ))
      )}
    </fieldset>
  );
}
