"use client";

import { ScopedLink as Link } from "../../shared/shell/ScopedLink";
import { useState } from "react";
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
  return (
    <div className={styles.stack} data-design-target="411:67666">
      <PersonalTitle
        identity={identity}
        refresh={refresh}
        readOnlyPreview={readOnlyPreview}
      />
      <SettingsCard title="Account">
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
      {readOnlyPreview ? (
        <SettingsNotice title="Read-only preview">
          Your identity is available. Profile edits and signature reads are
          unavailable in this server mode.
        </SettingsNotice>
      ) : (
        <EmailSignature />
      )}
      <SettingsCard
        title="Watchlist and monitoring setup"
        description="Manage the client watchlists and monitoring settings used by LegiWatch."
      >
        <Link href="/modules/legiwatch">Open monitoring setup</Link>
      </SettingsCard>
      <p className={styles.description}>
        Email, password and two-step verification are managed in your profile.
        Open the account menu at the top right and choose Profile.
      </p>
      <p className={styles.description}>
        <Link href="/settings/meri-preferences">
          Meri workspace preferences
        </Link>
      </p>
    </div>
  );
}

/** The title form owns its draft and existing receipt/recovery lifecycle. */
function PersonalTitle({
  identity,
  refresh,
  readOnlyPreview,
}: {
  identity: CapiroMe;
  refresh: () => void;
  readOnlyPreview: boolean;
}) {
  const mutation = useSettingsMutation("personal", identity.user.id);
  const { api, action, locked } = mutation;
  const [title, setTitle] = useState(identity.user.title ?? "");
  return (
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
          void action.run(
            async (signal) => {
              if (readOnlyPreview)
                throw new Error(
                  "Profile editing is unavailable in read-only preview.",
                );
              const result = await api.request(
                "me.update",
                { body: { title } },
                { signal },
              );
              if (
                result.user.id !== identity.user.id ||
                result.user.title !== (title.trim() || null)
              )
                throw new Error(
                  "The response did not confirm this profile. Reload before making another change.",
                );
              return result;
            },
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
              maxLength={120}
              disabled={readOnlyPreview || locked}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Add your title"
            />
          </SettingField>
        </div>
        <SettingsButton
          primary
          type="submit"
          disabled={readOnlyPreview || locked}
        >
          {action.busy ? "Saving…" : "Save"}
        </SettingsButton>
      </form>
      {action.error && (
        <SettingsNotice title="Title could not be saved" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      <SettingsMutationNotice {...mutation} busy={action.busy} />
    </SettingsCard>
  );
}
