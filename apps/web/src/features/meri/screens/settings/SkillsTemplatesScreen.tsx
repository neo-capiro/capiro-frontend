"use client";
import type { ReactNode } from "react";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import surfaces from "../../ui/surfaces.module.css";
import ui from "../../ui/meri-ui.module.css";
import { SettingsCard } from "./SettingsCard";
import { SettingsCallout } from "./SettingsCallout";
import { SettingsLayout } from "./SettingsLayout";
import type {
  SettingsChrome,
  SettingsHeading,
  SettingsNotice,
} from "./settings-view";
import styles from "./settings.module.css";

export type TemplateRow = {
  id: string;
  template: string;
  owner: string;
  output: string;
};

export type SkillsTemplatesView = {
  heading: SettingsHeading;
  skills: {
    title: string;
    description: string;
    items: readonly { title: string; description: string; output: string }[];
  };
  approved: { title: string; rows: readonly TemplateRow[]; footnote: string };
  notices: readonly SettingsNotice[];
};

const columns: readonly DataColumn<TemplateRow>[] = [
  {
    key: "template",
    label: "Template",
    width: 222,
    render: (row) => row.template,
  },
  { key: "owner", label: "Owner", width: 100, render: (row) => row.owner },
  { key: "output", label: "Output", width: 120, render: (row) => row.output },
];

/** 09.04 Skills and artifact templates: workspace-approved starting points; none grants permission. */
export function SkillsTemplatesScreen({
  chrome,
  view,
  governance,
}: {
  chrome: SettingsChrome;
  view: SkillsTemplatesView;
  /**
   * Live firm procedure governance owned by the existing admin-gated Core routes. Supplied by the
   * caller so the designed fixture view above keeps rendering unchanged when it is absent.
   */
  governance?: ReactNode;
}) {
  const { skills, approved } = view;
  return (
    <SettingsLayout
      chrome={chrome}
      heading={view.heading}
      primary={
        <>
          <SettingsCard title={skills.title} description={skills.description}>
            <ul className={styles.skills} aria-label={skills.title}>
              {skills.items.map((skill) => (
                <li key={skill.title} className={styles.skill}>
                  <h3>{skill.title}</h3>
                  <p className={ui.muted}>{skill.description}</p>
                  <div className={styles.skillAction}>
                    <button
                      type="button"
                      className={ui.outline}
                      disabled
                      title={chrome.unavailable}
                    >
                      Use skill
                    </button>
                    <p className={surfaces.caption}>{skill.output}</p>
                  </div>
                </li>
              ))}
            </ul>
          </SettingsCard>
          {governance ? (
            <SettingsCard title="Firm procedures">{governance}</SettingsCard>
          ) : null}
        </>
      }
      supporting={
        <>
          <SettingsCard title={approved.title}>
            <DataTable
              caption={approved.title}
              columns={columns}
              rows={approved.rows}
            />
            <button
              type="button"
              className={ui.outline}
              disabled
              title={chrome.unavailable}
            >
              Attach a permitted template
            </button>
            <p className={ui.muted}>{approved.footnote}</p>
          </SettingsCard>
          {view.notices.map((notice) => (
            <SettingsCallout key={notice.title} notice={notice} />
          ))}
        </>
      }
    />
  );
}
