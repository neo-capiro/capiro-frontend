"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  readPlanLocation,
  requireSelectedPlan,
  type PlanSelection,
  type PlanResponse,
} from "../../../shared/capiro/operations/strategy-materialization";
import {
  rememberPlanOutputs,
  planCreationIdentity,
  type KnownPlanOutputs,
} from "../../../shared/capiro/operations/strategy-materialization-semantics";
import { ActionButton, Panel, StatusPanel } from "../../../shared/module-ui";

export function ObjectivePreparedPlan({
  onOpenProject,
}: {
  onOpenProject: (id: string) => void;
}) {
  const params = useSearchParams(),
    selected = readPlanLocation(params);
  if (!selected)
    return <section role="alert">This generated plan link is invalid.</section>;
  return (
    <PreparedPlan
      key={JSON.stringify(selected)}
      selected={selected}
      onOpenProject={onOpenProject}
    />
  );
}
function PreparedPlan({
  selected,
  onOpenProject,
}: {
  selected: PlanSelection;
  onOpenProject: (id: string) => void;
}) {
  const api = useCapiro(),
    { ids } = selected;
  const job = useCapiroQuery("strategies.objectiveDraftJob", {
    params: { jobId: ids.generationJobId },
  });
  const plan = useCapiroQuery("planner.strategyMaterialization", {
    params: { requestId: ids.materializationRequestId },
  });
  const [fence, setFence] = useState(() => ({
    api,
    response: undefined as PlanResponse | undefined,
    known: undefined as KnownPlanOutputs | undefined,
    creation: undefined as string | undefined,
    failed: false,
  }));
  const [opening, setOpening] = useState(false),
    [openError, setOpenError] = useState<string>();
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), [api]);
  let value: PlanResponse | undefined,
    error: Error | string | undefined = job.error ?? plan.error;
  const loading = job.loading || plan.loading;
  if (!loading && !error && job.data && plan.data) {
    try {
      value = requireSelectedPlan(plan.data, job.data, selected);
    } catch (cause) {
      error =
        cause instanceof Error ? cause : "This plan could not be verified.";
    }
  }
  if (fence.api !== api) {
    setFence({
      api,
      response: undefined,
      known: undefined,
      creation: undefined,
      failed: false,
    });
    value = undefined;
  } else if (value && fence.response !== plan.data) {
    try {
      const creation = planCreationIdentity(value);
      if (fence.creation !== undefined && fence.creation !== creation)
        throw new Error();
      setFence({
        api,
        response: plan.data,
        known: rememberPlanOutputs(fence.known, value),
        creation,
        failed: false,
      });
    } catch {
      setFence({ ...fence, response: plan.data, failed: true });
    }
    value = undefined;
  } else if (value && fence.failed) {
    value = undefined;
    error =
      "The immutable saved plan receipt changed. No output can be opened.";
  }
  const open = async (projectId: string) => {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setOpening(true);
    setOpenError(undefined);
    try {
      const currentJob = await api.request(
        "strategies.objectiveDraftJob",
        { params: { jobId: ids.generationJobId } },
        { signal: controller.signal },
      );
      const currentPlan = await api.request(
        "planner.strategyMaterialization",
        { params: { requestId: ids.materializationRequestId } },
        { signal: controller.signal },
      );
      const checked = requireSelectedPlan(currentPlan, currentJob, selected);
      rememberPlanOutputs(fence.known, checked);
      if (fence.creation !== planCreationIdentity(checked))
        throw new Error("The saved creation receipt changed.");
      if (
        checked.status === "partial" ||
        !checked.projects.some(
          (p) =>
            p.output.availability === "available" && p.output.id === projectId,
        )
      )
        throw new Error("The generated project is not currently available.");
      const bootstrap = await api.request(
        "planner.bootstrap",
        {},
        { signal: controller.signal },
      );
      controller.signal.throwIfAborted();
      if (
        !bootstrap.projects.some(
          (p) =>
            p.id === projectId &&
            !p.archived &&
            p.clientId === checked.source.clientId,
        )
      )
        throw new Error(
          "The project could not be verified in current Planner access.",
        );
      onOpenProject(projectId);
    } catch {
      if (!controller.signal.aborted)
        setOpenError(
          "Project access could not be reverified. Refresh the plan receipt.",
        );
    } finally {
      if (active.current === controller) active.current = null;
      if (!controller.signal.aborted) setOpening(false);
    }
  };
  return (
    <section className="stack" aria-label="Saved generated plan">
      <h2>Generated Planner plan</h2>
      <Link
        href={`/modules/planner?${new URLSearchParams({ clientId: selected.query.clientId, view: "projects" })}`}
      >
        Open Planner projects
      </Link>
      <StatusPanel
        loading={loading}
        error={error}
        onRetry={() => {
          job.reload();
          plan.reload();
        }}
      >
        {value && !openError && (
          <PlanReceipt value={value} opening={opening} onOpen={open} />
        )}
      </StatusPanel>
      {openError && <p role="alert">{openError}</p>}
      <ActionButton
        disabled={opening}
        onClick={() => {
          setOpenError(undefined);
          job.reload();
          plan.reload();
        }}
      >
        Recheck generated plan
      </ActionButton>
    </section>
  );
}
function PlanReceipt({
  value,
  opening,
  onOpen,
}: {
  value: PlanResponse;
  opening: boolean;
  onOpen: (id: string) => Promise<void>;
}) {
  return (
    <>
      <Panel title="Saved plan receipt">
        <p role="status">
          {value.status === "prepared"
            ? "Plan prepared."
            : value.status === "prepared_with_issues"
              ? "Plan prepared; review the reported issues."
              : "Saved plan outputs are partly unavailable."}
        </p>
        <p>Saved Strategy version: {value.source.strategyVersionId}</p>
        <p>
          {value.counts.createdProjects} generated projects;{" "}
          {value.counts.createdTasks} generated tasks.
        </p>
        <p>
          Receipt recorded: {value.recordedAt}. Current access checked:{" "}
          {value.observedAt}.
        </p>
        <p>
          Project and task edits, including regrouping, are preserved. Creation
          membership is historical; current project content is read when opened.
        </p>
        {!!value.issues.length && (
          <ul>
            {value.issues.map((issue, i) => (
              <li key={i}>{issue.message}</li>
            ))}
          </ul>
        )}
        {value.projects.map((project) => (
          <div key={project.groupKey}>
            <p>
              {project.name}: {project.output.availability}.
            </p>
            {value.status !== "partial" && project.output.id && (
              <ActionButton
                disabled={opening}
                onClick={() => void onOpen(project.output.id!)}
              >
                Open generated project: {project.name}
              </ActionButton>
            )}
          </div>
        ))}
      </Panel>
      <details>
        <summary>Linked plan context and exclusions</summary>
        {value.context.map((node) => (
          <section key={node.sourceNodeId}>
            <h3>{node.title}</h3>
            <p>
              {node.kind}: {node.note}
            </p>
            <small>Saved source node: {node.sourceNodeId}</small>
          </section>
        ))}
        {value.exclusions.map((node) => (
          <p key={node.sourceNodeId}>
            Archived source node excluded from new work: {node.sourceNodeId}.
          </p>
        ))}
        {value.edges
          .filter((edge) => edge.disposition !== "task_dependency")
          .map((edge, i) => (
            <p key={i}>
              Dependency retained as {edge.disposition.replaceAll("_", " ")}:{" "}
              {edge.sourceNodeId} → {edge.dependsOnSourceNodeId}.
            </p>
          ))}
      </details>
    </>
  );
}
