"use client";
import type { ReactNode } from "react";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import { SettingsCard } from "./SettingsCard";
import { SettingsCallout } from "./SettingsCallout";
import { SettingsLayout } from "./SettingsLayout";
import type {
  SettingsChrome,
  SettingsHeading,
  SettingsLink,
  SettingsNotice,
  SettingsOutcome,
} from "./settings-view";

export type RetentionRow = { id: string; content: string; retention: string };

export type PrivacyDeletionView = {
  heading: SettingsHeading;
  stores: { title: string; description: string; rows: readonly RetentionRow[] };
  retained: {
    title: string;
    description: string;
    notices: readonly SettingsNotice[];
    states: SettingsLink;
  };
};

const columns: readonly DataColumn<RetentionRow>[] = [
  {
    key: "content",
    label: "Content class",
    width: 280,
    render: (row) => row.content,
  },
  {
    key: "retention",
    label: "Retention",
    width: 330,
    render: (row) => row.retention,
  },
];

/** 09.06 Privacy and deletion: retention is read-only workspace policy; export and deletion are requests. */
export function PrivacyDeletionScreen({
  chrome,
  view,
  outcome,
  policyState,
  conversationActions,
}: {
  chrome: SettingsChrome;
  view: PrivacyDeletionView;
  outcome?: SettingsOutcome | undefined;
  policyState?: ReactNode;
  conversationActions?: ReactNode;
}) {
  const { stores, retained } = view;
  return (
    <SettingsLayout
      chrome={chrome}
      heading={view.heading}
      outcome={outcome}
      primary={
        <SettingsCard title={stores.title} description={stores.description}>
          {policyState}
          <DataTable
            caption={stores.title}
            columns={columns}
            rows={stores.rows}
          />
          <div className={ui.row}>
            {conversationActions ??
              ["Export permitted messages", "Delete conversation"].map(
                (action) => (
                  <button
                    key={action}
                    type="button"
                    className={ui.outline}
                    disabled
                    title={chrome.unavailable}
                  >
                    {action}
                  </button>
                ),
              )}
          </div>
        </SettingsCard>
      }
      supporting={
        <SettingsCard
          title={retained.title}
          description={retained.description}
          emphasis
        >
          {retained.notices.map((notice) => (
            <SettingsCallout key={notice.title} notice={notice} />
          ))}
          <LinkAction
            variant="outline"
            href={retained.states.href}
            unavailable={chrome.unavailable}
          >
            {retained.states.label}
          </LinkAction>
        </SettingsCard>
      }
    />
  );
}
