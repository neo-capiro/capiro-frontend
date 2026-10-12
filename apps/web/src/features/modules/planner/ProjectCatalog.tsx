"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { PlannerProject } from "../../../shared/capiro/operations/planner-schemas";
import {
  ActionButton,
  Badge,
  Field,
  Modal,
  Panel,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import { CopyProjectDialog } from "./CopyProjectDialog";
import styles from "./planner.module.css";
import { dayLabel } from "./task-presentation";
export function ProjectCatalog({
  projects,
  onOpen,
  onReload,
}: {
  projects: PlannerProject[];
  onOpen: (id: string) => void;
  onReload: () => void;
}) {
  const {
    archived,
    setArchived,
    dialog,
    setDialog,
    error,
    busy,
    copy,
    setCopy,
    archive,
  } = useProjectCatalog(onReload);
  return (
    <div className={styles.stack}>
      <div className={styles.tools}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={archived}
            onChange={(event) => setArchived(event.target.checked)}
          />
          Archived projects
        </label>
        <ActionButton
          primary
          className={styles.toolbarEnd}
          onClick={() => setDialog("new")}
        >
          + New project
        </ActionButton>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.cards}>
        {projects
          .filter((project) => project.archived === archived)
          .map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              busy={busy}
              onOpen={onOpen}
              onEdit={setDialog}
              onCopy={setCopy}
              onArchive={archive}
            />
          ))}
      </div>
      {projects.filter((project) => project.archived === archived).length ===
        0 && (
        <Panel>
          <div className={styles.emptyLayout}>
            <h2>No {archived ? "archived" : "active"} projects</h2>
            <p className={styles.muted}>
              Create a project to organize your team&apos;s work.
            </p>
          </div>
        </Panel>
      )}
      <Modal
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={dialog === "new" ? "New project" : "Edit project"}
        description="Keep task configuration with its project."
      >
        {dialog && (
          <ProjectForm
            key={typeof dialog === "object" ? dialog.id : "new"}
            project={typeof dialog === "object" ? dialog : undefined}
            onClose={() => setDialog(null)}
            onSaved={onReload}
          />
        )}
      </Modal>
      {copy && (
        <CopyProjectDialog
          resource={copy}
          kind="project"
          onClose={() => setCopy(null)}
          onCreated={() => {
            setCopy(null);
            onReload();
          }}
        />
      )}
    </div>
  );
}
function ProjectCard({
  project,
  busy,
  onOpen,
  onEdit: setDialog,
  onCopy: setCopy,
  onArchive: archive,
}: {
  project: PlannerProject;
  busy: boolean;
  onOpen: (id: string) => void;
  onEdit: (project: PlannerProject) => void;
  onCopy: (project: PlannerProject) => void;
  onArchive: (project: PlannerProject) => Promise<void>;
}) {
  return (
    <Panel>
      <div className={styles.cardBody}>
        <button
          className={`${styles.name} ${styles.cardTitle}`}
          onClick={() => onOpen(project.id)}
        >
          {project.name}
        </button>
        <p className={styles.muted}>
          {project.description || "No description"}
        </p>
        <div className={styles.inline}>
          <Badge
            tone={
              project.health === "on_track"
                ? "success"
                : project.health === "at_risk"
                  ? "warning"
                  : "neutral"
            }
          >
            {project.health.replaceAll("_", " ")}
          </Badge>
          <span className={styles.muted}>{dayLabel(project.dueOn)}</span>
        </div>
        <div className={styles.footer}>
          <ActionButton onClick={() => onOpen(project.id)}>
            Open project
          </ActionButton>
          <ActionButton onClick={() => setCopy(project)}>
            Duplicate
          </ActionButton>
          <ActionButton
            disabled={!["admin", "editor"].includes(project.access)}
            onClick={() => setDialog(project)}
          >
            Edit
          </ActionButton>
          <ActionButton
            disabled={project.access !== "admin" || busy}
            onClick={() => void archive(project)}
          >
            {project.archived ? "Restore" : "Archive"}
          </ActionButton>
        </div>
      </div>
    </Panel>
  );
}

function ProjectForm({
  project,
  onClose,
  onSaved,
}: {
  project?: PlannerProject;
  onClose: () => void;
  onSaved: () => void;
}) {
  const api = useCapiro();
  const [name, setName] = useState(project?.name ?? ""),
    [description, setDescription] = useState(project?.description ?? ""),
    [privacy, setPrivacy] = useState<"private" | "team">(
      project?.privacy ?? "private",
    ),
    [due, setDue] = useState(project?.dueOn ?? ""),
    [view, setView] = useState<PlannerProject["defaultView"]>(
      project?.defaultView ?? "list",
    ),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const data = {
        name,
        description,
        dueOn: due || null,
        defaultView: view,
        ...(!project || project.access === "admin" ? { privacy } : {}),
      };
      if (project)
        await api.request("planner.project.update", {
          params: { id: project.id },
          body: { version: project.version, data },
        });
      else await api.request("planner.project.create", { body: { data } });
      onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save project.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className={styles.form} onSubmit={(event) => void submit(event)}>
      <div className={styles.wide}>
        <Field label="Project name" htmlFor="project-name">
          <TextInput
            id="project-name"
            required
            maxLength={500}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </div>
      <div className={styles.wide}>
        <Field label="Description" htmlFor="project-description">
          <TextArea
            id="project-description"
            value={description}
            maxLength={50000}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
      </div>
      <ProjectOptions
        project={project}
        privacy={privacy}
        onPrivacy={setPrivacy}
        due={due}
        onDue={setDue}
        view={view}
        onView={setView}
      />
      {error && (
        <p role="alert" className={`${styles.error} ${styles.wide}`}>
          {error}
        </p>
      )}
      <div className={`${styles.footer} ${styles.wide}`}>
        <ActionButton type="button" onClick={onClose}>
          Cancel
        </ActionButton>
        <ActionButton primary type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save project"}
        </ActionButton>
      </div>
    </form>
  );
}

function ProjectOptions({
  project,
  privacy,
  onPrivacy: setPrivacy,
  due,
  onDue: setDue,
  view,
  onView: setView,
}: {
  project?: PlannerProject;
  privacy: "private" | "team";
  onPrivacy: (value: "private" | "team") => void;
  due: string;
  onDue: (value: string) => void;
  view: PlannerProject["defaultView"];
  onView: (value: PlannerProject["defaultView"]) => void;
}) {
  return (
    <>
      {" "}
      <Field label="Privacy" htmlFor="project-privacy">
        <select
          id="project-privacy"
          className={styles.select}
          value={privacy}
          onChange={(event) =>
            setPrivacy(event.target.value as "private" | "team")
          }
          disabled={project !== undefined && project.access !== "admin"}
        >
          <option value="private">Private</option>
          <option value="team">Team</option>
        </select>
      </Field>
      <Field label="Due date" htmlFor="project-due">
        <TextInput
          id="project-due"
          type="date"
          value={due}
          onChange={(event) => setDue(event.target.value)}
        />
      </Field>
      <Field label="Default view" htmlFor="project-view">
        <select
          id="project-view"
          className={styles.select}
          value={view}
          onChange={(event) =>
            setView(event.target.value as PlannerProject["defaultView"])
          }
        >
          {["list", "board", "calendar", "timeline", "gantt"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
    </>
  );
}

function useProjectCatalog(onReload: () => void) {
  const api = useCapiro();
  const [archived, setArchived] = useState(false),
    [dialog, setDialog] = useState<PlannerProject | "new" | null>(null),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false),
    [copy, setCopy] = useState<PlannerProject | null>(null);
  const archive = async (project: PlannerProject) => {
    setBusy(true);
    setError(undefined);
    try {
      await api.request("planner.project.update", {
        params: { id: project.id },
        body: {
          version: project.version,
          data: {},
          archived: !project.archived,
        },
      });
      onReload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update project.",
      );
    } finally {
      setBusy(false);
    }
  };
  return {
    archived,
    setArchived,
    dialog,
    setDialog,
    error,
    busy,
    copy,
    setCopy,
    archive,
  };
}
