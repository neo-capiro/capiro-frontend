"use client";

import { DataTable, TextArea, TextInput } from "../../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsCard,
  SettingsNotice,
} from "../components";
import styles from "../styles";

export function PreferenceConnections() {
  return (
    <div className={styles.stack} data-design-target="448:87595">
      <SettingsCard
        title="Connections"
        description="Authorized accounts and source health"
      >
        <DataTable
          rows={[]}
          rowKey={() => ""}
          caption="Meri authorized connections"
          emptyMessage="Meri connection data is unavailable."
          columns={[
            "Connection",
            "Account / scope",
            "Status",
            "Last refresh",
          ].map((label) => ({ key: label, label, render: () => "—" }))}
        />
        <div className={styles.row}>
          <SettingsButton disabled>Reconnect selected</SettingsButton>
          <SettingsButton disabled>View coverage</SettingsButton>
          <SettingsButton danger disabled>
            Disconnect
          </SettingsButton>
        </div>
      </SettingsCard>
      <SettingsNotice title="Granted scope">
        Private mail and memory remain limited to their granted audience.
        Administrators manage tenant policies separately from personal
        preferences.
      </SettingsNotice>
    </div>
  );
}

export function PreferenceUsage() {
  return (
    <div className={styles.stack} data-design-target="448:87836">
      <p className={styles.description}>
        This workspace · Includes successful, failed, cancelled and retried
        attempts.
      </p>
      <div className={styles.grid}>
        {["Today’s usage", "Current run", "Available capacity"].map((label) => (
          <div key={label} className={styles.metric}>
            <span>{label}</span>
            <strong>—</strong>
          </div>
        ))}
      </div>
      <SettingsCard title="Run usage">
        <DataTable
          rows={[]}
          rowKey={() => ""}
          caption="Meri run usage"
          emptyMessage="Meri run usage is unavailable."
          columns={["Run", "Outcome", "Attempts", "Usage"].map((label) => ({
            key: label,
            label,
            render: () => "—",
          }))}
        />
      </SettingsCard>
      <SettingsCard title="Workspace configuration">
        <SettingField label="Agent model">
          <TextInput
            readOnly
            value="Workspace-approved configuration unavailable"
          />
        </SettingField>
        <SettingField label="Run limits">
          <TextInput
            readOnly
            value="Budget, concurrency and deadline enforced by workspace policy"
          />
        </SettingField>
        <p className={styles.description}>
          Configuration controls are shown only to authorized administrators.
          Ordinary users see their effective limits and usage.
        </p>
        <SettingsButton disabled>View limit states</SettingsButton>
      </SettingsCard>
    </div>
  );
}

export function PreferenceSkills() {
  return (
    <div className={styles.stack} data-design-target="448:88066">
      <p className={styles.description}>
        Reusable ways to begin supported work.
      </p>
      <div className={styles.grid}>
        {(
          [
            [
              "Research brief",
              "A sourced brief with explicit coverage and current facts.",
            ],
            [
              "Spreadsheet analysis",
              "Verified values, charts and supported formulas.",
            ],
            [
              "Client update deck",
              "A concise deck with speaker notes and references.",
            ],
          ] as const
        ).map(([title, description]) => (
          <SettingsCard key={title} title={title} description={description}>
            <SettingsButton disabled>Use skill</SettingsButton>
          </SettingsCard>
        ))}
      </div>
      <SettingsCard title="Approved artifact templates">
        <DataTable
          rows={[]}
          rowKey={() => ""}
          caption="Meri artifact templates"
          emptyMessage="Approved template data is unavailable."
          columns={["Template", "Owner", "Available output"].map((label) => ({
            key: label,
            label,
            render: () => "—",
          }))}
        />
        <SettingsButton disabled>Attach a permitted template</SettingsButton>
        <p className={styles.description}>
          Template uploads follow your workspace role. Brand assets and examples
          retain their source permissions.
        </p>
      </SettingsCard>
    </div>
  );
}

export function PreferenceNotifications() {
  return (
    <div className={styles.stack} data-design-target="448:89130">
      <SettingsCard
        title="Workspace updates"
        description="Run outcomes, decisions and connection changes"
      >
        <p className={styles.empty}>
          Workspace updates are unavailable until Meri is connected.
        </p>
      </SettingsCard>
      <SettingsNotice title="Account updates">
        Client and tenant permissions are checked across every Meri view.
      </SettingsNotice>
    </div>
  );
}

export function PreferencePrivacy() {
  return (
    <div className={styles.stack} data-design-target="448:89371">
      <p className={styles.description}>
        Your content follows workspace access and retention policies.
      </p>
      <SettingsCard
        title="Delete this conversation?"
        description="Only delete if permitted by your workspace policy."
      >
        <p className={styles.description}>
          The conversation and its Meri workspace files will be removed from
          your view. Filed client records and recorded action receipts follow
          their own retention rules.
        </p>
        <SettingsNotice title="Some records may be retained">
          Governed receipts and legally retained records cannot be removed
          through this conversation action.
        </SettingsNotice>
        <SettingsButton danger disabled>
          Delete conversation
        </SettingsButton>
      </SettingsCard>
      <SettingsCard
        title="Disconnect the research portal?"
        description="Future retrieval stops. Existing conversations and outputs are rechecked against current access before they can be opened."
      >
        <SettingsButton disabled>Confirm disconnect</SettingsButton>
      </SettingsCard>
    </div>
  );
}

export function PreferenceHelp() {
  const shortcuts: [string, string][] = [
    ["Search workspace", "⌘K / Ctrl+K"],
    ["Send message", "Enter"],
    ["New line", "Shift+Enter"],
    ["Close dialog", "Esc"],
    ["Move between controls", "Tab / Shift+Tab"],
    ["Select search result", "↑ / ↓ then Enter"],
  ];
  return (
    <div className={styles.stack} data-design-target="448:89562">
      <SettingsCard
        title="Meri help"
        description="Supported work, shortcuts and reporting a problem"
      >
        <DataTable
          rows={shortcuts}
          rowKey={(row) => row[0]}
          caption="Designed Meri shortcuts"
          columns={[
            { key: "action", label: "Action", render: (row) => row[0] },
            { key: "shortcut", label: "Shortcut", render: (row) => row[1] },
          ]}
        />
        <p className={styles.description}>
          These are the designed shortcuts. Meri’s current implementation will
          determine which are available.
        </p>
      </SettingsCard>
      <SettingsCard title="Supported work">
        <p className={styles.description}>
          Research · Analysis · Artifact creation and revision · Memory
          proposals · Task proposals · Filing · Scheduled drafting
        </p>
      </SettingsCard>
      <SettingsCard title="Report a problem">
        <SettingField label="What happened?">
          <TextArea disabled placeholder="Describe the problem" />
        </SettingField>
        <SettingField label="Include run reference">
          <TextInput disabled placeholder="Run reference" />
        </SettingField>
        <p className={styles.description}>
          Conversation content and private files are not attached automatically.
        </p>
        <SettingsButton primary disabled>
          Submit feedback
        </SettingsButton>
      </SettingsCard>
    </div>
  );
}
