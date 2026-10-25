"use client";
import type { ReactNode } from "react";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { LinkAction } from "../../ui/LinkAction";
import surfaces from "../../ui/surfaces.module.css";
import ui from "../../ui/meri-ui.module.css";
import { SettingsCard } from "./SettingsCard";
import { SettingsFields } from "./SettingsFields";
import { SettingsCallout } from "./SettingsCallout";
import { SettingsLayout } from "./SettingsLayout";
import type {
  SettingsChrome,
  SettingsField,
  SettingsHeading,
  SettingsLink,
  SettingsNotice,
} from "./settings-view";
import styles from "./settings.module.css";

export type UsageRow = {
  id: string;
  run: string;
  outcome: string;
  attempts: string;
  usage: string;
};

export type UsageLimitsView = {
  heading: SettingsHeading;
  metrics: readonly { label: string; value: string; caption: string }[];
  runUsage: { title: string; rows: readonly UsageRow[] };
  configuration: {
    title: string;
    fields: readonly SettingsField[];
    limits: readonly { label: string; value: string }[];
    footnote: string;
  };
  limitStates: {
    title: string;
    description: string;
    notices: readonly SettingsNotice[];
    queue: SettingsLink;
  };
};

const columns: readonly DataColumn<UsageRow>[] = [
  { key: "run", label: "Run", width: 130, render: (row) => row.run },
  {
    key: "outcome",
    label: "Outcome",
    width: 240,
    render: (row) => row.outcome,
  },
  {
    key: "attempts",
    label: "Attempts",
    width: 120,
    render: (row) => row.attempts,
  },
  { key: "usage", label: "Usage", width: 120, render: (row) => row.usage },
];

/** 09.03 Usage and workspace limits; the optional connected configuration keeps policy server-owned. */
export function UsageLimitsScreen({
  chrome,
  view,
  configurationContent,
}: {
  chrome: SettingsChrome;
  view: UsageLimitsView;
  configurationContent?: ReactNode;
}) {
  const { configuration, limitStates } = view;
  return (
    <SettingsLayout
      chrome={chrome}
      heading={view.heading}
      primary={
        <>
          <ul className={styles.metrics} aria-label="Usage summary">
            {view.metrics.map((metric) => (
              <li key={metric.label}>
                <SettingsCard title={metric.label}>
                  <p className={styles.metricValue}>{metric.value}</p>
                  <p className={surfaces.caption}>{metric.caption}</p>
                </SettingsCard>
              </li>
            ))}
          </ul>
          <SettingsCard title={view.runUsage.title}>
            <DataTable
              caption={view.runUsage.title}
              columns={columns}
              rows={view.runUsage.rows}
            />
          </SettingsCard>
          <SettingsCard title={configuration.title}>
            {configurationContent ?? (
              <>
                <SettingsFields fields={configuration.fields} mode="inactive" />
                <dl className={styles.policy}>
                  {configuration.limits.map((limit) => (
                    <div key={limit.label}>
                      <dt>{limit.label}</dt>
                      <dd>{limit.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className={ui.muted}>{configuration.footnote}</p>
              </>
            )}
          </SettingsCard>
        </>
      }
      supporting={
        <SettingsCard
          title={limitStates.title}
          description={limitStates.description}
        >
          {limitStates.notices.map((notice) => (
            <SettingsCallout key={notice.title} notice={notice} />
          ))}
          <LinkAction
            variant="outline"
            href={limitStates.queue.href}
            unavailable={chrome.unavailable}
          >
            {limitStates.queue.label}
          </LinkAction>
        </SettingsCard>
      }
    />
  );
}
