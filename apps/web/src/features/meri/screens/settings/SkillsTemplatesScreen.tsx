"use client";
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
}: {
  chrome: SettingsChrome;
  view: SkillsTemplatesView;
}) {
  const { skills, approved } = view;
  return (
    <SettingsLayout
      chrome={chrome}
      heading={view.heading}
      primary={
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
