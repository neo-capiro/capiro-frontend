"use client";
import { useState } from "react";
import type {
  PlannerPerson,
  PlannerProject,
  PlannerResource,
} from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroMutation } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import { DashboardEditor } from "./DashboardEditor";
import styles from "./planner.module.css";
import { initialResourceData, strings } from "./resource-data";
import { GoalFields } from "./ResourceTypeFields";
type Props = {
  open: boolean;
  kind: PlannerResource["kind"];
  resource?: PlannerResource;
  people: PlannerPerson[];
  projects: PlannerProject[];
  onClose: () => void;
  onSaved: () => void;
};
export function ResourceEditor(props: Props) {
  return (
    <Modal
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      title={`${props.resource ? "Edit" : "New"} ${props.kind}`}
      description="Sharing follows current project and resource permissions."
    >
      {props.open && <ResourceForm {...props} />}
    </Modal>
  );
}
function ResourceForm({
  kind,
  resource,
  people,
  projects,
  onClose,
  onSaved,
}: Props) {
  const create = useCapiroMutation("planner.resource.create"),
    save = useCapiroMutation("planner.resource.update");
  const [name, setName] = useState(resource?.name ?? ""),
    [data, setData] = useState<Record<string, unknown>>(
      resource?.data ?? initialResourceData(kind),
    ),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const update = (key: string, value: unknown) =>
    setData((old) => ({ ...old, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      if (resource)
        await save.run({
          params: { id: resource.id },
          body: { version: resource.version, name, data },
        });
      else
        await create.run({
          body: { kind, name, projectId: null, data },
        });
      onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save resource.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className={styles.stack} onSubmit={(event) => void submit(event)}>
      <ResourceBasics
        kind={kind}
        projects={projects}
        name={name}
        setName={setName}
        data={data}
        update={update}
      />
      {kind === "goal" && (
        <GoalFields data={data} update={update} people={people} />
      )}{" "}
      {kind === "dashboard" && (
        <DashboardEditor data={data} onChange={setData} />
      )}{" "}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.footer}>
        <ActionButton type="button" onClick={onClose}>
          Cancel
        </ActionButton>
        <ActionButton
          primary
          type="submit"
          disabled={
            busy ||
            (!!resource && !["admin", "editor"].includes(resource.access))
          }
        >
          {busy ? "Saving…" : "Save"}
        </ActionButton>
      </div>
    </form>
  );
}
function ResourceBasics({
  kind,
  projects,
  name,
  setName,
  data,
  update,
}: {
  kind: Props["kind"];
  projects: PlannerProject[];
  name: string;
  setName: (name: string) => void;
  data: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
}) {
  return (
    <>
      <Field label="Name" htmlFor="resource-name">
        <TextInput
          id="resource-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={500}
        />
      </Field>
      <Field label="Description" htmlFor="resource-description">
        <TextArea
          id="resource-description"
          value={String(data.description ?? "")}
          onChange={(event) => update("description", event.target.value)}
          maxLength={50000}
        />
      </Field>
      <ResourceProjectSelection
        kind={kind}
        data={data}
        projects={projects}
        update={update}
      />
      {["portfolio", "goal", "dashboard"].includes(kind) && (
        <Field label="Privacy" htmlFor="resource-privacy">
          <select
            className={styles.select}
            id="resource-privacy"
            value={String(data.privacy ?? "private")}
            onChange={(event) => update("privacy", event.target.value)}
          >
            <option value="private">Private</option>
            <option value="team">Team</option>
          </select>
        </Field>
      )}
    </>
  );
}

function ResourceProjectSelection({
  kind,
  data,
  projects,
  update,
}: {
  kind: Props["kind"];
  data: Record<string, unknown>;
  projects: PlannerProject[];
  update: (key: string, value: unknown) => void;
}) {
  return (
    <>
      {["portfolio", "goal"].includes(kind) && (
        <fieldset>
          <legend>Included projects</legend>
          {projects
            .filter((project) => !project.archived)
            .map((project) => (
              <label key={project.id} className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={strings(data.projectIds).includes(project.id)}
                  onChange={(event) =>
                    update(
                      "projectIds",
                      event.target.checked
                        ? [...strings(data.projectIds), project.id]
                        : strings(data.projectIds).filter(
                            (id) => id !== project.id,
                          ),
                    )
                  }
                />
                {project.name}
              </label>
            ))}
        </fieldset>
      )}
    </>
  );
}
