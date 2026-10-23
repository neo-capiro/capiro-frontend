"use client";

import { useRef, useState, type FormEvent } from "react";
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
import { useBrandingLogo } from "./branding/useBrandingLogo";

function BrandingForm({
  initialName,
  logoUrl,
  reload,
}: {
  initialName: string;
  logoUrl?: string | null;
  reload: () => void;
}) {
  const [name, setName] = useState(initialName);
  const mutation = useSettingsMutation("branding-name");
  const logo = useBrandingLogo(reload);
  const locked = mutation.locked || logo.locked;
  function saveName(event: FormEvent) {
    event.preventDefault();
    if (locked) return;
    void mutation.action.run(
      async (signal) => {
        const result = await mutation.api.request(
          "settings.branding.update",
          { body: { name } },
          { signal },
        );
        if (result.name !== name)
          throw new Error(
            "The response did not confirm the company name. Reload before making another change.",
          );
        return result;
      },
      "Company name was saved in Capiro. Sign-in provider synchronization is not confirmed.",
      reload,
    );
  }
  return (
    <div className={styles.stack} data-design-target="411:72025">
      <BrandingName
        name={name}
        onChange={setName}
        onSubmit={saveName}
        disabled={locked}
        busy={mutation.action.busy}
      />
      <SettingsNotice title="Sign-in provider name">
        The Capiro name is saved locally. The current service does not report
        whether the name has synchronized with the sign-in provider.
      </SettingsNotice>
      <BrandingLogo
        logoUrl={logoUrl}
        disabled={locked}
        busy={logo.action.busy}
        uploadFile={logo.uploadFile}
      />
      {(logo.action.error || mutation.action.error) && (
        <SettingsNotice title="Branding could not be saved" error>
          {logo.action.error ?? mutation.action.error}
        </SettingsNotice>
      )}
      {logo.action.message && <SettingsNotice title={logo.action.message} />}
      {mutation.action.message && (
        <SettingsNotice title={mutation.action.message} />
      )}
      <SettingsMutationNotice {...mutation} busy={mutation.action.busy} />
      <SettingsMutationNotice {...logo} busy={logo.action.busy} />
    </div>
  );
}

function BrandingName({
  name,
  onChange,
  onSubmit,
  disabled,
  busy,
}: {
  name: string;
  onChange: (name: string) => void;
  onSubmit: (event: FormEvent) => void;
  disabled: boolean;
  busy: boolean;
}) {
  return (
    <SettingsCard title="Company name">
      <form className={`${styles.row} ${styles.formRow}`} onSubmit={onSubmit}>
        <div className={styles.grow}>
          <SettingField label="Company name">
            <TextInput
              className={styles.input}
              minLength={2}
              maxLength={200}
              required
              disabled={disabled}
              value={name}
              onChange={(event) => onChange(event.target.value)}
            />
          </SettingField>
        </div>
        <SettingsButton primary type="submit" disabled={disabled}>
          {busy ? "Saving…" : "Save"}
        </SettingsButton>
      </form>
    </SettingsCard>
  );
}

function BrandingLogo({
  logoUrl,
  disabled,
  busy,
  uploadFile,
}: {
  logoUrl?: string | null;
  disabled: boolean;
  busy: boolean;
  uploadFile: (file: File) => void;
}) {
  const upload = useRef<HTMLInputElement>(null);
  return (
    <SettingsCard title="Logo">
      <div className={styles.row}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Organization logo"
            width={160}
            height={80}
            style={{ objectFit: "contain" }}
          />
        ) : (
          <div className={styles.logoPreview}>No logo</div>
        )}
        <SettingsButton
          disabled={disabled}
          onClick={() => upload.current?.click()}
        >
          {busy ? "Uploading…" : "Upload logo"}
        </SettingsButton>
        <input
          ref={upload}
          type="file"
          hidden
          disabled={disabled}
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file && !disabled) uploadFile(file);
            event.target.value = "";
          }}
        />
      </div>
    </SettingsCard>
  );
}

export function BrandingSettings() {
  const query = useCapiroQuery("settings.branding.read", {});
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      {query.data ? (
        <BrandingForm
          key={`${query.data.name}:${query.data.logoUploadedAt}`}
          initialName={query.data.name}
          logoUrl={query.data.logoUrl}
          reload={query.reload}
        />
      ) : (
        !query.loading &&
        !query.error && (
          <SettingsNotice title="Branding unavailable">
            Your organization branding record is unavailable. Contact your
            workspace administrator.
          </SettingsNotice>
        )
      )}
    </StatusPanel>
  );
}
