import type {
  OperationalAction,
  OperationalCurrentObjective,
  OperationalPageContext,
  OperationalRead,
  OperationalReadRequest,
  OperationalResource,
  OperationalRow,
  OperationalSectionName,
} from "./objective-operational-types";

export const operationalSectionNames = [
  "strategies",
  "projects",
  "decisions",
  "engagements",
] as const;
export const operationalSelectionKey = (
  selection: OperationalResource["selection"],
) => `${selection.kind}:${selection.id}`;
export const operationalRowResource = (
  row: OperationalRow,
): OperationalResource =>
  "resource" in row
    ? row.resource
    : row.kind === "planner_approval"
      ? row.task
      : row.session;
export function operationalRowKey(row: OperationalRow) {
  const resource = operationalRowResource(row);
  return "kind" in row
    ? `${row.kind}:${resource.selection.id}:${row.kind === "outreach_proposal" ? row.proposalId : ""}`
    : operationalSelectionKey(resource.selection);
}
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}
/** Exact request-digest normalization; arrays retain their original order. */
export const canonicalOperationalJSON = canonical;
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
const fail = (): never => {
  throw new Error(
    "The Objective operational observation is inconsistent. Reload it.",
  );
};

function validateSections(value: OperationalRead) {
  for (const section of Object.values(value.sections)) {
    if (Date.parse(section.observedAt) > Date.parse(value.observedAt)) fail();
    if (section.coverage === "complete") {
      if (
        value.associationSetVersion === null ||
        section.snapshotId === null ||
        section.total === null ||
        section.reasons.length ||
        section.total < section.items.length
      )
        fail();
      if (section.nextCursor !== null && section.total <= section.items.length)
        fail();
      if (
        section.total === 0 &&
        (section.items.length || section.nextCursor !== null)
      )
        fail();
    } else {
      if (section.total !== null || !section.reasons.length) fail();
      if (
        section.coverage !== "partial" &&
        (section.items.length ||
          section.nextCursor !== null ||
          section.snapshotId !== null)
      )
        fail();
      if (
        (section.items.length || section.nextCursor !== null) &&
        section.snapshotId === null
      )
        fail();
    }
  }
  const metrics = value.plannerMetrics;
  if (
    metrics.asOf !== value.asOf ||
    Date.parse(metrics.observedAt) > Date.parse(value.observedAt) ||
    Date.parse(metrics.asOf) > Date.parse(metrics.observedAt)
  )
    fail();
  const counts = [metrics.taskCount, metrics.doneCount, metrics.overdueCount];
  if (metrics.coverage === "complete") {
    if (
      value.associationSetVersion === null ||
      counts.includes(null) ||
      metrics.reasons.length ||
      metrics.doneCount! + metrics.overdueCount! > metrics.taskCount!
    )
      fail();
  } else if (counts.some((count) => count !== null) || !metrics.reasons.length)
    fail();
}

function rowWitnesses(value: OperationalRead) {
  const resources = new Map<string, OperationalResource>();
  const manual = new Map<string, string>();
  const versions = new Map<string, string>();
  const current = {
    id: value.scope.currentRevisionId,
    version: value.scope.objectiveVersion,
  };
  const validRevision = (revision: typeof current) =>
    revision.version <= current.version &&
    (revision.version !== current.version || revision.id === current.id);
  for (const name of operationalSectionNames) {
    const keys = new Set<string>();
    for (const row of value.sections[name].items) {
      const resource = operationalRowResource(row),
        key = operationalRowKey(row);
      if (keys.has(key)) fail();
      keys.add(key);
      if (Date.parse(resource.observedAt) > Date.parse(value.observedAt))
        fail();
      for (const provenance of row.provenance) {
        if (
          !validRevision(
            provenance.kind === "manual"
              ? provenance.linkedRevision
              : provenance.sourceRevision,
          )
        )
          fail();
        if (provenance.kind === "manual") {
          if (
            !same(provenance.via, resource.selection) &&
            !(
              resource.selection.kind === "planner_task" &&
              provenance.via.kind === "planner_project"
            )
          )
            fail();
          const identity = canonical(provenance);
          if (
            manual.has(provenance.associationId) &&
            manual.get(provenance.associationId) !== identity
          )
            fail();
          manual.set(provenance.associationId, identity);
        }
      }
      const resourceKey = operationalSelectionKey(resource.selection);
      if (
        resources.has(resourceKey) &&
        !same(resources.get(resourceKey), resource)
      )
        fail();
      resources.set(resourceKey, resource);
      if ("savedVersions" in row) {
        const receipts = new Set<string>();
        for (const pin of row.savedVersions) {
          const identity = canonical({
            strategyId: resource.selection.id,
            digest: pin.digest,
          });
          if (
            !validRevision(pin.sourceRevision) ||
            receipts.has(pin.receiptId) ||
            (versions.has(pin.id) && versions.get(pin.id) !== identity)
          )
            fail();
          receipts.add(pin.receiptId);
          versions.set(pin.id, identity);
          if (
            !row.provenance.some(
              (p) =>
                p.kind === "application_receipt" &&
                p.receiptId === pin.receiptId &&
                same(p.sourceRevision, pin.sourceRevision),
            )
          )
            fail();
        }
      }
      if (
        "startsAt" in row &&
        Date.parse(row.startsAt) < Date.parse(value.asOf)
      )
        fail();
    }
  }
  return resources;
}

function validateAction(
  action: OperationalAction,
  value: OperationalRead,
  resources: Map<string, OperationalResource>,
) {
  switch (action.kind) {
    case "edit_objective":
    case "request_review":
    case "confirm_ready":
      if (action.expectedObjectiveVersion !== value.scope.objectiveVersion)
        fail();
      break;
    case "open_resource": {
      const resource = resources.get(operationalSelectionKey(action.resource));
      if (!resource || !same(resource.ownerVersion, action.ownerVersion))
        fail();
      break;
    }
    case "review_planner_approval":
      if (
        !value.sections.decisions.items.some(
          (row) =>
            row.kind === "planner_approval" &&
            row.task.selection.id === action.taskId &&
            same(row.task.ownerVersion, {
              kind: "counter",
              value: action.taskVersion,
            }),
        )
      )
        fail();
      break;
    case "review_outreach_proposal":
      if (
        !value.sections.decisions.items.some(
          (row) =>
            row.kind === "outreach_proposal" &&
            row.session.selection.id === action.sessionId &&
            row.proposalId === action.proposalId &&
            same(row.session.ownerVersion, {
              kind: "counter",
              value: action.expectedStateVersion,
            }),
        )
      )
        fail();
      break;
    case "open_generated_strategy":
      if (
        !same(action.sourceRevision, {
          id: value.scope.currentRevisionId,
          version: value.scope.objectiveVersion,
        }) ||
        !value.sections.strategies.items.some(
          (row) =>
            row.resource.selection.id === action.strategyId &&
            row.savedVersions.some(
              (pin) =>
                pin.id === action.strategyVersionId &&
                pin.digest === action.strategyVersionDigest &&
                pin.generatedJobId === action.generatedJobId &&
                same(pin.sourceRevision, action.sourceRevision),
            ),
        )
      )
        fail();
  }
}

/** Cross-field checks do not establish resource authority or prove server membership. */
export function validateOperationalObservation(value: OperationalRead) {
  if (Date.parse(value.asOf) > Date.parse(value.observedAt)) fail();
  validateSections(value);
  const resources = rowWitnesses(value);
  for (const action of value.actions) validateAction(action, value, resources);
  return value;
}

export function requireOperationalPage(
  value: OperationalRead,
  request: OperationalReadRequest,
  objective: OperationalCurrentObjective,
  prior: OperationalPageContext = {},
) {
  const scope = value.scope;
  if (
    request.clientId !== objective.clientId ||
    request.objectiveId !== objective.id ||
    scope.clientId !== objective.clientId ||
    scope.objectiveId !== objective.id ||
    scope.objectiveVersion !== objective.version ||
    scope.objectiveStatus !== objective.status
  )
    fail();
  for (const name of operationalSectionNames) {
    const section = value.sections[name],
      cursor = request.cursors[name],
      previous = prior[name];
    let seen: string[] = [];
    if (section.items.length > request.limit) fail();
    if (cursor === null) {
      if (previous) fail();
    } else {
      if (
        !previous ||
        previous.cursor !== cursor ||
        !same(previous.scope, scope) ||
        previous.asOf !== value.asOf ||
        previous.associationSetVersion !== value.associationSetVersion ||
        previous.snapshotId !== section.snapshotId ||
        previous.total !== section.total ||
        new Set(previous.seenKeys).size !== previous.seenKeys.length
      )
        fail();
      seen = previous!.seenKeys;
    }
    const keys = section.items.map(operationalRowKey),
      count = new Set([...seen, ...keys]).size;
    if (count !== seen.length + keys.length) fail();
    if (
      section.nextCursor !== null &&
      (!keys.length || section.nextCursor === cursor)
    )
      fail();
    if (
      section.coverage === "complete" &&
      (count > section.total! ||
        (section.nextCursor === null
          ? count !== section.total
          : count >= section.total!))
    )
      fail();
  }
  return value;
}

export function nextOperationalPageContext(
  value: OperationalRead,
  name: OperationalSectionName,
  prior: OperationalPageContext,
): OperationalPageContext {
  const section = value.sections[name];
  if (!section.nextCursor) fail();
  return {
    ...prior,
    [name]: {
      cursor: section.nextCursor!,
      scope: value.scope,
      asOf: value.asOf,
      associationSetVersion: value.associationSetVersion,
      snapshotId: section.snapshotId,
      total: section.total,
      seenKeys: [
        ...(prior[name]?.seenKeys ?? []),
        ...section.items.map(operationalRowKey),
      ],
    },
  };
}

/** The first operational producer implements only these delegated current actions. */
export function implementedOperationalActions(value: OperationalRead) {
  return value.actions.filter(
    (
      action,
    ): action is
      | Extract<
          OperationalAction,
          { kind: "open_resource" | "review_planner_approval" }
        >
      | { kind: "edit_objective"; expectedObjectiveVersion: number } =>
      action.kind === "edit_objective" ||
      action.kind === "open_resource" ||
      action.kind === "review_planner_approval",
  );
}
