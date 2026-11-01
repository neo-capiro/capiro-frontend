import { draft, revision, version } from "./newsletter-staging-fixtures";
export { draft, revision, version };
export const clientId = "10000000-0000-4000-8000-000000000001";
export const objectiveId = "30000000-0000-4000-8000-000000000001";
export const strategyId = "a0000000-0000-4000-8000-000000000001";
export const taskId = "b0000000-0000-4000-8000-000000000001";
export const binding = {
  clientId,
  objectiveId,
  objectiveVersion: 1,
  objectiveRevisionId: "c0000000-0000-4000-8000-000000000001",
};
export const strategy = {
  id: strategyId,
  clientId,
  title: "Synthetic exact-client strategy",
  type: "regulatory",
  ownerUserId: null,
  goal: "Synthetic strategy goal",
  meriContext: null,
  targetDate: "2026-11-01",
  lastEditedAt: "2026-10-12T12:00:00Z",
  nodes: [],
  artifacts: [],
};
export const strategySummary = {
  ...strategy,
  createdByUserId: "test-user",
  lastEditedByUserId: null,
  createdAt: strategy.lastEditedAt,
  nodeCount: 0,
  summary: {
    assignedCount: 0,
    unassignedCount: 0,
    completedCount: 0,
    reviewCount: 0,
  },
};
export const task = {
  id: taskId,
  clientId,
  name: "Synthetic explicit-client task",
  description: "Synthetic current task details",
  ownerId: "test-user",
  assigneeId: null,
  version: 4,
  archived: false,
  status: "todo",
  priority: "high",
  subtype: "task",
  approval: "pending",
  startOn: null,
  dueOn: "2026-11-01",
  parentId: null,
  dependencies: [],
  collaborators: [],
  tags: [],
  memberships: [],
  customValues: {},
  estimateMinutes: 90,
  actualMinutes: 15,
  recurrence: null,
  meetingId: null,
  completedAt: null,
  createdAt: "2026-10-12T12:00:00Z",
  updatedAt: "2026-10-12T12:00:00Z",
  access: "viewer",
};
export const boundStrategy = {
  destination: { ...binding, kind: "strategy", resourceId: strategyId },
  strategy,
};
export const boundTask = {
  destination: {
    ...binding,
    kind: "planner_task",
    resourceId: taskId,
    destinationVersion: 4,
  },
  task,
};
export const boundWorkspace = {
  // Retain the original producer's canonical saved-snapshot hash from revision.
  ...revision,
  clientId,
  destination: {
    ...binding,
    kind: "workspace_saved_revision",
    resourceId: version.id,
    draftId: draft.id,
  },
};
