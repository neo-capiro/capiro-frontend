"use client";

import { useRef, useState } from "react";
import { useCapiro } from "../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../shared/capiro/queries";
import { uploadCapiroLogo } from "../../shared/capiro/uploads";
import { StatusPanel, TextInput } from "../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsCard,
  SettingsNotice,
} from "./components";
import styles from "./styles";
import { useSettingsAction } from "./useSettingsAction";

function BrandingForm({
  initialName,
  logoUrl,
  reload,
}: {
  initialName: string;
  logoUrl?: string | null;
  reload: () => void;
}) {
  const api = useCapiro();
  const [name, setName] = useState(initialName);
  const upload = useRef<HTMLInputElement>(null);
  const action = useSettingsAction(api);
  async function uploadLogo(file: File, signal: AbortSignal) {
    const contentType = file.type;
    if (
      !["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(
        contentType,
      )
    )
      throw new Error("Choose a PNG, JPG, WEBP or SVG logo.");
    if (!file.size || file.size > 2 * 1024 * 1024)
      throw new Error("Choose a logo smaller than 2 MB.");
    const ticket = await api.request(
      "settings.branding.logoUploadUrl",
      {
        body: {
          contentType: contentType as
            | "image/png"
            | "image/jpeg"
            | "image/webp"
            | "image/svg+xml",
          contentLength: file.size,
        },
      },
      { signal },
    );
    await uploadCapiroLogo(ticket, file, { signal });
    signal.throwIfAborted();
    return api.request(
      "settings.branding.logoConfirm",
      {
        body: {
          s3Key: ticket.s3Key,
          contentType: contentType as
            | "image/png"
            | "image/jpeg"
            | "image/webp"
            | "image/svg+xml",
        },
      },
      { signal },
    );
  }
  return (
    <div className={styles.stack} data-design-target="411:72025">
      <SettingsCard title="Company name">
        <form
          className={`${styles.row} ${styles.formRow}`}
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(
              async (signal) => {
                const result = await api.request(
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
          }}
        >
          <div className={styles.grow}>
            <SettingField label="Company name">
              <TextInput
                className={styles.input}
                minLength={2}
                maxLength={200}
                required
                disabled={action.busy}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </SettingField>
          </div>
          <SettingsButton primary type="submit" disabled={action.busy}>
            {action.busy ? "Saving…" : "Save"}
          </SettingsButton>
        </form>
      </SettingsCard>
      <SettingsNotice title="Sign-in provider name">
        The Capiro name is saved locally. The current service does not report
        whether the name has synchronized with the sign-in provider.
      </SettingsNotice>
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
            disabled={action.busy}
            onClick={() => upload.current?.click()}
          >
            {action.busy ? "Uploading…" : "Upload logo"}
          </SettingsButton>
          <input
            ref={upload}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file)
                void action.run(
                  (signal) => uploadLogo(file, signal),
                  "Logo was uploaded.",
                  reload,
                );
              event.target.value = "";
            }}
          />
        </div>
      </SettingsCard>
      {action.error && (
        <SettingsNotice title="Branding could not be saved" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
    </div>
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
