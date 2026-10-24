"use client";

import { useState } from "react";
import type { z } from "zod";
import {
  contactInfoSchema,
  type CapiroMe,
} from "../../shared/capiro/operations/settings-schemas";
import { useCapiroQuery } from "../../shared/capiro/queries";
import { StatusPanel, TextInput } from "../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsCard,
  SettingsNotice,
} from "./components";
import styles from "./styles";
import { useSettingsMutation } from "./useSettingsMutation";
import { SettingsMutationNotice } from "./SettingsMutationNotice";

type ContactInfo = z.infer<typeof contactInfoSchema>;
const organizationFields = [
  ["name", "Organization name"],
  ["email", "Email"],
  ["phone", "Phone"],
] as const;
const addresses = [
  {
    title: "Mailing address",
    keys: [
      "mailingStreet1",
      "mailingStreet2",
      "mailingCity",
      "mailingStateZip",
    ],
  },
  {
    title: "Permanent address",
    keys: [
      "permanentStreet1",
      "permanentStreet2",
      "permanentCity",
      "permanentStateZip",
    ],
  },
] as const;

function ContactForm({
  initial,
  canEdit,
  reload,
}: {
  initial: ContactInfo;
  canEdit: boolean;
  reload: () => void;
}) {
  const { api, action, pending, reconcile, locked } =
    useSettingsMutation("contact");
  const [form, setForm] = useState(initial);
  function input(key: keyof ContactInfo, label: string) {
    return (
      <SettingField label={label}>
        <TextInput
          className={styles.input}
          value={form[key] ?? ""}
          disabled={!canEdit || locked}
          type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
          onChange={(event) =>
            setForm((current) => ({ ...current, [key]: event.target.value }))
          }
        />
      </SettingField>
    );
  }
  return (
    <form
      className={styles.stack}
      onSubmit={(event) => {
        event.preventDefault();
        if (!canEdit) return;
        void action.run(
          (signal) =>
            api.request("settings.contact.update", { body: form }, { signal }),
          "Contact information was saved.",
          reload,
        );
      }}
    >
      <SettingsCard title="Organization contact">
        <div className={styles.grid}>
          {organizationFields.map(([key, label]) => (
            <div key={key}>{input(key, label)}</div>
          ))}
        </div>
      </SettingsCard>
      {addresses.map((address) => (
        <SettingsCard key={address.title} title={address.title}>
          {input(address.keys[0], "Street 1")}
          {input(address.keys[1], "Street 2")}
          <div className={`${styles.grid} ${styles.two}`}>
            {input(address.keys[2], "City")}
            {input(address.keys[3], "State / ZIP")}
          </div>
        </SettingsCard>
      ))}
      {action.error && (
        <SettingsNotice title="Contact information could not be saved" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      <SettingsMutationNotice
        pending={pending}
        busy={action.busy}
        reconcile={reconcile}
      />
      <div>
        <SettingsButton primary type="submit" disabled={!canEdit || locked}>
          {action.busy ? "Saving…" : "Save contact info"}
        </SettingsButton>
      </div>
      {!canEdit && (
        <p className={styles.description}>
          A workspace administrator can update organization contact details.
        </p>
      )}
    </form>
  );
}

export function ContactSettings({ identity }: { identity: CapiroMe }) {
  const query = useCapiroQuery("settings.contact.read", {});
  return (
    <div data-design-target="411:67803">
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <ContactForm
            key={JSON.stringify(query.data)}
            initial={query.data}
            canEdit={["user_admin", "capiro_admin"].includes(identity.role)}
            reload={query.reload}
          />
        )}
      </StatusPanel>
    </div>
  );
}
