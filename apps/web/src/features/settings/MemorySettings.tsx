"use client";

import Link from "next/link";
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
  "Memory governance, file, and notification settings do not have verified service contracts yet.";
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

export function MemorySettings({ reviewEnabled }: { reviewEnabled: boolean }) {
  return (
    <div className={styles.stack} data-design-target="411:67920">
      <SettingsNotice title="Memory governance, files, and notifications unavailable">
        {reason}
      </SettingsNotice>
      <MemoryReviewCard enabled={reviewEnabled} />
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
      <MemoryGovernanceCard />
      <MemoryFilesCard />
    </div>
  );
}

function MemoryReviewCard({ enabled }: { enabled: boolean }) {
  return (
    <SettingsCard title="Memory Review Inbox">
      {enabled ? (
        <>
          <p className={styles.description}>
            Review your pending personal memory submissions and propose
            corrections to current personal memories. Core checks current
            ownership for each action.
          </p>
          <Link href="/meri/memory">Open personal memory review</Link>
        </>
      ) : (
        <SettingsNotice title="Personal memory review unavailable">
          The governed owner review connection has not been enabled for this
          workspace.
        </SettingsNotice>
      )}
    </SettingsCard>
  );
}

function MemoryGovernanceCard() {
  const [governance, setGovernance] = useState("Overview");
  const [grant, setGrant] = useState(false);
  return (
    <>
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
            {governance} governance data is unavailable until its contract is
            verified.
          </p>
        )}
      </SettingsCard>
      <MemoryGrantDialog open={grant} onClose={() => setGrant(false)} />
    </>
  );
}

function MemoryFilesCard() {
  const [fileTab, setFileTab] = useState("Firm");
  return (
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
        <TextArea placeholder="What the firm wants to be known for." disabled />
      </SettingField>
      <h3>Active clients</h3>
      <p className={styles.description}>
        Updated automatically from your portfolio after the memory service is
        connected.
      </p>
    </SettingsCard>
  );
}

function MemoryGrantDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <SettingsDialog
      open={open}
      onClose={onClose}
      title="Grant client memory access"
      footer={
        <>
          <SettingsButton onClick={onClose}>Cancel</SettingsButton>
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
  );
}
