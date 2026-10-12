"use client";

import Link from "next/link";
import { useState } from "react";
import { useCapiro } from "../../shared/capiro/CapiroBoundary";
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
import { useSettingsAction } from "./useSettingsAction";

export function PersonalSettings({
  identity,
  refresh,
}: {
  identity: CapiroMe;
  refresh: () => void;
}) {
  const api = useCapiro();
  const [title, setTitle] = useState(identity.user.title ?? "");
  const action = useSettingsAction();
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
            void action.run(
              () => api.request("me.update", { body: { title } }),
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
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Add your title"
              />
            </SettingField>
          </div>
          <SettingsButton primary type="submit" disabled={action.busy}>
            {action.busy ? "Saving…" : "Save"}
          </SettingsButton>
        </form>
        {action.error && (
          <SettingsNotice title="Title could not be saved" error>
            {action.error}
          </SettingsNotice>
        )}
        {action.message && <SettingsNotice title={action.message} />}
      </SettingsCard>
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
      <EmailSignature />
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
