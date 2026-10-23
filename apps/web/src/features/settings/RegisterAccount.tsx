"use client";
import { useState } from "react";
import type { z } from "zod";
import type { integrationProviderSchema } from "../../shared/capiro/operations/settings-schemas";
import { TextInput } from "../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsDialog,
  SettingsNotice,
} from "./components";
import { integrationProviders } from "./integrationProviders";
import styles from "./styles";
import { useSettingsMutation } from "./useSettingsMutation";
import { SettingsMutationNotice } from "./SettingsMutationNotice";
type Provider = z.infer<typeof integrationProviderSchema>;
const providers = integrationProviders;

export function RegisterAccount({
  provider,
  onClose,
  refresh,
}: {
  provider?: Provider;
  onClose: () => void;
  refresh: () => void;
}) {
  const mutation = useSettingsMutation("integration-register");
  const { api, action, locked } = mutation;
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  return (
    <SettingsDialog
      busy={action.busy}
      open={!!provider}
      onClose={() => {
        if (!action.busy) onClose();
      }}
      title="Register account"
      description="Register the provider account before connecting it."
      footer={
        <>
          <SettingsButton disabled={action.busy} onClick={onClose}>
            Cancel
          </SettingsButton>
          <SettingsButton
            form="register-integration-account"
            type="submit"
            primary
            disabled={locked}
          >
            {action.busy ? "Registering…" : "Register account"}
          </SettingsButton>
        </>
      }
    >
      <form
        id="register-integration-account"
        className={styles.stack}
        onSubmit={(event) => {
          event.preventDefault();
          if (provider)
            void action.run(
              (signal) =>
                api.request(
                  "settings.integrations.create",
                  {
                    body: {
                      provider,
                      accountEmail: email,
                      ...(displayName ? { displayName } : {}),
                    },
                  },
                  { signal },
                ),
              "Account was registered.",
              () => {
                refresh();
                onClose();
                setEmail("");
                setDisplayName("");
              },
            );
        }}
      >
        <SettingField label="Provider">
          <TextInput
            readOnly
            value={providers.find((item) => item.id === provider)?.title ?? ""}
          />
        </SettingField>
        <SettingField label="Account email">
          <TextInput
            type="email"
            required
            disabled={locked}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </SettingField>
        <SettingField label="Display name">
          <TextInput
            maxLength={120}
            disabled={locked}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </SettingField>
        {action.error && (
          <SettingsNotice title="Account could not be registered" error>
            {action.error}
          </SettingsNotice>
        )}
        <SettingsMutationNotice {...mutation} busy={action.busy} />
      </form>
    </SettingsDialog>
  );
}
