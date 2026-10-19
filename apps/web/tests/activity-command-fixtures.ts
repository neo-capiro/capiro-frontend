import type {
  ActivityCommandInput,
  ActivityCommandReceipt,
} from "../src/features/portfolio/client-profile/quick-log/command-contracts";
export const commandActor = {
  userId: "a1000000-0000-4000-8000-000000000001",
  tenantId: "a1000000-0000-4000-8000-000000000002",
};
export const commandClientId = "10000000-0000-4000-8000-000000000001";
export const commandAssignee = {
  id: "a1000000-0000-4000-8000-000000000007",
  email: "assignee@example.test",
  firstName: "Synthetic",
  lastName: "Assignee",
};
export const commandInput: ActivityCommandInput = {
  requestId: "a1000000-0000-4000-8000-000000000008",
  activity: {
    kind: "note",
    title: "Synthetic follow-up activity",
    body: "Private activity text stays in Core",
  },
  followUp: { assigneeUserId: commandAssignee.id },
};
export function commandReceipt(
  input: ActivityCommandInput = commandInput,
): ActivityCommandReceipt {
  return {
    receiptVersion: 1,
    commandId: "a1000000-0000-4000-8000-000000000009",
    requestId: input.requestId,
    version: 2,
    tenantId: commandActor.tenantId,
    clientId: commandClientId,
    actorUserId: commandActor.userId,
    status: "needs_attention",
    reason: "planner_unavailable",
    activity: {
      id: "a1000000-0000-4000-8000-000000000010",
      personId: input.activity.personId ?? null,
      available: true,
    },
    followUp: {
      owner: "planner",
      requestId: "a1000000-0000-4000-8000-000000000009",
      assigneeUserId: input.followUp.assigneeUserId,
      state: "pending",
      taskId: null,
    },
  };
}
