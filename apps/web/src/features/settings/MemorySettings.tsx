"use client";

import Link from "next/link";
import { useState } from "react";
import { TextArea } from "../../shared/module-ui";
import { MemoryAccessGrants } from "./memory/MemoryAccessGrants";
import {
  SettingField,
  SettingsButton,
  SettingsCard,
  SettingsNotice,
  SettingsTabs,
} from "./components";
import styles from "./styles";

const reason = "Memory governance and file settings are not connected yet.";
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

export function MemorySettings({
  reviewEnabled,
  readOnlyPreview = false,
}: {
  reviewEnabled: boolean;
  readOnlyPreview?: boolean;
}) {
  return (
    <div className={styles.stack} data-design-target="411:67920">
      <SettingsNotice title="New memory writes from Settings are unavailable">
        Retention and offboarding rules for personal, client and firm owners
        must be approved before Settings can create proposals or corrections.
      </SettingsNotice>
      <MemoryReviewCard enabled={reviewEnabled} />
      <SettingsCard title="Review notifications">
        <p className={styles.description}>
          View your in-app review notices and unread count, open the exact
          review, or mark notices read in Updates. External delivery is not
          confirmed here.
        </p>
        <Link href="/meri/updates">Open review notifications</Link>
      </SettingsCard>
      <MemoryGovernanceCard readOnly={readOnlyPreview} />
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

function MemoryGovernanceCard({ readOnly }: { readOnly: boolean }) {
  const [governance, setGovernance] = useState("Overview");
  return (
    <SettingsCard title="Memory Governance Center">
      <SettingsTabs
        label="Memory governance"
        items={governanceTabs.map((label) => ({ id: label, label }))}
        value={governance}
        onChange={setGovernance}
      />
      {governance === "Access grants" ? (
        <MemoryAccessGrants readOnly={readOnly} />
      ) : (
        <p className={styles.empty}>
          {governance} governance data is unavailable until its contract is
          verified.
        </p>
      )}
    </SettingsCard>
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
