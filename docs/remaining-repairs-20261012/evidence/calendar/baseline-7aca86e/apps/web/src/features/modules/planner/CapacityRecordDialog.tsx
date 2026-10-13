"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type {
  PlannerPerson,
  PlannerProject,
} from "../../../shared/capiro/operations/planner-schemas";
import {
  ActionButton,
  Field,
  Modal,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
type Props = {
  open: boolean;
  kind: "plan" | "team" | "placeholder";
  onClose: () => void;
  onSaved: () => void;
  people: PlannerPerson[];
  projects: PlannerProject[];
  teams: { id: string; name: string }[];
};
export function CapacityRecordDialog(props: Props) {
  return (
    <Modal
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      title={`New capacity ${props.kind}`}
    >
      {props.open && <RecordForm {...props} />}
    </Modal>
  );
}
function RecordForm({
  kind,
  onClose,
  onSaved,
  people,
  projects,
  teams,
}: Props) {
  const model = useRecord(kind, onSaved, onClose);
  const {
    name,
    setName,
    selectedPeople,
    setPeople,
    selectedProjects,
    setProjects,
    teamId,
    setTeamId,
    title,
    setTitle,
    hours,
    setHours,
    privacy,
    setPrivacy,
    busy,
    error,
    submit,
    toggle,
  } = model;
  return (
    <form className={styles.stack} onSubmit={(event) => void submit(event)}>
      <Field label="Name" htmlFor="staffing-name">
        <TextInput
          id="staffing-name"
          required
          maxLength={500}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      {kind !== "placeholder" ? (
        <>
          <Field label="Privacy" htmlFor="staffing-privacy">
            <select
              id="staffing-privacy"
              className={styles.select}
              value={privacy}
              onChange={(event) =>
                setPrivacy(event.target.value as "private" | "team")
              }
            >
              <option value="private">Private</option>
              <option value="team">Team</option>
            </select>
          </Field>
          <StaffingMembership
            kind={kind}
            people={people}
            projects={projects}
            model={model}
          />
        </>
      ) : (
        <>
          <PlaceholderFields teams={teams} model={model} />
        </>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.footer}>
        <ActionButton type="button" onClick={onClose}>
          Cancel
        </ActionButton>
        <ActionButton primary type="submit" disabled={busy}>
          Create {kind}
        </ActionButton>
      </div>
    </form>
  );
}

function useRecord(
  kind: Props["kind"],
  onSaved: () => void,
  onClose: () => void,
) {
  const api = useCapiro();
  const [name, setName] = useState(""),
    [selectedPeople, setPeople] = useState<string[]>([]),
    [selectedProjects, setProjects] = useState<string[]>([]),
    [teamId, setTeamId] = useState(""),
    [title, setTitle] = useState(""),
    [hours, setHours] = useState(40),
    [privacy, setPrivacy] = useState<"private" | "team">("private"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const common = { id: crypto.randomUUID(), name };
      if (kind === "plan")
        await api.request("planner.capacity.plan.save", {
          body: {
            ...common,
            data: {
              description: "",
              privacy,
              members: [],
              projectIds: selectedProjects,
              peopleIds: selectedPeople,
              portfolioIds: [],
              teamIds: [],
              views: [],
            },
          },
        });
      else if (kind === "team")
        await api.request("planner.capacity.team.save", {
          body: {
            ...common,
            data: {
              privacy,
              members: [],
              peopleIds: selectedPeople,
              jobTitles: {},
            },
          },
        });
      else
        await api.request("planner.capacity.placeholder.save", {
          body: {
            ...common,
            data: {
              teamId,
              jobTitle: title,
              weeklyMinutes: Math.round(hours * 60),
            },
          },
        });
      onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save staffing record.",
      );
    } finally {
      setBusy(false);
    }
  };
  const toggle = (selected: string[], id: string, checked: boolean) =>
    checked ? [...selected, id] : selected.filter((item) => item !== id);
  return {
    name,
    setName,
    selectedPeople,
    setPeople,
    selectedProjects,
    setProjects,
    teamId,
    setTeamId,
    title,
    setTitle,
    hours,
    setHours,
    privacy,
    setPrivacy,
    busy,
    error,
    submit,
    toggle,
  };
}

function StaffingMembership({
  kind,
  people,
  projects,
  model,
}: {
  kind: Props["kind"];
  people: PlannerPerson[];
  projects: PlannerProject[];
  model: ReturnType<typeof useRecord>;
}) {
  const { selectedPeople, setPeople, selectedProjects, setProjects, toggle } =
    model;
  return (
    <>
      {" "}
      <fieldset>
        <legend>People</legend>
        {people.map((person) => (
          <label key={person.id} className={styles.checkbox}>
            <input
              type="checkbox"
              checked={selectedPeople.includes(person.id)}
              onChange={(event) =>
                setPeople(
                  toggle(selectedPeople, person.id, event.target.checked),
                )
              }
            />
            {person.name}
          </label>
        ))}
      </fieldset>
      {kind === "plan" && (
        <fieldset>
          <legend>Projects</legend>
          {projects
            .filter((project) => !project.archived)
            .map((project) => (
              <label key={project.id} className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={selectedProjects.includes(project.id)}
                  onChange={(event) =>
                    setProjects(
                      toggle(
                        selectedProjects,
                        project.id,
                        event.target.checked,
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

function PlaceholderFields({
  teams,
  model,
}: {
  teams: Props["teams"];
  model: ReturnType<typeof useRecord>;
}) {
  const { teamId, setTeamId, title, setTitle, hours, setHours } = model;
  return (
    <>
      {" "}
      <Field label="Team" htmlFor="placeholder-team">
        <select
          id="placeholder-team"
          className={styles.select}
          required
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
        >
          <option value="">Choose team</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Job title" htmlFor="placeholder-title">
        <TextInput
          id="placeholder-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field label="Weekly hours" htmlFor="placeholder-hours">
        <TextInput
          type="number"
          id="placeholder-hours"
          min={0}
          max={168}
          value={hours}
          onChange={(event) => setHours(Number(event.target.value))}
        />
      </Field>
    </>
  );
}
