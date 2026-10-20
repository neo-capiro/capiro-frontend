"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type {
  PlannerPerson,
  PlannerProject,
  PlannerResource,
} from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import { CopyProjectDialog } from "./CopyProjectDialog";
import { FormPreview } from "./FormPreview";
import styles from "./planner.module.css";
import { ReportingDashboard } from "./ReportingDashboard";
import { resourceSectionKinds, strings } from "./resource-data";
import { ResourceEditor } from "./ResourceEditor";
type Props = {
  section: string;
  people: PlannerPerson[];
  projects: PlannerProject[];
  onOpenProject: (id: string) => void;
};
type Model = ReturnType<typeof useCatalog>;
type EditorTarget = {
  kind: PlannerResource["kind"];
  resource?: PlannerResource;
};
function useCatalog({ section }: Props) {
  const api = useCapiro();
  const query = useCapiroQuery("planner.resources", {});
  const [search, setSearch] = useState(""),
    [archived, setArchived] = useState(false),
    [edit, setEdit] = useState<EditorTarget | null>(null),
    [opened, setOpened] = useState<PlannerResource | null>(null),
    [template, setTemplate] = useState<PlannerResource | null>(null),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const kind = resourceSectionKinds[section]!;
  const rows =
    query.data?.filter(
      (item) =>
        item.kind === kind &&
        item.archived === archived &&
        item.name.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  const update = async (
    resource: PlannerResource,
    data?: Record<string, unknown>,
  ) => {
    setBusy(true);
    setError(undefined);
    try {
      await api.request("planner.resource.update", {
        params: { id: resource.id },
        body: {
          version: resource.version,
          ...(data ? { data } : { archived: !resource.archived }),
        },
      });
      query.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update resource.",
      );
    } finally {
      setBusy(false);
    }
  };
  return {
    query,
    search,
    setSearch,
    archived,
    setArchived,
    edit,
    setEdit,
    openEditor: (resource?: PlannerResource) =>
      setEdit({ kind: resource?.kind ?? kind, resource }),
    opened,
    setOpened,
    template,
    setTemplate,
    error,
    busy,
    kind,
    rows,
    update,
  };
}
export function ResourceCatalog(props: Props) {
  const m = useCatalog(props);
  return (
    <>
      {m.kind === "dashboard" && m.opened?.kind === "dashboard" ? (
        <ReportingDashboard
          dashboard={m.opened}
          onBack={() => m.setOpened(null)}
          onEdit={() => m.openEditor(m.opened!)}
          onReload={m.query.reload}
          editor={null}
        />
      ) : (
        <div className={styles.stack}>
          <div className={styles.tools}>
            <TextInput
              aria-label={`Search ${props.section}`}
              type="search"
              placeholder={`Search ${props.section}…`}
              value={m.search}
              onChange={(event) => m.setSearch(event.target.value)}
            />
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={m.archived}
                onChange={(event) => m.setArchived(event.target.checked)}
              />
              Archived
            </label>
            <ActionButton
              primary
              className={styles.toolbarEnd}
              onClick={() => m.openEditor()}
            >
              + New {m.kind === "dashboard" ? "dashboard" : m.kind}
            </ActionButton>
          </div>
          {m.error && (
            <p className={styles.error} role="alert">
              {m.error}
            </p>
          )}
          <StatusPanel
            loading={m.query.loading}
            error={m.query.error}
            onRetry={m.query.reload}
            empty={
              m.query.data && m.rows.length === 0
                ? `No ${props.section} in this view`
                : undefined
            }
          >
            <div className={styles.cards}>
              {m.rows.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  props={props}
                  model={m}
                />
              ))}
            </div>
          </StatusPanel>
        </div>
      )}
      <ResourceDialogs props={props} model={m} />
    </>
  );
}
function ResourceCard({
  resource,
  props,
  model: m,
}: {
  resource: PlannerResource;
  props: Props;
  model: Model;
}) {
  return (
    <Panel>
      <div className={styles.cardBody}>
        <h2 className={styles.cardTitle}>{resource.name}</h2>
        <p className={styles.muted}>
          {"description" in resource.data &&
          typeof resource.data.description === "string"
            ? resource.data.description
            : (props.projects.find(
                (project) => project.id === resource.projectId,
              )?.name ?? "Personal resource")}
        </p>
        {resource.kind === "goal" && (
          <>
            <div className={styles.tools}>
              <Badge>
                {String(resource.data.status ?? "on_track").replaceAll(
                  "_",
                  " ",
                )}
              </Badge>
              <span>
                {resource.goalProgress
                  ? `${Math.round(resource.goalProgress.percentage)}%`
                  : `${String(resource.data.current ?? 0)} / ${String(resource.data.target ?? 0)} ${String(resource.data.unit ?? "")}`}
              </span>
            </div>
            <div className={styles.progress}>
              <span
                style={{
                  width: `${Math.min(100, Math.max(0, resource.goalProgress?.percentage ?? 0))}%`,
                }}
              />
            </div>
          </>
        )}
        {resource.kind === "rule" && (
          <p className={styles.muted}>
            {resource.data.enabled ? "Enabled" : "Paused"} ·{" "}
            {String(resource.data.trigger ?? "").replaceAll("_", " ")}
          </p>
        )}
        {resource.kind === "form" && (
          <Badge tone={resource.data.enabled ? "success" : "neutral"}>
            {resource.data.enabled ? "Open" : "Closed"}
          </Badge>
        )}
        <ResourceActions resource={resource} props={props} model={m} />
      </div>
    </Panel>
  );
}
function ResourceActions({
  resource,
  props,
  model: m,
}: {
  resource: PlannerResource;
  props: Props;
  model: Model;
}) {
  return (
    <div className={styles.footer}>
      {m.kind === "template" && (
        <ActionButton onClick={() => m.setTemplate(resource)}>
          Use template
        </ActionButton>
      )}
      {m.kind === "dashboard" && (
        <ActionButton onClick={() => m.setOpened(resource)}>
          Open dashboard
        </ActionButton>
      )}
      {resource.kind === "form" && (
        <ActionButton onClick={() => m.setOpened(resource)}>
          Open form
        </ActionButton>
      )}
      {resource.kind === "portfolio" &&
        strings(resource.data.projectIds).map((id) => (
          <ActionButton key={id} onClick={() => props.onOpenProject(id)}>
            {props.projects.find((project) => project.id === id)?.name ??
              "Open project"}
          </ActionButton>
        ))}
      <ActionButton
        disabled={!["admin", "editor"].includes(resource.access)}
        onClick={() => m.openEditor(resource)}
      >
        {resource.kind === "goal" ? "Goal details" : "Edit"}
      </ActionButton>
      {resource.kind === "rule" && (
        <ActionButton
          disabled={!["admin", "editor"].includes(resource.access) || m.busy}
          onClick={() =>
            void m.update(resource, {
              ...resource.data,
              enabled: !resource.data.enabled,
            })
          }
        >
          {resource.data.enabled ? "Pause" : "Enable"}
        </ActionButton>
      )}
      <ActionButton
        disabled={!["admin", "editor"].includes(resource.access) || m.busy}
        onClick={() => void m.update(resource)}
      >
        {resource.archived ? "Restore" : "Archive"}
      </ActionButton>
    </div>
  );
}
function ResourceDialogs({ props, model: m }: { props: Props; model: Model }) {
  return (
    <>
      <ResourceEditor
        key={`${m.edit?.kind ?? m.kind}:${m.edit?.resource?.id ?? "new"}`}
        open={m.edit !== null}
        kind={m.edit?.kind ?? m.kind}
        resource={m.edit?.resource}
        people={props.people}
        projects={props.projects}
        onClose={() => m.setEdit(null)}
        onSaved={() => {
          m.setEdit(null);
          m.setOpened(null);
          m.query.reload();
        }}
      />
      {m.template && (
        <CopyProjectDialog
          resource={m.template}
          kind="template"
          onClose={() => m.setTemplate(null)}
          onCreated={(id) => {
            m.setTemplate(null);
            props.onOpenProject(id);
          }}
        />
      )}
      {m.opened?.kind === "form" && (
        <FormPreview
          resource={m.opened}
          onClose={() => {
            m.setOpened(null);
            m.query.reload();
          }}
        />
      )}
    </>
  );
}
