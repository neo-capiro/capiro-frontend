"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { Badge, StatusPanel } from "../../../shared/module-ui";
import { SettingsButton, SettingsCard, SettingsTabs } from "../components";
import styles from "../styles";
import { AliasManager } from "./AliasManager";
import { AnalystAuditLog, QuarantineQueue } from "./AuditAndQuarantine";
import {
  PersonCandidateQueue,
  PersonnelMergeQueue,
} from "./PersonReviewQueues";
import { ProgramMatchQueue } from "./ProgramMatchQueue";
import { ReconciliationQueue } from "./ReconciliationQueue";
import { AnalystLinkQueue } from "./AnalystLinkQueue";

const panels: Record<string, () => ReactNode> = {
  reconciliation: () => <ReconciliationQueue />,
  matches: () => <ProgramMatchQueue />,
  aliases: () => <AliasManager />,
  people: () => <PersonCandidateQueue />,
  merges: () => <PersonnelMergeQueue />,
  quarantine: () => <QuarantineQueue />,
  audit: () => <AnalystAuditLog />,
};

export function AnalystSettings() {
  const counts = useCapiroQuery("settings.analyst.counts", {});
  const [tab, setTab] = useState("reconciliation");
  const data = counts.data;
  const items = [
    {
      id: "reconciliation",
      label: `Reconciliation${data ? ` (${data.reconciliation.openCount})` : ""}`,
    },
    {
      id: "matches",
      label: `Program matches${data ? ` (${data.programMatch.openCount})` : ""}`,
    },
    { id: "aliases", label: "Alias manager" },
    {
      id: "people",
      label: `Person candidates${data ? ` (${data.personCandidate.openCount})` : ""}`,
    },
    {
      id: "merges",
      label: `Merge candidates${data ? ` (${data.personnelMerge.openCount})` : ""}`,
    },
    {
      id: "quarantine",
      label: `Quarantine${data ? ` (${data.programQuarantine.count + data.personnelQuarantine.count})` : ""}`,
    },
    { id: "audit", label: "Audit log" },
    {
      id: "provisions",
      label: `Provision links${data ? ` (${data.provisionPeLink.candidateCount})` : ""}`,
    },
    { id: "sam", label: "SAM" },
  ];
  return (
    <div className={styles.stack} data-design-target="411:77704">
      <div className={styles.row}>
        <p className={`${styles.description} ${styles.grow}`}>
          One home for every review queue, with counts across the pipeline.
        </p>
        <SettingsButton small onClick={counts.reload}>
          Refresh counts
        </SettingsButton>
      </div>
      <StatusPanel
        loading={counts.loading}
        error={counts.error}
        onRetry={counts.reload}
      >
        {data && (
          <SettingsCard title="Pipeline review status">
            <div className={`${styles.row} ${styles.wrap}`}>
              <Badge>
                Reconciliation: {data.reconciliation.openCount} open
              </Badge>
              <Badge>PE→Program: {data.programMatch.openCount} open</Badge>
              <Badge>
                Person candidates: {data.personCandidate.openCount} open
              </Badge>
              <Badge>
                Personnel merge: {data.personnelMerge.openCount} open
              </Badge>
              <Badge>
                Provision links: {data.provisionPeLink.candidateCount}
              </Badge>
              <Badge>Program quarantine: {data.programQuarantine.count}</Badge>
              <Badge>
                Personnel quarantine: {data.personnelQuarantine.count}
              </Badge>
            </div>
          </SettingsCard>
        )}
      </StatusPanel>
      <SettingsTabs
        label="Analyst review queues"
        items={items}
        value={tab}
        onChange={setTab}
      />
      {tab === "provisions" || tab === "sam" ? (
        <AnalystLinkQueue
          kind={tab === "provisions" ? "provision" : "sam"}
          refreshCounts={counts.reload}
        />
      ) : (
        panels[tab]?.()
      )}
    </div>
  );
}
