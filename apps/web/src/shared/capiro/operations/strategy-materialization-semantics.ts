import type { PlanResponse } from "./strategy-materialization-types";

function need(ok: unknown) {
  if (!ok)
    throw new Error(
      "The plan receipt is inconsistent. Refresh this same request.",
    );
}
function sameSet(a: string[], b: string[]) {
  return (
    a.length === new Set(a).size &&
    a.length === b.length &&
    a.every((x) => b.includes(x))
  );
}

/** Receiving consistency only; the server must check complete locked source. */
export function validatePlanMappings(v: PlanResponse) {
  const tasks = v.tasks.map((t) => t.sourceNodeId),
    context = v.context.map((n) => n.sourceNodeId),
    archived = v.exclusions.map((n) => n.sourceNodeId);
  const nodes = [...tasks, ...context, ...archived],
    groups = v.projects.map((g) => g.groupKey);
  need(
    new Set(nodes).size === nodes.length &&
      new Set(groups).size === groups.length,
  );
  need(
    v.counts.savedNodes === nodes.length &&
      v.counts.actionableNodes === tasks.length &&
      v.counts.contextNodes === context.length &&
      v.counts.archivedNodes === archived.length &&
      v.counts.createdProjects === v.projects.length &&
      v.counts.createdTasks === tasks.length,
  );
  for (const group of v.projects)
    need(group.originalNodeIds.every((n) => tasks.includes(n)));
  for (const task of v.tasks) {
    const original = v.projects
      .filter((g) => g.originalNodeIds.includes(task.sourceNodeId))
      .map((g) => g.groupKey);
    need(original.length && sameSet(task.originalGroupKeys, original));
    need(task.currentGroupKeys.every((k) => groups.includes(k)));
  }
  for (const rows of [v.projects, v.tasks]) {
    const ids = rows.flatMap((r) => (r.output.id ? [r.output.id] : []));
    need(new Set(ids).size === ids.length);
    for (const { output } of rows)
      need(
        output.currentVersion === null ||
          output.currentVersion >= output.createdVersion,
      );
  }
  const unavailable = [...v.projects, ...v.tasks].some(
    (r) => r.output.availability !== "available",
  );
  need((v.status === "partial") === unavailable);
  if (!tasks.length)
    need(v.issues.some((i) => i.code === "NO_ACTIONABLE_WORK"));
  validatePlanEdges(v, tasks, context, archived, nodes);
  return v;
}

function validatePlanEdges(
  v: PlanResponse,
  tasks: string[],
  context: string[],
  archived: string[],
  nodes: string[],
) {
  const edges = new Set<string>(),
    graph = new Map(nodes.map((n) => [n, [] as string[]]));
  for (const edge of v.edges) {
    const a = edge.sourceNodeId,
      b = edge.dependsOnSourceNodeId,
      key = `${a}:${b}`;
    need(graph.has(a) && graph.has(b) && !edges.has(key));
    edges.add(key);
    graph.get(a)!.push(b);
    if (edge.disposition === "task_dependency")
      need(tasks.includes(a) && tasks.includes(b));
    if (edge.disposition === "context_only")
      need(context.includes(a) || context.includes(b));
    if (edge.disposition === "archived_source")
      need(archived.includes(a) || archived.includes(b));
    if (edge.disposition !== "task_dependency") {
      const code =
        edge.disposition === "context_only"
          ? "CONTEXT_ONLY_DEPENDENCY"
          : "ARCHIVED_SOURCE_DEPENDENCY";
      need(
        v.issues.some(
          (i) =>
            i.code === code &&
            i.sourceNodeIds.includes(a) &&
            i.sourceNodeIds.includes(b),
        ),
      );
    }
  }
  for (const c of v.context)
    need(sameSet(c.dependsOnSourceNodeIds, graph.get(c.sourceNodeId)!));
  // Iterative graph traversal avoids a browser recursion limit becoming a task cap.
  const pending = new Map(nodes.map((n) => [n, 0]));
  for (const deps of graph.values())
    for (const dep of deps) pending.set(dep, pending.get(dep)! + 1);
  const ready = nodes.filter((n) => pending.get(n) === 0);
  let seen = 0;
  while (ready.length) {
    const n = ready.pop()!;
    seen++;
    for (const dep of graph.get(n)!) {
      const count = pending.get(dep)! - 1;
      pending.set(dep, count);
      if (!count) ready.push(dep);
    }
  }
  need(seen === nodes.length);
}

export type KnownPlanOutputs = {
  projects: Record<string, string>;
  tasks: Record<string, string>;
};
/** Private receiving fence, never current output authorization or rendered IDs. */
export function rememberPlanOutputs(
  previous: KnownPlanOutputs | undefined,
  value: PlanResponse,
): KnownPlanOutputs {
  const result = {
    projects: { ...previous?.projects },
    tasks: { ...previous?.tasks },
  };
  for (const [kind, rows] of [
    [
      "projects",
      value.projects.map((p) => ({ key: p.groupKey, id: p.output.id })),
    ],
    [
      "tasks",
      value.tasks.map((t) => ({ key: t.sourceNodeId, id: t.output.id })),
    ],
  ] as const) {
    for (const row of rows)
      if (row.id !== null) {
        need(
          !Object.hasOwn(result[kind], row.key) ||
            result[kind][row.key] === row.id,
        );
        result[kind][row.key] = row.id;
      }
  }
  return result;
}
export function planCreationIdentity(v: PlanResponse) {
  return JSON.stringify({
    recordedAt: v.recordedAt,
    source: v.source,
    projects: v.projects.map((p) => ({
      groupKey: p.groupKey,
      name: p.name,
      originalNodeIds: p.originalNodeIds,
      createdVersion: p.output.createdVersion,
    })),
    tasks: v.tasks.map((t) => ({
      sourceNodeId: t.sourceNodeId,
      originalGroupKeys: t.originalGroupKeys,
      createdVersion: t.output.createdVersion,
    })),
    context: v.context,
    edges: v.edges,
    exclusions: v.exclusions,
    issues: v.issues,
    counts: v.counts,
  });
}
