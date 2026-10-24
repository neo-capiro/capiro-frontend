"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useState } from "react";
import { ScopedLink } from "../../shared/shell/ScopedLink";
import type { CapiroMe } from "../../shared/capiro/operations/settings-schemas";
import { TextInput } from "../../shared/module-ui";
import {
  SettingFacts,
  SettingField,
  SettingsButton,
  SettingsCard,
  SettingsNotice,
} from "./components";
import { EmailSignature } from "./SignatureSettings";
import styles from "./styles";
import { useSettingsMutation } from "./useSettingsMutation";
import { SettingsMutationNotice } from "./SettingsMutationNotice";

export function PersonalSettings({
  identity,
  refresh,
  readOnlyPreview = false,
}: {
  identity: CapiroMe;
  refresh: () => void;
  readOnlyPreview?: boolean;
}) {
  const { api, action, pending, reconcile, locked } =
    useSettingsMutation("personal-title");
  const { openUserProfile } = useClerk();
  const { isLoaded, isSignedIn } = useUser();
  const [title, setTitle] = useState(identity.user.title ?? "");
  return (
    <div className={styles.stack} data-design-target="411:67666">
      <SettingsCard
        title="Profile"
        description={
          "Shown under your name in the top-right menu, for example “Sr. Government Affairs Lead”."
        }
      >
        <form
          className={`${styles.row} ${styles.formRow}`}
          onSubmit={(event) => {
            event.preventDefault();
            if (readOnlyPreview) return;
            void action.run(
              (signal) =>
                api.request(
                  "me.update",
                  { body: { title: title.trim() } },
                  { signal },
                ),
              "Your title was saved.",
              refresh,
            );
          }}
        >
          <div className={styles.grow}>
            <SettingField label="Title">
              <TextInput
                className={styles.input}
                value={title}
                disabled={locked || readOnlyPreview}
                maxLength={120}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Add your title"
              />
            </SettingField>
          </div>
          <SettingsButton
            primary
            type="submit"
            disabled={locked || readOnlyPreview}
          >
            {action.busy ? "Saving…" : "Save"}
          </SettingsButton>
        </form>
        {readOnlyPreview && (
          <SettingsNotice title="Profile changes unavailable in preview">
            Your current identity is shown read-only.
          </SettingsNotice>
        )}
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
        {action.error && (
          <SettingsNotice title="Title could not be saved" error>
            {action.error}
          </SettingsNotice>
        )}
        {action.message && <SettingsNotice title={action.message} />}
      </SettingsCard>
      <SettingsCard title="Account">
        <SettingsButton
          disabled={!isLoaded || !isSignedIn}
          onClick={() => openUserProfile()}
        >
          Manage profile and security
        </SettingsButton>
        <SettingFacts
          items={[
            ["User ID", identity.user.id],
            ["Workspace", identity.tenant.slug],
            [
              "Role",
              identity.role
                .replaceAll("_", " ")
                .replace(/^./, (character) => character.toUpperCase()),
            ],
          ]}
        />
      </SettingsCard>
      <EmailSignature readOnlyPreview={readOnlyPreview} />
      <SettingsCard
        title="Watchlist and monitoring setup"
        description="Manage the client watchlists and monitoring settings used by LegiWatch."
      >
        <ScopedLink href="/modules/legiwatch">Open monitoring setup</ScopedLink>
      </SettingsCard>
      <p className={styles.description}>
        Email, password and two-step verification are managed in your profile.
        Choose Manage profile and security to open your Clerk account.
      </p>
      <p className={styles.description}>
        <ScopedLink href="/settings/meri-preferences">
          Meri workspace preferences
        </ScopedLink>
      </p>
    </div>
  );
}
