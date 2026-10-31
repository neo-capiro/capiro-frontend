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
import { useSettingsMutation } from "./useSettingsMutation";
import { SettingsMutationNotice } from "./SettingsMutationNotice";
import {
  brandingSyncMessage,
  canRetryBrandingSync,
  retryBrandingSync,
  type BrandingSyncReceipt,
} from "./branding-sync";

function BrandingForm({
  initialName,
  logoUrl,
  reload,
  mutation,
  onSaved,
  onStart,
  uploadAction,
  syncing,
}: {
  initialName: string;
  logoUrl?: string | null;
  reload: () => void;
  mutation: ReturnType<typeof useSettingsMutation>;
  onSaved: (receipt: BrandingSyncReceipt) => void;
  onStart: () => void;
  uploadAction: ReturnType<typeof useSettingsAction>;
  syncing: boolean;
}) {
  const api = useCapiro();
  const [name, setName] = useState(initialName);
  const [failedLogoUrl, setFailedLogoUrl] = useState<string>();
  const upload = useRef<HTMLInputElement>(null);
  const action = uploadAction;
  const locked = mutation.locked || action.busy || syncing;
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
            onStart();
            const capturedName = name;
            void mutation.action.run(
              (signal) =>
                mutation.api.request(
                  "settings.branding.update",
                  { body: { name: capturedName } },
                  { signal },
                ),
              "Company name saved in Capiro.",
              (receipt) => {
                onSaved(receipt);
                reload();
              },
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
                disabled={locked}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </SettingField>
          </div>
          <SettingsButton primary type="submit" disabled={locked}>
            {mutation.action.busy ? "Saving…" : "Save"}
          </SettingsButton>
        </form>
      </SettingsCard>
      <SettingsCard title="Logo">
        <div className={styles.row}>
          {logoUrl && failedLogoUrl !== logoUrl ? (
            <img
              src={logoUrl}
              alt="Organization logo"
              width={160}
              height={80}
              style={{ objectFit: "contain" }}
              onError={() => setFailedLogoUrl(logoUrl)}
            />
          ) : (
            <div className={styles.logoPreview}>
              {logoUrl ? "Logo unavailable" : "No logo"}
            </div>
          )}
          <SettingsButton
            disabled={locked}
            onClick={() => upload.current?.click()}
          >
            {action.busy ? "Uploading…" : "Upload logo"}
          </SettingsButton>
          <input
            ref={upload}
            type="file"
            disabled={locked}
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
  const api = useCapiro();
  const mutation = useSettingsMutation("branding");
  const sync = useSettingsAction(api);
  const uploadAction = useSettingsAction(api);
  const [receipt, setReceipt] = useState<BrandingSyncReceipt>();
  // A browser can reuse a decoded image within this document even with no-store.
  // These verified response fields distinguish its display identity, never its authority.
  const logoUrl =
    query.data?.logoUrl === "/api/firm-logo"
      ? `/api/firm-logo?${new URLSearchParams({
          scope: query.data.id,
          version: query.data.logoUploadedAt ?? "",
        })}`
      : query.data?.logoUrl;
  const status =
    receipt && query.data && receipt.name !== query.data.name
      ? "superseded"
      : receipt?.clerkSync;
  return (
    <div className={styles.stack}>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data ? (
          <BrandingForm
            key={`${query.data.id}:${query.data.name}:${query.data.logoUploadedAt}`}
            initialName={query.data.name}
            logoUrl={logoUrl}
            reload={query.reload}
            mutation={mutation}
            onSaved={setReceipt}
            onStart={() => {
              setReceipt(undefined);
              sync.clear();
            }}
            uploadAction={uploadAction}
            syncing={sync.busy}
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
      <SettingsMutationNotice
        pending={mutation.pending}
        busy={mutation.action.busy}
        reconcile={mutation.reconcile}
      />
      {mutation.action.error && (
        <SettingsNotice title="Company name result not confirmed" error>
          {mutation.action.error}
        </SettingsNotice>
      )}
      {(status || mutation.action.message) && (
        <SettingsNotice title={brandingSyncMessage[status ?? "unknown"]}>
          {(!status || canRetryBrandingSync(status)) && (
            <SettingsButton
              disabled={mutation.locked || sync.busy || uploadAction.busy}
              onClick={() =>
                void sync.run(
                  (signal) => retryBrandingSync(api, signal),
                  "Organization sync checked.",
                  (result) => {
                    setReceipt(result);
                    query.reload();
                  },
                )
              }
            >
              {sync.busy ? "Syncing…" : "Retry organization sync"}
            </SettingsButton>
          )}
        </SettingsNotice>
      )}
      {sync.error && (
        <SettingsNotice title="Organization sync not confirmed" error>
          {sync.error}
        </SettingsNotice>
      )}
    </div>
  );
}
