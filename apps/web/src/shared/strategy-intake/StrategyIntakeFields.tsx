"use client";

import { useId } from "react";
import {
  STRATEGY_INTAKE_TYPE_LABELS as objectiveLabels,
  STRATEGY_INTAKE_TYPES,
  STRATEGY_INTAKE_FIELDS as fields,
  type StrategyIntakeDraft,
} from "@capiro/shared/strategy-intake";
import { useCapiroQuery } from "@/shared/capiro/queries";

/** Shared by Objectives and Strategies; the client is selected by the enclosing screen. */
export function StrategyIntakeFields({
  value,
  onChange,
  disabled,
}: {
  value: StrategyIntakeDraft;
  onChange: (value: StrategyIntakeDraft) => void;
  disabled: boolean;
}) {
  const id = useId();
  const people = useCapiroQuery("planner.bootstrap", {});
  const update = <K extends keyof StrategyIntakeDraft>(
    key: K,
    next: StrategyIntakeDraft[K],
  ) => onChange({ ...value, [key]: next });
  return (
    <fieldset className="stack" disabled={disabled}>
      <legend className="srOnly">Strategy intake</legend>
      <label htmlFor={`${id}-type`}>{fields.type.label} Â· Required</label>
      <select
        id={`${id}-type`}
        className="input"
        value={value.type ?? ""}
        onChange={(event) =>
          update(
            "type",
            (event.target.value || null) as StrategyIntakeDraft["type"],
          )
        }
      >
        <option value="">Choose an objective type</option>
        {STRATEGY_INTAKE_TYPES.map((type) => (
          <option key={type} value={type}>
            {objectiveLabels[type]}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-goal`}>{fields.goal.label} Â· Required</label>
      <textarea
        id={`${id}-goal`}
        className="input"
        maxLength={fields.goal.maxLength}
        rows={4}
        value={value.goal}
        placeholder="What outcome does this strategy have to produce?"
        onChange={(event) => update("goal", event.target.value)}
      />
      <label htmlFor={`${id}-owner`}>
        {fields.ownerUserId.label} Â· Required
      </label>
      <select
        id={`${id}-owner`}
        className="input"
        value={value.ownerUserId ?? ""}
        disabled={disabled || people.loading || Boolean(people.error)}
        onChange={(event) => update("ownerUserId", event.target.value || null)}
      >
        <option value="">Choose an owner</option>
        {value.ownerUserId &&
          !people.data?.people.some(
            (person) => person.id === value.ownerUserId,
          ) && (
            <option value={value.ownerUserId}>
              Saved owner Â· availability checked when saving
            </option>
          )}
        {(people.data?.people ?? []).map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
      {people.error && (
        <p role="alert">
          Owners could not be loaded.{" "}
          <button type="button" onClick={people.reload}>
            Retry owners
          </button>
        </p>
      )}
      <label htmlFor={`${id}-date`}>
        {fields.targetDate.label} Â· Optional
      </label>
      <input
        id={`${id}-date`}
        className="input"
        type="date"
        value={value.targetDate ?? ""}
        onChange={(event) => update("targetDate", event.target.value || null)}
      />
      <label htmlFor={`${id}-context`}>
        {fields.meriContext.label} Â· Optional
      </label>
      <textarea
        id={`${id}-context`}
        className="input"
        maxLength={fields.meriContext.maxLength}
        rows={4}
        value={value.meriContext}
        placeholder="Prioritize verified budget evidence, committee jurisdiction and client-approved proof points."
        onChange={(event) => update("meriContext", event.target.value)}
      />
      <p className="muted">
        Generation reviews the selected client's authorized documents and
        government relationships. Saving these answers does not start generation
        or outreach.
      </p>
    </fieldset>
  );
}
