"use client";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
      <h3>
        Existing Strategy, task, Context file, Calendar occurrence or Directory
        target
      </h3>
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
  const [selection, setSelection] = useState<{
      id: string;
      taskVersion?: number;
    }>(),
    [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const resourceId = selection?.id ?? "";
  const cache = useQueryClient();
  const live = useRef({ selection, disabled });
  useLayoutEffect(() => {
    live.current = { selection, disabled };
  }, [selection, disabled]);
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
    choices.data?.items.some(
      (item) =>
        item.id === resourceId && item.taskVersion === selection?.taskVersion,
    ) &&
    choices.isSuccess &&
    !choices.isFetching;
  const next = choices.data?.nextCursor;
  function changePage(forward: boolean) {
    setCursors(forward && next ? [...cursors, next] : cursors.slice(0, -1));
    setSelection(undefined);
  }
  function open(versionId = "", versionCurrent: () => boolean = () => true) {
    const capturedSelection = selection,
      source = choices.data;
    void destination.open(kind, resourceId, versionId, {
      taskVersion: capturedSelection?.taskVersion,
      isCurrent: () => {
        const current = cache.getQueryState([
          "objective-work-choices",
          kind,
          objective.clientId,
          objective.id,
          cursor,
        ]);
        return Boolean(
          current &&
          live.current.selection === capturedSelection &&
          !live.current.disabled &&
          versionCurrent() &&
          current.data === source &&
          current.status === "success" &&
          current.fetchStatus === "idle" &&
          !current.isInvalidated &&
          !current.error,
        );
      },
    });
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
        retry={() => {
          setSelection(undefined);
          void choices.refetch();
        }}
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
              const item = choices.data.items.find(
                (row) => row.id === event.target.value,
              );
              setSelection(
                item
                  ? { id: item.id, taskVersion: item.taskVersion }
                  : undefined,
              );
            }}
          >
            <option value="">Choose an existing resource</option>
            {choices.data.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="button"
            disabled={locked}
            onClick={() => {
              setSelection(undefined);
              void choices.refetch();
            }}
          >
            Refresh resource choices
          </button>
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
          onOpen={open}
        />
      )}
      <QueryState error={destination.error} />
      {kind !== "workspace_saved_revision" && (
        <button
          type="button"
          className="button primary"
          disabled={locked || !selected}
          onClick={() => open()}
        >
          {destination.busy
            ? "Checking current destination…"
            : `Open Objective-bound ${objectiveWorkLabels[kind]}`}
        </button>
      )}
    </div>
  );
}
