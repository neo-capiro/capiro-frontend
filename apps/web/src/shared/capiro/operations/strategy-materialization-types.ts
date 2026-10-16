/** Receiving types for the exact centrally allocated 42d81420 JSON Schema. */
export type PlanOutput = {
  availability: "available" | "archived" | "unavailable";
  id: string | null;
  createdVersion: number;
  currentVersion: number | null;
};
export type PlanRequest = {
  requestId: string;
  generationJobId: string;
  expected: {
    strategyId: string;
    strategyVersionId: string;
    objectiveRevisionId: string;
  };
  groups?: { key: string; name: string; nodeIds: string[] }[];
};
export type PlanIssue = {
  code: string;
  sourceNodeIds: string[];
  message: string;
};
export type PlanResponse = {
  requestId: string;
  status: "prepared" | "prepared_with_issues" | "partial";
  replayed: boolean;
  recordedAt: string;
  observedAt: string;
  source: {
    generationJobId: string;
    generationRequestId: string;
    clientId: string;
    objectiveId: string;
    objectiveVersion: number;
    objectiveRevisionId: string;
    strategyId: string;
    strategyVersionId: string;
    snapshotDigest: string;
  };
  projects: {
    groupKey: string;
    name: string;
    originalNodeIds: string[];
    output: PlanOutput;
  }[];
  tasks: {
    sourceNodeId: string;
    originalGroupKeys: string[];
    currentGroupKeys: string[];
    output: PlanOutput;
  }[];
  context: {
    sourceNodeId: string;
    kind: "risk" | "gate" | "decision";
    title: string;
    note: string | null;
    dependsOnSourceNodeIds: string[];
  }[];
  edges: {
    sourceNodeId: string;
    dependsOnSourceNodeId: string;
    disposition: "task_dependency" | "context_only" | "archived_source";
  }[];
  exclusions: { sourceNodeId: string; reason: "ARCHIVED_SOURCE_NODE" }[];
  issues: PlanIssue[];
  counts: {
    savedNodes: number;
    actionableNodes: number;
    contextNodes: number;
    archivedNodes: number;
    createdProjects: number;
    createdTasks: number;
  };
};
export type PlanFailure = {
  httpStatus: number;
  code: string;
  requestId: string | null;
  message: string;
  outcome: "recorded" | "unconfirmed";
  recordedAttempt: true | null;
  issues: PlanIssue[];
};
