"use client";
import { useState } from "react";
import { TextInput } from "../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsDialog,
  SettingsNotice,
} from "./components";
import styles from "./styles";
import { useSettingsMutation } from "./useSettingsMutation";
import { SettingsMutationNotice } from "./SettingsMutationNotice";

export function InviteMember({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { api, action, pending, reconcile, locked } =
    useSettingsMutation("team-invite");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"standard_user" | "user_admin">(
    "standard_user",
  );
  return (
    <SettingsDialog
      busy={action.busy}
      open={open}
      onClose={() => {
        if (!action.busy) onClose();
      }}
      title="Add team member"
      description="Invite someone to join your workspace."
      footer={
        <>
          <SettingsButton disabled={locked} onClick={onClose}>
            Cancel
          </SettingsButton>
          <SettingsButton
            form="invite-team-member"
            primary
            type="submit"
            disabled={locked}
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
            (signal) =>
              api.request(
                "settings.team.invite",
                {
                  body: {
                    email,
                    role,
                    ...(firstName ? { firstName } : {}),
                    ...(lastName ? { lastName } : {}),
                  },
                },
                { signal },
              ),
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
              disabled={locked}
              value={firstName}
              maxLength={100}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </SettingField>
          <SettingField label="Last name">
            <TextInput
              disabled={locked}
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
            disabled={locked}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </SettingField>
        <SettingField label="Role">
          <select
            className={styles.input}
            disabled={locked}
            value={role}
            onChange={(event) => setRole(event.target.value as typeof role)}
          >
            <option value="standard_user">Standard user</option>
            <option value="user_admin">User admin</option>
          </select>
        </SettingField>
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
        {action.error && (
          <SettingsNotice title="Invitation could not be sent" error>
            {action.error}
          </SettingsNotice>
        )}
      </form>
    </SettingsDialog>
  );
}
