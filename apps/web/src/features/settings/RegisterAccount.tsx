"use client";
import { useState } from "react";
import type { z } from "zod";
import { useCapiro } from "../../shared/capiro/CapiroBoundary";
import type { integrationProviderSchema } from "../../shared/capiro/operations/settings-schemas";
import { TextInput } from "../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsDialog,
  SettingsNotice,
} from "./components";
import { integrationProviders } from "./integrationProviders";
import { assertRegistrationReceipt } from "./integrations/registration";
import styles from "./styles";
import { useSettingsAction } from "./useSettingsAction";
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
  const api = useCapiro();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const action = useSettingsAction(api);
  return (
    <SettingsDialog
      open={!!provider && provider !== "imap_caldav"}
      busy={action.busy}
      onClose={() => {
        if (!action.busy) onClose();
      }}
      title="Register account"
      description="Create an account record. Registration does not grant permissions or start sync; provider sign-in is still required."
      footer={
        <>
          <SettingsButton disabled={action.busy} onClick={onClose}>
            Cancel
          </SettingsButton>
          <SettingsButton
            form="register-integration-account"
            type="submit"
            primary
            disabled={action.busy}
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
          if (provider && provider !== "imap_caldav")
            void action.run(
              async (signal) => {
                const submitted = {
                  provider,
                  accountEmail: email,
                  ...(displayName ? { displayName } : {}),
                };
                const result = await api.request(
                  "settings.integrations.create",
                  { body: submitted },
                  { signal },
                );
                assertRegistrationReceipt(submitted, result);
                return result;
              },
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
            disabled={action.busy}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </SettingField>
        <SettingField label="Display name">
          <TextInput
            maxLength={120}
            disabled={action.busy}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </SettingField>
        {action.error && (
          <SettingsNotice title="Account could not be registered" error>
            {action.error}
          </SettingsNotice>
        )}
      </form>
    </SettingsDialog>
  );
}
