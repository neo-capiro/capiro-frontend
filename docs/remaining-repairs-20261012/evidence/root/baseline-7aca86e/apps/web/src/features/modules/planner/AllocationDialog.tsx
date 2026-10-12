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
export function AllocationDialog({
  open,
  onClose,
  onSaved,
  plan,
  people,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  plan: { id: string; version: number };
  people: PlannerPerson[];
  projects: PlannerProject[];
}) {
  const model = useAllocation(plan, onSaved, onClose);
  const {
    person,
    setPerson,
    project,
    setProject,
    start,
    setStart,
    end,
    setEnd,
    unit,
    setUnit,
    value,
    setValue,
    busy,
    error,
    submit,
  } = model;
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Allocate project work"
      description="Only people and projects included in this plan are available."
    >
      <form onSubmit={(event) => void submit(event)} className={styles.form}>
        <Field label="Person" htmlFor="allocate-person">
          <select
            id="allocate-person"
            className={styles.select}
            required
            value={person}
            onChange={(event) => setPerson(event.target.value)}
          >
            <option value="">Select person</option>
            {people.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Project" htmlFor="allocate-project">
          <select
            id="allocate-project"
            className={styles.select}
            required
            value={project}
            onChange={(event) => setProject(event.target.value)}
          >
            <option value="">Select project</option>
            {projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <AllocationEffort model={model} />
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
            Allocate work
          </ActionButton>
        </div>
      </form>
    </Modal>
  );
}

function useAllocation(
  plan: { id: string; version: number },
  onSaved: () => void,
  onClose: () => void,
) {
  const api = useCapiro();
  const [person, setPerson] = useState(""),
    [project, setProject] = useState(""),
    [start, setStart] = useState(() => new Date().toLocaleDateString("en-CA")),
    [end, setEnd] = useState(() => new Date().toLocaleDateString("en-CA")),
    [unit, setUnit] = useState<"hours" | "percent">("hours"),
    [value, setValue] = useState(40),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.request("planner.capacity.allocation.save", {
        body: {
          planId: plan.id,
          planVersion: plan.version,
          changes: [
            {
              id: crypto.randomUUID(),
              projectId: project,
              data: {
                userId: person,
                placeholderId: null,
                startOn: start,
                endOn: end,
                effort: { unit, value },
              },
            },
          ],
        },
      });
      onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to allocate work.",
      );
    } finally {
      setBusy(false);
    }
  };
  return {
    person,
    setPerson,
    project,
    setProject,
    start,
    setStart,
    end,
    setEnd,
    unit,
    setUnit,
    value,
    setValue,
    busy,
    error,
    submit,
  };
}

function AllocationEffort({
  model,
}: {
  model: ReturnType<typeof useAllocation>;
}) {
  const { start, setStart, end, setEnd, unit, setUnit, value, setValue } =
    model;
  return (
    <>
      {" "}
      <Field label="Start" htmlFor="allocate-start">
        <TextInput
          type="date"
          id="allocate-start"
          required
          value={start}
          onChange={(event) => setStart(event.target.value)}
        />
      </Field>
      <Field label="End" htmlFor="allocate-end">
        <TextInput
          type="date"
          id="allocate-end"
          required
          min={start}
          value={end}
          onChange={(event) => setEnd(event.target.value)}
        />
      </Field>
      <Field label="Unit" htmlFor="allocate-unit">
        <select
          id="allocate-unit"
          className={styles.select}
          value={unit}
          onChange={(event) =>
            setUnit(event.target.value as "hours" | "percent")
          }
        >
          <option value="hours">Total hours</option>
          <option value="percent">Percent of capacity</option>
        </select>
      </Field>
      <Field label="Effort" htmlFor="allocate-value">
        <TextInput
          type="number"
          id="allocate-value"
          min={0}
          required
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
        />
      </Field>
    </>
  );
}
