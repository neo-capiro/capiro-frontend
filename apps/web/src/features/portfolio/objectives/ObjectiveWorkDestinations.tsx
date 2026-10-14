"use client";
import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { Objective } from "./contracts";
import {
  loadObjectiveWorkChoices,
  objectiveWorkLabels,
  type ObjectiveWorkKind,
} from "./objective-work-sources";
import { useObjectiveWorkDestination } from "./useObjectiveWorkDestination";
import { ObjectiveSavedVersion } from "./ObjectiveSavedVersion";

export function ObjectiveWorkDestinations({
  objective,
  disabled,
}: {
  objective: Objective;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false),
    [kind, setKind] = useState<ObjectiveWorkKind | "">("");
  const id = useId();
  return (
    <section className="card stack" aria-label="Existing Objective work">
      <h3>Existing Strategy, task, Context file or Calendar occurrence</h3>
      <button
        className="button"
        type="button"
        disabled={disabled}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide existing resources" : "Choose existing resources"}
      </button>
      {disabled && (
        <p>Save or discard editor changes before opening a destination.</p>
      )}
      {expanded && (
        <>
          <label htmlFor={id}>Resource type</label>
          <select
            id={id}
            className="input"
            value={kind}
            disabled={disabled}
            onChange={(event) =>
              setKind(event.target.value as ObjectiveWorkKind | "")
            }
          >
            <option value="">Choose a resource type</option>
            {Object.entries(objectiveWorkLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {kind && (
            <ObjectiveWorkPicker
              key={kind}
              kind={kind}
              objective={objective}
              disabled={disabled}
            />
          )}
        </>
      )}
      <small>
        Only existing authorized resources can be opened. Creation and durable
        associations remain unavailable.
      </small>
    </section>
  );
}
function ObjectiveWorkPicker({
  kind,
  objective,
  disabled,
}: {
  kind: ObjectiveWorkKind;
  objective: Objective;
  disabled: boolean;
}) {
  const api = useApi(),
    selectId = useId();
  const [resourceId, setResourceId] = useState(""),
    [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const destination = useObjectiveWorkDestination(objective, disabled);
  const cursor = cursors.at(-1),
    locked = disabled || destination.busy;
  const choices = useQuery({
    queryKey: [
      "objective-work-choices",
      kind,
      objective.clientId,
      objective.id,
      cursor,
    ],
    enabled: !disabled,
    retry: false,
    queryFn: ({ signal }) =>
      loadObjectiveWorkChoices(api, kind, objective.clientId, cursor, signal),
  });
  const selected =
    choices.data?.items.some((item) => item.id === resourceId) &&
    choices.isSuccess &&
    !choices.isFetching;
  const next = choices.data?.nextCursor;
  function changePage(forward: boolean) {
    setCursors(forward && next ? [...cursors, next] : cursors.slice(0, -1));
    setResourceId("");
  }
  return (
    <div className="stack">
      <p>
        Open a resource for saved Objective version {objective.version}. Its
        current access and client association will be checked.
      </p>
      {kind === "workspace_saved_revision" && (
        <p>
          Context Files opens an eligible saved Workspace revision. Document
          names and client labels do not determine eligibility. Select the
          document and exact saved version. General Portfolio attachments remain
          in Files.
        </p>
      )}
      <QueryState
        pending={choices.isFetching}
        error={choices.error}
        retry={() => void choices.refetch()}
      />
      {choices.isSuccess && !choices.isFetching && (
        <>
          {!choices.data.items.length && (
            <p>No matching resources on this page.</p>
          )}
          <label htmlFor={selectId}>Existing {objectiveWorkLabels[kind]}</label>
          <select
            id={selectId}
            className="input"
            value={resourceId}
            disabled={locked}
            onChange={(event) => {
              setResourceId(event.target.value);
            }}
          >
            <option value="">Choose an existing resource</option>
            {choices.data.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          {(kind === "planner_task" || kind === "planner_occurrence") && (
            <div className="row">
              <button
                type="button"
                className="button"
                disabled={locked || cursors.length === 1}
                onClick={() => changePage(false)}
              >
                Previous tasks
              </button>
              <button
                type="button"
                className="button"
                disabled={locked || !next || cursors.includes(next)}
                onClick={() => changePage(true)}
              >
                More tasks
              </button>
            </div>
          )}
          {next && (
            <small>
              More tasks are available. Only tasks with this exact client are
              shown on each page.
            </small>
          )}
        </>
      )}
      {selected && kind === "workspace_saved_revision" && (
        <ObjectiveSavedVersion
          key={resourceId}
          draftId={resourceId}
          disabled={locked}
          onOpen={(versionId) =>
            void destination.open(kind, resourceId, versionId)
          }
        />
      )}
      <QueryState error={destination.error} />
      {kind !== "workspace_saved_revision" && (
        <button
          type="button"
          className="button primary"
          disabled={locked || !selected}
          onClick={() => void destination.open(kind, resourceId, "")}
        >
          {destination.busy
            ? "Checking current destination…"
            : `Open Objective-bound ${objectiveWorkLabels[kind]}`}
        </button>
      )}
    </div>
  );
}
