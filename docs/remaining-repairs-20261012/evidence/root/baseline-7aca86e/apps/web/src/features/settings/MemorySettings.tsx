"use client";

import { useState } from "react";
import { DataTable, TextArea, TextInput } from "../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsCard,
  SettingsDialog,
  SettingsNotice,
  SettingsTabs,
} from "./components";
import styles from "./styles";

const reason =
  "The new Meri service has not exposed a verified memory settings contract. These controls will be available after that connection is configured.";
const governanceTabs = [
  "Overview",
  "Active",
  "Pending review",
  "Conflicts",
  "Review due",
  "History",
  "Access grants",
  "Transition history",
  "Projection health",
];

export function MemorySettings() {
  const [inboxTab, setInboxTab] = useState("Needs my review");
  const [governance, setGovernance] = useState("Overview");
  const [fileTab, setFileTab] = useState("Firm");
  const [grant, setGrant] = useState(false);
  return (
    <div className={styles.stack} data-design-target="411:67920">
      <SettingsNotice title="Memory connection unavailable">
        {reason}
      </SettingsNotice>
      <SettingsCard
        title="Memory Review Inbox"
        action={
          <SettingsButton small disabled title={reason}>
            Refresh
          </SettingsButton>
        }
      >
        <div className={styles.grid}>
          {["Needs my review", "Submitted by me", "Blocked"].map((label) => (
            <div className={styles.metric} key={label}>
              <span>{label}</span>
              <strong>—</strong>
            </div>
          ))}
        </div>
        <SettingsTabs
          label="Memory reviews"
          items={[
            "Needs my review",
            "Submitted by me",
            "All pending",
            "Blocked",
            "History",
          ].map((label) => ({ id: label, label }))}
          value={inboxTab}
          onChange={setInboxTab}
        />
        <p className={styles.empty}>Memory review data is unavailable.</p>
        <div className={styles.row}>
          <SettingsButton small disabled title={reason}>
            Load more
          </SettingsButton>
        </div>
      </SettingsCard>
      <SettingsCard
        title="Review notifications"
        action={
          <SettingsButton small disabled title={reason}>
            Mark all read
          </SettingsButton>
        }
      >
        <p className={styles.empty}>Review notifications are unavailable.</p>
      </SettingsCard>
      <SettingsCard title="Memory Governance Center">
        <SettingsTabs
          label="Memory governance"
          items={governanceTabs.map((label) => ({ id: label, label }))}
          value={governance}
          onChange={setGovernance}
        />
        {governance === "Access grants" ? (
          <>
            <div className={styles.row}>
              <div className={styles.grow}>
                <SettingField label="Client">
                  <select className={styles.input} disabled>
                    <option>Client memory unavailable</option>
                  </select>
                </SettingField>
              </div>
              <SettingsButton primary onClick={() => setGrant(true)}>
                Add grant
              </SettingsButton>
            </div>
            <DataTable
              rows={[]}
              rowKey={() => ""}
              caption="Memory access grants"
              emptyMessage="Access grant data is unavailable."
              columns={[
                "User",
                "Permissions",
                "Status",
                "Expires",
                "Reason",
                "Actions",
              ].map((label) => ({ key: label, label, render: () => "—" }))}
            />
          </>
        ) : (
          <p className={styles.empty}>
            {governance} data is unavailable until Meri memory is connected.
          </p>
        )}
      </SettingsCard>
      <SettingsCard title="Memory files">
        <SettingsTabs
          label="Memory files"
          items={["Firm", "My files"].map((label) => ({ id: label, label }))}
          value={fileTab}
          onChange={setFileTab}
        />
        <div className={styles.row}>
          <h3 className={styles.grow}>
            {fileTab === "Firm"
              ? "Firm profile and positioning"
              : "Personal memory files"}
          </h3>
          <SettingsButton disabled title={reason}>
            Submit for review
          </SettingsButton>
        </div>
        <SettingField label="Who we are">
          <TextArea placeholder="How the firm describes itself." disabled />
        </SettingField>
        <SettingField label="Positioning">
          <TextArea
            placeholder="What the firm wants to be known for."
            disabled
          />
        </SettingField>
        <h3>Active clients</h3>
        <p className={styles.description}>
          Updated automatically from your portfolio after the memory service is
          connected.
        </p>
      </SettingsCard>
      <SettingsDialog
        open={grant}
        onClose={() => setGrant(false)}
        title="Grant client memory access"
        footer={
          <>
            <SettingsButton onClick={() => setGrant(false)}>
              Cancel
            </SettingsButton>
            <SettingsButton primary disabled title={reason}>
              Submit
            </SettingsButton>
          </>
        }
      >
        <SettingField label="Active tenant member user ID">
          <TextInput disabled />
        </SettingField>
        <SettingField label="Permissions">
          <select className={styles.input} disabled>
            <option>Read, Propose</option>
            <option>Read</option>
          </select>
        </SettingField>
        <SettingField label="Reason">
          <TextArea disabled placeholder="Why does this person need access?" />
        </SettingField>
        <SettingField label="Expires at">
          <TextInput type="datetime-local" disabled />
        </SettingField>
        <SettingsNotice title="Grant unavailable">{reason}</SettingsNotice>
      </SettingsDialog>
    </div>
  );
}
