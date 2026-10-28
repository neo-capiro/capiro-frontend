"use client";

import Link from "next/link";
import { MemoryGovernanceCenter } from "./memory/MemoryGovernanceCenter";
import { MemoryFiles } from "./memory/MemoryFiles";
import { SettingsCard, SettingsNotice } from "./components";
import styles from "./styles";

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
      <MemoryGovernanceCenter readOnly={readOnlyPreview} />
      <MemoryFiles />
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
