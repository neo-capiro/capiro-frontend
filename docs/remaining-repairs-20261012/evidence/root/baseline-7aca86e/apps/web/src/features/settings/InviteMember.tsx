"use client";
import { useState } from "react";
import { useCapiro } from "../../shared/capiro/CapiroBoundary";
import { TextInput } from "../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsDialog,
  SettingsNotice,
} from "./components";
import styles from "./styles";
import { useSettingsAction } from "./useSettingsAction";

export function InviteMember({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const api = useCapiro();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"standard_user" | "user_admin">(
    "standard_user",
  );
  const action = useSettingsAction();
  return (
    <SettingsDialog
      open={open}
      onClose={onClose}
      title="Add team member"
      description="Invite someone to join your workspace."
      footer={
        <>
          <SettingsButton disabled={action.busy} onClick={onClose}>
            Cancel
          </SettingsButton>
          <SettingsButton
            form="invite-team-member"
            primary
            type="submit"
            disabled={action.busy}
          >
            {action.busy ? "Sending…" : "Send invitation"}
          </SettingsButton>
        </>
      }
    >
      <form
        id="invite-team-member"
        className={styles.stack}
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(
            () =>
              api.request("settings.team.invite", {
                body: {
                  email,
                  role,
                  ...(firstName ? { firstName } : {}),
                  ...(lastName ? { lastName } : {}),
                },
              }),
            "Invitation was sent.",
            () => {
              onDone();
              onClose();
              setEmail("");
              setFirstName("");
              setLastName("");
            },
          );
        }}
      >
        <div className={`${styles.grid} ${styles.two}`}>
          <SettingField label="First name">
            <TextInput
              value={firstName}
              maxLength={100}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </SettingField>
          <SettingField label="Last name">
            <TextInput
              value={lastName}
              maxLength={100}
              onChange={(event) => setLastName(event.target.value)}
            />
          </SettingField>
        </div>
        <SettingField label="Email">
          <TextInput
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </SettingField>
        <SettingField label="Role">
          <select
            className={styles.input}
            value={role}
            onChange={(event) => setRole(event.target.value as typeof role)}
          >
            <option value="standard_user">Standard user</option>
            <option value="user_admin">User admin</option>
          </select>
        </SettingField>
        {action.error && (
          <SettingsNotice title="Invitation could not be sent" error>
            {action.error}
          </SettingsNotice>
        )}
      </form>
    </SettingsDialog>
  );
}
