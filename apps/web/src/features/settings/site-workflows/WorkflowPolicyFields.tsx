"use client";
import {
  SITE_WORKFLOW_TOOLS,
  SITE_WORKFLOW_INTERACTIONS,
  SITE_WORKFLOW_FORMATS,
  type SiteWorkflowTool,
} from "@capiro/shared/site-workflows";
import { SettingField, SettingsCard } from "../components";
import styles from "../styles";
import type { WorkflowFieldsProps } from "./form";
const toolLabels: Record<SiteWorkflowTool, string> = {
  browser_navigate: "Open a page",
  browser_navigate_back: "Go back",
  browser_snapshot: "Read a page",
  browser_click: "Click",
  browser_type: "Type",
  browser_fill_form: "Fill a form",
  browser_select_option: "Select an option",
  browser_press_key: "Press a key",
  browser_hover: "Hover",
  browser_wait_for: "Wait for page content",
  browser_take_screenshot: "Capture a screenshot",
  browser_tabs: "Manage tabs",
  browser_handle_dialog: "Respond to a dialog",
  browser_close: "Close the browser",
};
export function WorkflowPolicyFields({ value, change }: WorkflowFieldsProps) {
  return (
    <SettingsCard title="Actions and session policy">
      <WorkflowActions value={value} change={change} existing={false} />
      <p>Every signed-in interaction requires approval when it is requested.</p>
      <SettingField label="End the signed-in session after this many idle minutes (1–480)">
        <input
          className={styles.input}
          type="number"
          min={1}
          max={480}
          step={1}
          required
          value={value.sessionTtlMs / 60000}
          onChange={(e) =>
            change({ ...value, sessionTtlMs: Number(e.target.value) * 60000 })
          }
        />
      </SettingField>
      <DownloadFormats value={value} change={change} existing={false} />
      <DownloadLimits value={value} change={change} existing={false} />
      <SettingField label="Terms review reference">
        <input
          className={styles.input}
          maxLength={200}
          value={value.tosReviewRef ?? ""}
          onChange={(e) =>
            change({ ...value, tosReviewRef: e.target.value || null })
          }
        />
      </SettingField>
      <SettingField label="Website qualification reference">
        <input
          className={styles.input}
          maxLength={200}
          value={value.qualificationEvidenceRef ?? ""}
          onChange={(e) =>
            change({
              ...value,
              qualificationEvidenceRef: e.target.value || null,
            })
          }
        />
      </SettingField>
    </SettingsCard>
  );
}

function WorkflowActions({ value, change }: WorkflowFieldsProps) {
  const toggle = (tool: SiteWorkflowTool) => {
    const tools = value.tools.includes(tool)
      ? value.tools.filter((t) => t !== tool)
      : [...value.tools, tool];
    change({
      ...value,
      tools,
      approvalRequired: tools.filter((t) =>
        (SITE_WORKFLOW_INTERACTIONS as readonly string[]).includes(t),
      ),
    });
  };
  return (
    <>
      <fieldset>
        <legend>Allowed actions</legend>
        {SITE_WORKFLOW_TOOLS.map((tool) => (
          <label key={tool} className={styles.row}>
            <input
              type="checkbox"
              checked={value.tools.includes(tool)}
              onChange={() => toggle(tool)}
            />
            {toolLabels[tool]}
          </label>
        ))}
      </fieldset>
    </>
  );
}

function DownloadFormats({ value, change }: WorkflowFieldsProps) {
  return (
    <>
      <fieldset>
        <legend>Download formats</legend>
        {SITE_WORKFLOW_FORMATS.map((format) => (
          <label key={format} className={styles.row}>
            <input
              type="checkbox"
              checked={value.downloads.formats.includes(format)}
              onChange={() =>
                change({
                  ...value,
                  downloads: {
                    ...value.downloads,
                    formats: value.downloads.formats.includes(format)
                      ? value.downloads.formats.filter((f) => f !== format)
                      : [...value.downloads.formats, format],
                  },
                })
              }
            />
            {format.toUpperCase()}
          </label>
        ))}
      </fieldset>
    </>
  );
}

function DownloadLimits({ value, change }: WorkflowFieldsProps) {
  return (
    <>
      <SettingField label="Maximum downloaded files (0 disables downloads)">
        <input
          className={styles.input}
          type="number"
          min={0}
          max={50}
          required
          value={value.downloads.maxFiles}
          onChange={(e) =>
            change({
              ...value,
              downloads: {
                ...value.downloads,
                maxFiles: Number(e.target.value),
              },
            })
          }
        />
      </SettingField>
      <SettingField label="Maximum bytes per downloaded file">
        <input
          className={styles.input}
          type="number"
          min={1}
          max={26214400}
          required
          value={value.downloads.maxBytes}
          onChange={(e) =>
            change({
              ...value,
              downloads: {
                ...value.downloads,
                maxBytes: Number(e.target.value),
              },
            })
          }
        />
      </SettingField>
    </>
  );
}
