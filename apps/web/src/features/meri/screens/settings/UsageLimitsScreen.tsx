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
  runUsage: {
    title: string;
    firstColumnLabel?: string;
    rows: readonly UsageRow[];
  };
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
  /** Additive whole-job economics; other callers keep the plain attempt view by omitting it. */
  wholeJobs?: {
    title: string;
    description: string;
    facts: readonly { label: string; value: string }[];
    cost: { label: string; value: string; caption: string };
    footnote: string;
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
              columns={
                view.runUsage.firstColumnLabel
                  ? columns.map((column) =>
                      column.key === "run"
                        ? { ...column, label: view.runUsage.firstColumnLabel! }
                        : column,
                    )
                  : columns
              }
              rows={view.runUsage.rows}
            />
          </SettingsCard>
          {view.wholeJobs ? (
            <SettingsCard
              title={view.wholeJobs.title}
              description={view.wholeJobs.description}
            >
              <dl className={styles.policy}>
                {view.wholeJobs.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
                <div>
                  <dt>{view.wholeJobs.cost.label}</dt>
                  <dd>{view.wholeJobs.cost.value}</dd>
                </div>
              </dl>
              <p className={surfaces.caption}>{view.wholeJobs.cost.caption}</p>
              <p className={ui.muted}>{view.wholeJobs.footnote}</p>
            </SettingsCard>
          ) : null}
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
