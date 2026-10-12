"use client";
import { useState } from "react";
import {
  defaultReportSettings,
  type LegiWatchReport,
  type ReportSettings,
} from "../../../../../shared/capiro/operations/legiwatch-report-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  StatusPanel,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import { officialToday } from "../hearings/calendar-dates";
import styles from "../legiwatch.module.css";

const flags = [
  { id: "summary", label: "Bill summary" },
  { id: "priority", label: "Priority" },
  { id: "internalComments", label: "Internal comments" },
  { id: "externalComments", label: "External comments" },
  { id: "billNotes", label: "Bill notes" },
  { id: "reportComments", label: "Report comments" },
  { id: "priorityOnly", label: "Priority only" },
  { id: "acceptOptionalGaps", label: "Accept optional source gaps" },
  { id: "includeArchived", label: "Include archived folders" },
] as const;
export function ReportEditor({
  report,
  open,
  onClose,
  onSaved,
  onGenerated,
}: {
  report?: LegiWatchReport;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onGenerated: (runId: string) => void;
}) {
  const [name, setName] = useState(report?.name ?? ""),
    [jurisdiction, setJurisdiction] = useState(report?.jurisdiction ?? "US"),
    [sessionKey, setSessionKey] = useState(report?.sessionKey ?? ""),
    [folderIds, setFolderIds] = useState<string[]>(report?.folderIds ?? []),
    [settings, setSettings] = useState<ReportSettings>(
      report?.settings ?? defaultReportSettings,
    ),
    [cutoff, setCutoff] = useState(officialToday()),
    [audience, setAudience] = useState<"external" | "internal">("external");
  const folders = useCapiroQuery("legiwatch.folders", {}),
    sessions = useCapiroQuery("legiwatch.folder.sessions", {
      params: { jurisdiction },
    });
  const create = useCapiroMutation("legiwatch.report.create"),
    update = useCapiroMutation("legiwatch.report.update"),
    duplicate = useCapiroMutation("legiwatch.report.duplicate"),
    generate = useCapiroMutation("legiwatch.report.generate");
  const pending =
      create.pending || update.pending || duplicate.pending || generate.pending,
    editable = !report || report.canEdit === true;
  async function save() {
    const body = { name, jurisdiction, sessionKey, folderIds, settings };
    try {
      if (report)
        await update.run({
          params: { id: report.id },
          body: { ...body, expectedVersion: report.version },
        });
      else await create.run({ body });
      onSaved();
    } catch {
      /* The mutation's error is rendered. */
    }
  }
  async function copy() {
    if (!report) return;
    try {
      await duplicate.run({ params: { id: report.id } });
      onSaved();
    } catch {
      /* Rendered below. */
    }
  }
  async function makeRun() {
    if (!report) return;
    try {
      const result = await generate.run({
        params: { id: report.id },
        body: { cutoff, audience, expectedVersion: report.version },
      });
      onGenerated(result.id);
    } catch {
      /* Rendered below. */
    }
  }
  const error =
    create.error ?? update.error ?? duplicate.error ?? generate.error;
  return (
    <Modal
      open={open}
      onOpenChange={(value) => {
        if (!value && !pending) onClose();
      }}
      title={report ? report.name : "Create report"}
      description="Definitions use canonical folders and sessions. Editing a definition requires its current version."
      footer={
        <>
          <ActionButton disabled={pending} onClick={onClose}>
            Close
          </ActionButton>
          {report && (
            <ActionButton disabled={pending} onClick={() => void copy()}>
              Duplicate
            </ActionButton>
          )}
          <ActionButton
            primary
            disabled={
              !editable ||
              pending ||
              !name.trim() ||
              !folderIds.length ||
              !sessionKey
            }
            onClick={() => void save()}
          >
            {pending ? "Working…" : "Save definition"}
          </ActionButton>
        </>
      }
    >
      <div className={styles.form}>
        <Field label="Report name" htmlFor="report-name">
          <TextInput
            id="report-name"
            value={name}
            maxLength={200}
            disabled={!editable}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <div className={styles.grid}>
          <SelectField
            id="report-jurisdiction"
            label="Jurisdiction"
            value={jurisdiction}
            onChange={(value) => {
              if (editable) {
                setJurisdiction(value);
                setSessionKey("");
                setFolderIds([]);
              }
            }}
          >
            <option value="US">Federal</option>
            <option value="FL">Florida</option>
          </SelectField>
          <SelectField
            id="report-session"
            label="Canonical session"
            value={sessionKey}
            onChange={(value) => {
              if (editable) setSessionKey(value);
            }}
          >
            <option value="">Select session</option>
            {sessions.data?.map((session) => (
              <option value={session.key} key={session.key}>
                {session.label}
              </option>
            ))}
          </SelectField>
        </div>
        <StatusPanel
          loading={folders.loading || sessions.loading}
          error={folders.error || sessions.error}
          onRetry={() => {
            folders.reload();
            sessions.reload();
          }}
        >
          <strong>Folders</strong>
          <div className={styles.checklist}>
            {folders.data
              ?.filter(
                (folder) =>
                  folder.jurisdiction === jurisdiction &&
                  (!folder.archived || settings.includeArchived),
              )
              .map((folder) => (
                <label className={styles.check} key={folder.id}>
                  <input
                    type="checkbox"
                    disabled={!editable}
                    checked={folderIds.includes(folder.id)}
                    onChange={(event) =>
                      setFolderIds((previous) =>
                        event.target.checked
                          ? [...previous, folder.id]
                          : previous.filter((id) => id !== folder.id),
                      )
                    }
                  />
                  {folder.name}
                  {folder.archived ? " · Archived" : ""} · {folder.count}{" "}
                  assignments
                </label>
              ))}
          </div>
        </StatusPanel>
        <div className={styles.grid}>
          <SelectField
            id="report-committees"
            label="Committee references"
            value={settings.committees}
            onChange={(value) => {
              if (editable)
                setSettings((previous) => ({
                  ...previous,
                  committees: value as ReportSettings["committees"],
                }));
            }}
          >
            <option value="off">Off</option>
            <option value="current">Current committee</option>
            <option value="all">All committees</option>
          </SelectField>
          <SelectField
            id="report-actions"
            label="Actions"
            value={settings.actions}
            onChange={(value) => {
              if (editable)
                setSettings((previous) => ({
                  ...previous,
                  actions: value as ReportSettings["actions"],
                }));
            }}
          >
            <option value="off">Off</option>
            <option value="last">Last action</option>
            <option value="last3">Last 3 actions</option>
            <option value="five_days">Last 5 days</option>
            <option value="all">All actions</option>
          </SelectField>
          <SelectField
            id="report-relations"
            label="Related bills"
            value={settings.relations}
            onChange={(value) => {
              if (editable)
                setSettings((previous) => ({
                  ...previous,
                  relations: value as ReportSettings["relations"],
                }));
            }}
          >
            <option value="off">Off</option>
            <option value="title">Title</option>
            <option value="title_action">Title and action</option>
          </SelectField>
          <SelectField
            id="report-order"
            label="Order"
            value={settings.order}
            onChange={(value) => {
              if (editable)
                setSettings((previous) => ({
                  ...previous,
                  order: value as ReportSettings["order"],
                }));
            }}
          >
            <option value="number">Bill number</option>
            <option value="folder">Folder</option>
            <option value="last_action">Last action</option>
          </SelectField>
          <SelectField
            id="report-links"
            label="Source links"
            value={settings.links}
            onChange={(value) => {
              if (editable)
                setSettings((previous) => ({
                  ...previous,
                  links: value as ReportSettings["links"],
                }));
            }}
          >
            <option value="public">Public sources</option>
            <option value="subscribers">Subscriber sources</option>
          </SelectField>
        </div>
        <div className={styles.checklist}>
          {flags.map((flag) => (
            <label className={styles.check} key={flag.id}>
              <input
                type="checkbox"
                disabled={!editable}
                checked={settings[flag.id]}
                onChange={(event) =>
                  setSettings((previous) => ({
                    ...previous,
                    [flag.id]: event.target.checked,
                  }))
                }
              />
              {flag.label}
            </label>
          ))}
        </div>
        {report && (
          <section className={styles.card}>
            <h2>Generate frozen run</h2>
            <p className={styles.description}>
              Uses the saved definition, version {report.version}. Save edits
              before generating.
            </p>
            <Field label="Legislative cutoff" htmlFor="report-cutoff">
              <TextInput
                id="report-cutoff"
                type="date"
                value={cutoff}
                max={officialToday()}
                onChange={(event) => setCutoff(event.target.value)}
              />
            </Field>
            <SelectField
              id="report-audience"
              label="Audience"
              value={audience}
              onChange={(value) =>
                setAudience(value as "external" | "internal")
              }
            >
              <option value="external">External</option>
              <option value="internal">Internal</option>
            </SelectField>
            <ActionButton
              disabled={pending || !cutoff || report.archived}
              onClick={() => void makeRun()}
            >
              Generate frozen run
            </ActionButton>
          </section>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error.message}
          </p>
        )}
      </div>
    </Modal>
  );
}
