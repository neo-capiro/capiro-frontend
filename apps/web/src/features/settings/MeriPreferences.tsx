"use client";

import { useState } from "react";
import { TextInput } from "../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsCard,
  SettingsNotice,
  SettingsTabs,
} from "./components";
import {
  PreferenceConnections,
  PreferenceHelp,
  PreferenceNotifications,
  PreferencePrivacy,
  PreferenceSkills,
  PreferenceUsage,
} from "./preferences/PreferencePages";
import styles from "./styles";

export function MeriPreferences() {
  const [page, setPage] = useState("personal");
  const [appearance, setAppearance] = useState("Light");
  const pages = {
    connections: PreferenceConnections,
    usage: PreferenceUsage,
    skills: PreferenceSkills,
    notifications: PreferenceNotifications,
    privacy: PreferencePrivacy,
    help: PreferenceHelp,
  };
  const Page =
    page === "personal" ? undefined : pages[page as keyof typeof pages];
  return (
    <div className={styles.stack} data-design-target="448:87360">
      <SettingsNotice title="Meri preferences connection unavailable">
        The new Meri backend owns writing preferences, connectors, limits,
        skills, notifications and privacy. A verified greenfield settings
        contract is required before these controls can be saved.
      </SettingsNotice>
      <SettingsTabs
        label="Meri preference pages"
        value={page}
        onChange={setPage}
        items={[
          { id: "personal", label: "Personal defaults" },
          { id: "connections", label: "Connections" },
          { id: "usage", label: "Usage and limits" },
          { id: "skills", label: "Skills and templates" },
          { id: "notifications", label: "Workspace updates" },
          { id: "privacy", label: "Privacy and retention" },
          { id: "help", label: "Help and shortcuts" },
        ]}
      />
      {Page ? (
        <Page />
      ) : (
        <div className={`${styles.grid} ${styles.two}`}>
          <SettingsCard title="Writing and workspace defaults">
            <SettingField label="Writing style">
              <TextInput
                disabled
                placeholder="Concise, direct and grounded in sources"
              />
            </SettingField>
            <SettingField label="Default scope">
              <TextInput
                disabled
                placeholder="Ask me when starting a new conversation"
              />
            </SettingField>
            <SettingField label="Artifact template">
              <TextInput disabled placeholder="Capiro client brief" />
            </SettingField>
            <div className={styles.row}>
              <SettingsButton primary disabled>
                Save preferences
              </SettingsButton>
              <SettingsButton disabled>Clear personal defaults</SettingsButton>
            </div>
          </SettingsCard>
          <SettingsCard title="Appearance">
            <SettingsTabs
              label="Appearance preview"
              value={appearance}
              onChange={setAppearance}
              items={["Light", "Dark", "System"].map((label) => ({
                id: label,
                label,
              }))}
            />
            <p className={styles.description}>
              {appearance} appearance is selected for preview. Preference
              persistence is unavailable.
            </p>
            <h3>Accessibility</h3>
            <label className={styles.check}>
              <input type="checkbox" disabled />
              Reduced motion
            </label>
            <p className={styles.description}>
              Use static progress and avoid animated shimmer.
            </p>
            <label className={styles.check}>
              <input type="checkbox" checked disabled />
              Keyboard navigation
            </label>
            <p className={styles.description}>
              Visible focus ring and accessible control names.
            </p>
            <label className={styles.check}>
              <input type="checkbox" disabled />
              Notifications
            </label>
            <p className={styles.description}>
              Completion, approval and connection updates.
            </p>
            <SettingsButton disabled>Keyboard shortcuts</SettingsButton>
            <SettingsButton disabled>Templates and skills</SettingsButton>
          </SettingsCard>
        </div>
      )}
    </div>
  );
}
